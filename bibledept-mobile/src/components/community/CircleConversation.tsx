import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CircleMessage } from '../../../shared/community';
import { useAuth } from '../../services/AuthProvider';
import { useCircleMessages, useCommunity, useCommunityProfiles } from '../../services/CommunityProvider';
import { CircleDraft, circleDraftKey, decodeCircleDraft, deliverCircleMessage, PendingCircleMessage } from '../../services/circleDrafts';
import { messageForUser } from '../../services/userMessage';
import { getFirebase } from '../../services/firebase';
import { USER_COLLECTION } from '../../services/dataPaths';
import { Colors, typography as t, useThemedStyles } from '../../theme';
import { Icon } from '../Icon';
import { useReducedMotion } from '../LiquidBottomNav';
import { ActionButton, Field, IconButton, Notice } from '../ui';
import { ProfileAvatar } from './ProfileAvatar';
import { ReaderProfileDetails } from './ReaderProfileDetails';

export function CircleConversation({circleId,active,onClose}:{circleId:string;active:boolean;onClose:()=>void}) {
  const {c,s}=useThemedStyles(styles),{user}=useAuth(),community=useCommunity(),reduced=useReducedMotion();
  const [count,setCount]=useState(50),[details,setDetails]=useState(false),[memberId,setMemberId]=useState<string|null>(null);
  const [selectedMessage,setSelectedMessage]=useState<CircleMessage|null>(null),[menu,setMenu]=useState<'options'|'report'|'delete'>('options'),[reason,setReason]=useState(''),[confirmLeave,setConfirmLeave]=useState(false);
  const [text,setText]=useState(''),[pending,setPending]=useState<PendingCircleMessage|null>(null),[draftReady,setDraftReady]=useState(false),[draftError,setDraftError]=useState(false),[loadAttempt,setLoadAttempt]=useState(0);
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[atBottom,setAtBottom]=useState(true);
  const [foreground,setForeground]=useState(AppState.currentState===null||AppState.currentState==='active');
  const acknowledged=useRef('');
  const locked=useRef(false),nearBottom=useRef(true),list=useRef<FlatList<CircleMessage>>(null),input=useRef<TextInput>(null),liveActive=useRef(active),loaded=useRef(false),latestDraft=useRef<CircleDraft>({text:'',pending:null});
  liveActive.current=active;
  latestDraft.current={text,pending};
  const draftKey=user?circleDraftKey(user.uid,circleId):'';
  const chat=useCircleMessages(circleId,active,count),readers=useCommunityProfiles(chat.circle?.memberIds||[],active);
  const messages=useMemo(()=>[...chat.messages].reverse(),[chat.messages]),latestId=messages[0]?.id;
  const selectedMember=memberId?readers.get(memberId):undefined;

  useEffect(()=>{const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>listener.remove();},[]);
  useEffect(()=>{
    if(!active||!foreground||!atBottom||details||selectedMessage||chat.loading||!user||!latestId||chat.circle?.lastMessageId!==latestId)return;
    const key=`${circleId}:${latestId}`;
    if(acknowledged.current===key)return;
    acknowledged.current=key;
    void setDoc(doc(getFirebase().db,USER_COLLECTION,user.uid,'circleReads',circleId),{lastReadMessageId:latestId,updatedAt:serverTimestamp()}).catch(()=>{if(acknowledged.current===key)acknowledged.current='';});
  },[active,foreground,atBottom,details,selectedMessage,chat.loading,user?.uid,latestId,chat.circle?.lastMessageId,circleId]);

  function saveDraft() {
    if(!draftKey||!loaded.current)return Promise.resolve();
    const value=latestDraft.current;
    return value.text||value.pending?AsyncStorage.setItem(draftKey,JSON.stringify(value)):AsyncStorage.removeItem(draftKey);
  }
  useEffect(()=>{
    if(!draftKey)return;
    let live=true;loaded.current=false;setDraftReady(false);setDraftError(false);
    void AsyncStorage.getItem(draftKey).then(raw=>{
      if(!live)return;
      const value=decodeCircleDraft(raw);setText(value.text);setPending(value.pending);loaded.current=true;setDraftReady(true);
    }).catch(()=>{if(live)setDraftError(true);});
    return()=>{live=false;void saveDraft().catch(()=>{});};
  },[draftKey,loadAttempt]);
  useEffect(()=>{
    if(!draftReady)return;
    const timer=setTimeout(()=>void saveDraft().catch(()=>setError('Your draft couldn’t be saved on this device.')),350);
    return()=>clearTimeout(timer);
  },[text,pending,draftReady]);
  useEffect(()=>{
    if(active&&nearBottom.current){const frame=requestAnimationFrame(()=>list.current?.scrollToOffset({offset:0,animated:!reduced}));return()=>cancelAnimationFrame(frame);}
  },[latestId,active,reduced]);

  async function run(action:string,work:()=>Promise<void>) {
    if(locked.current)return;locked.current=true;setBusy(action);setError('');setNotice('');
    try{await work();}catch(e){setError(messageForUser(e,'That change couldn’t be saved. Please try again.'));}
    finally{locked.current=false;setBusy('');}
  }
  function close() {if(locked.current)return;void saveDraft().catch(()=>{});Keyboard.dismiss();onClose();}
  function back() {
    if(selectedMessage){setSelectedMessage(null);return;}
    if(memberId){setMemberId(null);return;}
    if(details){setDetails(false);setConfirmLeave(false);return;}
    close();
  }
  async function send() {
    const value=pending||{id:randomUUID(),text:text.trim()};
    if(!value.text||!chat.circle||!draftReady)return;
    setPending(value);
    await deliverCircleMessage(AsyncStorage,draftKey,value,draft=>community.perform('sendReadingCircleMessage',{circleId,messageId:draft.id,text:draft.text}));
    setText('');setPending(null);setNotice('Message sent.');nearBottom.current=true;setAtBottom(true);
    requestAnimationFrame(()=>{list.current?.scrollToOffset({offset:0,animated:!reduced});if(liveActive.current)input.current?.focus();});
  }
  function openMessage(message:CircleMessage){Keyboard.dismiss();setError('');setNotice('');setMenu('options');setSelectedMessage(message);}

  return <Modal visible={active} animationType={reduced?'none':'slide'} onRequestClose={back}>
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.screen} pointerEvents={selectedMessage?'none':'auto'} aria-hidden={!!selectedMessage} accessibilityElementsHidden={!!selectedMessage} importantForAccessibility={selectedMessage?'no-hide-descendants':'auto'} {...(Platform.OS==='web'?{inert:!!selectedMessage}:{})}>
          <View style={s.header}>
            <IconButton name="chevronLeft" label={memberId?'Back to circle members':details?'Back to conversation':'Back to your circles'} onPress={back} disabled={!!busy}/>
            <View style={s.headerCopy}><Text accessibilityRole="header" numberOfLines={1} style={s.title}>{memberId?'Reader profile':details?'Circle details':chat.circle?.name||community.circles.find(circle=>circle.id===circleId)?.name||'Reading circle'}</Text><Text style={s.subtitle}>{chat.circle?`${chat.circle.memberCount} ${chat.circle.memberCount===1?'reader':'readers'} · Member-only conversation`:'Opening your circle…'}</Text></View>
            {!details&&!memberId&&<IconButton name="more" label="Circle details and members" onPress={()=>{Keyboard.dismiss();setDetails(true);setError('');setNotice('');}}/>}
          </View>

          {memberId?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.detailContent}>
            {selectedMember?<><ReaderProfileDetails profile={selectedMember}/>{memberId!==user?.uid&&<ActionButton title="Hide this reader" secondary loading={busy==='hide-member'} disabled={!!busy} onPress={()=>void run('hide-member',async()=>{await community.perform('hideCommunityReader',{uid:memberId});setMemberId(null);setNotice('This reader’s activity and messages are hidden for you.');})}/>}</>:<Notice text="This reader isn’t sharing a profile right now."/>}
            <ActionButton title="Back to circle members" secondary onPress={()=>setMemberId(null)}/>
          </ScrollView>:details?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.detailContent}>
            <Text accessibilityRole="header" style={s.section}>{chat.circle?.name}</Text>
            <Text style={s.body}>Read a little. Ask a question. Keep going together.</Text>
            {chat.circle&&<View style={s.invitation}>
              <Text style={s.label}>Invite someone into your circle</Text><Text selectable accessibilityLabel="Circle invitation code" style={s.code}>{chat.circle.code.match(/.{1,4}/g)?.join('-')}</Text>
              <ActionButton title="Copy invitation code" secondary icon="copy" onPress={()=>void run('copy',async()=>{await Clipboard.setStringAsync(chat.circle!.code.match(/.{1,4}/g)!.join('-'));setNotice('Invitation code copied.');})}/>
              <Notice text="Anyone with this code can join, up to 50 readers. Share it with people you’d like to read with."/>
            </View>}
            <Text accessibilityRole="header" style={s.section}>Circle members</Text>
            {[...readers.values()].filter(reader=>!community.settings.blockedUids.includes(reader.id)).map(reader=><Pressable key={reader.id} accessibilityRole="button" accessibilityLabel={`View ${reader.displayName}’s profile`} onPress={()=>setMemberId(reader.id)} style={s.member}><ProfileAvatar name={reader.displayName} photoData={reader.photoData} size={48} club={reader.badgeIds.includes('six-percent-club')}/><View style={{flex:1}}><Text style={s.label}>{reader.displayName}{reader.id===user?.uid?' (you)':''}</Text>{reader.badgeIds.includes('six-percent-club')&&<Text style={s.subtitle}>6% Club member</Text>}</View><Icon name="chevronRight" size={18} color={c.muted}/></Pressable>)}
            <Notice text="Only shared profiles appear here. Hiding a reader affects what you see; it doesn’t remove them from the circle."/>
            {confirmLeave?<View style={s.invitation}><Text style={s.label}>Leave this circle?</Text><Notice text="You’ll need an invitation code to return. Existing messages remain for other members."/><ActionButton title="Confirm leave circle" secondary loading={busy==='leave'} disabled={!!busy} onPress={()=>void run('leave',async()=>{await community.perform('leaveReadingCircle',{circleId});onClose();})}/><ActionButton title="Stay in circle" variant="ghost" disabled={!!busy} onPress={()=>setConfirmLeave(false)}/></View>:<ActionButton title="Leave circle" variant="ghost" onPress={()=>setConfirmLeave(true)}/>}
          </ScrollView>:<>
            {!!chat.error&&<View style={s.banner}><Notice error text={chat.error}/></View>}
            {chat.loading&&<ActivityIndicator color={c.orange} style={{padding:12}}/>}
            <FlatList
              ref={list} data={messages} inverted keyExtractor={message=>message.id} style={{flex:1}}
              contentContainerStyle={s.messageList} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
              initialNumToRender={16} maxToRenderPerBatch={12} windowSize={7} scrollEventThrottle={64}
              accessibilityLabel="Circle messages" maintainVisibleContentPosition={{minIndexForVisible:0}}
              onScroll={event=>{const bottom=event.nativeEvent.contentOffset.y<80;nearBottom.current=bottom;setAtBottom(value=>value===bottom?value:bottom);}}
              ListEmptyComponent={!chat.loading?<View style={s.empty}><Icon name="chat" size={36} color={c.orange}/><Text style={s.section}>Start with a hello.</Text><Text style={s.body}>Share a thought from today’s reading or ask your circle a question.</Text></View>:null}
              ListFooterComponent={messages.length>=count?<View style={{paddingVertical:12}}>{count<200?<ActionButton title="Load earlier messages" secondary onPress={()=>setCount(value=>Math.min(value+50,200))}/>:<Text style={s.subtitle}>Showing the most recent 200 messages.</Text>}</View>:null}
              renderItem={({item:message})=>{
                const own=message.uid===user?.uid,reader=readers.get(message.uid),name=own?'You':reader?.displayName||'Reader';
                return <View style={[s.message,own?s.own:s.peer]}>
                  <View style={s.messageTop}><ProfileAvatar name={reader?.displayName||'Reader'} photoData={reader?.photoData} size={30} club={reader?.badgeIds.includes('six-percent-club')}/><View style={{flex:1,minWidth:0}}><Text style={s.sender}>{name}</Text><Text style={s.time}>{message.createdAt?new Date(message.createdAt.toMillis()).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Just now'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Message options for ${name}`} onPress={()=>openMessage(message)} style={s.messageOptions}><Icon name="more" size={20} color={c.muted}/></Pressable></View>
                  <Text selectable style={s.messageText}>{message.text}</Text>
                </View>;
              }}
            />
            {!atBottom&&<View style={s.latest}><ActionButton title="Latest messages" secondary icon="chevronDown" onPress={()=>{nearBottom.current=true;setAtBottom(true);list.current?.scrollToOffset({offset:0,animated:!reduced});}}/></View>}
            <View style={s.composer}>
              {draftError?<><Notice error text="Your saved message draft couldn’t load. Retry before sending."/><ActionButton title="Retry saved draft" secondary onPress={()=>setLoadAttempt(value=>value+1)}/></>:<View style={s.composeRow}>
                <TextInput ref={input} accessibilityLabel="Message your circle" placeholder="Message your circle…" placeholderTextColor={c.muted} value={pending?.text||text} onChangeText={value=>{setText(value);setNotice('');}} multiline maxLength={2000} editable={draftReady&&!busy&&!pending&&!!chat.circle} style={s.input}/>
                <Pressable accessibilityRole="button" accessibilityLabel={pending?'Retry message':'Send message'} accessibilityState={{disabled:!!busy||!draftReady||!chat.circle||!(pending?.text||text).trim(),busy:busy==='send'}} disabled={!!busy||!draftReady||!chat.circle||!(pending?.text||text).trim()} onPress={()=>void run('send',send)} style={[s.send,(!draftReady||!chat.circle||!(pending?.text||text).trim())&&{opacity:.45}]}>{busy==='send'?<ActivityIndicator color={c.onOrange}/>:<Icon name="send" color={c.onOrange} size={22}/>}</Pressable>
              </View>}
              {(pending?.text||text).length>1600&&<Text style={s.time}>{(pending?.text||text).length} / 2,000</Text>}
              {pending&&!busy&&<><Notice text="This message may already have arrived. Retry keeps the same ID and won’t post it twice."/><ActionButton title="Keep text as a new draft" variant="ghost" onPress={()=>{setText(pending.text);setPending(null);}}/></>}
              {!!error&&<Notice error text={error}/>}
              {!!notice&&<Notice success text={notice}/>}
            </View>
          </>}
          {(details||memberId)&&<View style={s.banner}>
            {!!error&&<Notice error text={error}/>}
            {!!notice&&<Notice success text={notice}/>}
          </View>}
        </View>

        {selectedMessage&&<View style={s.overlay}>
          <ScrollView keyboardShouldPersistTaps="handled" style={s.sheetScroll} contentContainerStyle={s.sheet} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={s.section}>{menu==='report'?'Report message':menu==='delete'?'Delete this message?':'Message options'}</Text>
            <Text numberOfLines={4} style={s.quoted}>{selectedMessage.text}</Text>
            {menu==='report'?<><Notice text="App staff will receive this message and your explanation."/><Field label="Why are you reporting this message?" value={reason} onChangeText={setReason} maxLength={500} multiline autoFocus/><ActionButton title="Submit report" disabled={!!busy||!reason.trim()} loading={busy==='report'} onPress={()=>void run('report',async()=>{await community.perform('reportReadingCommunityContent',{circleId,messageId:selectedMessage.id,reason});setSelectedMessage(null);setNotice('Report saved for review. You can also hide this reader.');})}/></>:menu==='delete'?<><Notice text="This removes the message for everyone in this circle."/><ActionButton title="Confirm delete message" secondary disabled={!!busy} loading={busy==='delete'} onPress={()=>void run('delete',async()=>{await community.perform('deleteReadingCircleMessage',{circleId,messageId:selectedMessage.id});setSelectedMessage(null);setNotice('Message deleted.');})}/></>:selectedMessage.uid===user?.uid?<ActionButton title="Delete your message" secondary onPress={()=>setMenu('delete')}/>:<><ActionButton title="Report this message" secondary onPress={()=>{setReason('');setMenu('report');}}/><ActionButton title="Hide this reader" secondary disabled={!!busy} loading={busy==='hide'} onPress={()=>void run('hide',async()=>{await community.perform('hideCommunityReader',{uid:selectedMessage.uid});setSelectedMessage(null);setNotice('This reader’s activity and messages are hidden for you.');})}/></>}
            {!!error&&<Notice error text={error}/>}<ActionButton title="Close message options" variant="ghost" disabled={!!busy} onPress={()=>setSelectedMessage(null)}/>
          </ScrollView>
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles=(c:Colors)=>StyleSheet.create({
  screen:{flex:1,backgroundColor:c.background},header:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:12,borderBottomWidth:1,borderColor:c.border},headerCopy:{flex:1,minWidth:0},title:{...t.label,fontSize:18,color:c.ink},subtitle:{...t.meta,color:c.muted,marginTop:4},
  section:{...t.section,color:c.ink},label:{...t.label,color:c.ink},body:{...t.body,color:c.muted,marginVertical:12},detailContent:{padding:24,paddingBottom:40},invitation:{padding:18,borderRadius:20,backgroundColor:c.surface,marginVertical:24},code:{...t.section,color:c.ink,letterSpacing:2,marginVertical:14},member:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:18,borderBottomWidth:1,borderColor:c.border},
  messageList:{paddingHorizontal:16,paddingVertical:16},message:{maxWidth:'92%',padding:14,borderRadius:18,marginBottom:12,minWidth:180},own:{alignSelf:'flex-end',backgroundColor:c.tint},peer:{alignSelf:'flex-start',backgroundColor:c.surface},messageTop:{flexDirection:'row',alignItems:'center',gap:9,marginBottom:10},sender:{...t.label,color:c.ink,fontSize:13},time:{...t.meta,color:c.muted,fontSize:11,lineHeight:16},messageText:{...t.body,color:c.ink},messageOptions:{width:36,minHeight:44,alignItems:'center',justifyContent:'center',marginRight:-8,marginVertical:-8},
  empty:{alignItems:'center',paddingVertical:48,gap:12,transform:[{scaleY:-1}]},composer:{paddingHorizontal:16,paddingVertical:12,borderTopWidth:1,borderColor:c.border,backgroundColor:c.background},composeRow:{flexDirection:'row',alignItems:'flex-end',gap:10},input:{flex:1,minHeight:48,maxHeight:112,paddingHorizontal:16,paddingVertical:12,borderRadius:22,backgroundColor:c.surface,borderWidth:1,borderColor:c.controlBorder,color:c.ink,fontSize:16,lineHeight:24},send:{width:48,height:48,borderRadius:24,backgroundColor:c.orange,alignItems:'center',justifyContent:'center'},banner:{paddingHorizontal:20},latest:{paddingHorizontal:20,paddingBottom:10},
  overlay:{position:'absolute',inset:0,backgroundColor:'rgba(0,0,0,.72)',justifyContent:'flex-end',padding:16},sheetScroll:{maxHeight:'85%',flexGrow:0},sheet:{padding:24,borderRadius:24,backgroundColor:c.surface},quoted:{...t.body,color:c.muted,marginVertical:16},
});
