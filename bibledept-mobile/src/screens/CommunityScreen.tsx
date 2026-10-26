import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { ACHIEVEMENTS, CommunityProfile, visibleCommunityStreak } from '../../shared/community';
import { useAuth } from '../services/AuthProvider';
import { useCommunity, useCommunityDirectory } from '../services/CommunityProvider';
import { messageForUser } from '../services/userMessage';
import { getFirebase } from '../services/firebase';
import { typography as t, useTheme } from '../theme';
import { AccountPage } from '../components/account/AccountPage';
import { GlassSurface } from '../components/Glass';
import { Icon } from '../components/Icon';
import { ActionButton, Field, Notice } from '../components/ui';
import { BadgeArt } from '../components/community/BadgeArt';
import { CommunityProfileEditor } from '../components/community/CommunityProfileEditor';
import { ProfileAvatar } from '../components/community/ProfileAvatar';
import { ReadingCircles } from '../components/community/ReadingCircles';
import { ReaderProfileDetails } from '../components/community/ReaderProfileDetails';
import { useScreenScroll } from '../components/ScreenScrollView';

export type CommunitySection='Activity'|'Readers'|'Circles';
export function CommunityScreen({active=true,onAccount,onBadges,requestedSection='Activity',requestRevision=0}:{active?:boolean;onAccount:()=>void;onBadges:()=>void;requestedSection?:CommunitySection;requestRevision?:number}) {
  const {colors:c}=useTheme(),{user}=useAuth(),community=useCommunity(),top=useScreenScroll();
  const [section,setSection]=useState<CommunitySection>('Activity'),[editing,setEditing]=useState(false),[count,setCount]=useState(40),[search,setSearch]=useState('');
  const [reader,setReader]=useState<CommunityProfile|null>(null),[report,setReport]=useState<string|null>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[now,setNow]=useState(Date.now());
  const locked=useRef(false),directory=useCommunityDirectory(active&&section!=='Circles'&&!editing,count);
  useEffect(()=>{setSection(requestedSection);setEditing(false);setReader(null);top();},[requestRevision,requestedSection]);
  useEffect(()=>{if(!active){setReader(null);setReport(null);}},[active]);
  useEffect(()=>{
    if(!reader||!active||!community.settings.joined)return;
    return onSnapshot(doc(getFirebase().db,'bibledeptProfiles',reader.id),snapshot=>setReader(snapshot.exists()?{id:snapshot.id,...snapshot.data()} as CommunityProfile:null),()=>setReader(null));
  },[reader?.id,active,community.settings.joined]);
  useEffect(()=>{if(!active)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[active]);
  async function run(action:string,work:()=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(action);setError('');setMessage('');try{await work();}catch(e){setError(messageForUser(e,'That change couldn’t be saved. Please try again.'));}finally{locked.current=false;setBusy('');}}
  if(!user)return <View><Text accessibilityRole="header" style={{...t.title,color:c.ink}}>Better together.</Text><Text style={{...t.body,color:c.muted,marginVertical:16}}>Celebrate someone’s steady week. Find a circle. Keep showing up for the Word, together.</Text><ClubIntro/><ActionButton title="Sign in to join the community" icon="people" onPress={onAccount}/><Notice text="Community is optional. Reading, notes, and your private prayer journal stay available as before."/></View>;
  if(!community.ready)return <ActivityIndicator color={c.orange}/>;
  if(!community.settings.joined)return <View><Text accessibilityRole="header" style={{...t.title,color:c.ink}}>There’s room for you.</Text><Text style={{...t.body,color:c.muted,marginVertical:16}}>Meet other readers, celebrate their progress, and start a conversation in your own reading circle.</Text><ClubIntro/><CommunityProfileEditor joining/>{!!community.error&&<Notice error text={community.error}/>}</View>;
  if(editing)return <AccountPage title="Community profile" onBack={()=>setEditing(false)} backLabel="Back to community"><CommunityProfileEditor onSaved={()=>setEditing(false)}/></AccountPage>;
  const selected=reader;
  return <View>
    <View style={{flexDirection:'row',gap:14,alignItems:'center',marginBottom:24}}><ProfileAvatar name={community.settings.displayName} photoData={community.settings.photoData} size={62} club={community.earned.some(a=>a.id==='six-percent-club')}/><View style={{flex:1,minWidth:0}}><Text style={{...t.meta,color:c.muted}}>READ. UNDERSTAND. GROW TOGETHER.</Text><Text accessibilityRole="header" style={{...t.title,color:c.ink,marginTop:6}}>Community<Text style={{color:c.orange}}>.</Text></Text></View></View>
    <Text style={{...t.body,color:c.muted,marginBottom:16}}>Every step is worth celebrating. There’s a reader alongside you.</Text>
    <View style={{flexDirection:'row',gap:10,marginBottom:20}}><View style={{flex:1}}><ActionButton title="My badges" icon="award" secondary onPress={onBadges}/></View><View style={{flex:1}}><ActionButton title="My profile" icon="user" secondary onPress={()=>setEditing(true)}/></View></View>
    <View accessibilityRole="tablist" style={{flexDirection:'row',gap:8,marginBottom:24}}>{(['Activity','Readers','Circles'] as const).map(value=><Pressable key={value} accessibilityRole="tab" aria-selected={section===value} accessibilityState={{selected:section===value}} onPress={()=>{setSection(value);setError('');setMessage('');top();}} style={{flex:1,paddingVertical:13,paddingHorizontal:8,minHeight:46,borderRadius:24,alignItems:'center',backgroundColor:section===value?c.orange:c.surface}}><Text style={{...t.label,color:section===value?c.onOrange:c.ink}}>{value}</Text></Pressable>)}</View>
    {!!community.error&&<Notice error text={community.error}/>}
    {!!error&&<Notice error text={error}/>}
    {!!message&&<Notice success text={message}/>}
    {section==='Circles'?<ReadingCircles active={active}/>:<>
      {!!directory.error&&<Notice error text={directory.error}/>}
      {directory.loading&&<ActivityIndicator color={c.orange}/>}
      {section==='Readers'?<>
        <Text accessibilityRole="header" style={{...t.section,color:c.ink,marginBottom:12}}>People on the journey</Text><Field label="Find a reader in this list" value={search} onChangeText={setSearch} placeholder="Search by display name" autoCorrect={false}/>
        {directory.profiles.filter(profile=>profile.displayName.toLowerCase().includes(search.trim().toLowerCase())).map(profile=><Pressable key={profile.id} accessibilityRole="button" accessibilityLabel={`View ${profile.displayName}’s profile`} onPress={()=>setReader(profile)} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:14,paddingVertical:20,borderBottomWidth:1,borderColor:c.border,opacity:pressed?.65:1})}>
          <ProfileAvatar name={profile.displayName} photoData={profile.photoData} size={54} club={profile.badgeIds.includes('six-percent-club')}/><View style={{flex:1,minWidth:0}}><Text style={{...t.label,color:c.ink}}>{profile.displayName}{profile.id===user.uid?' (you)':''}</Text><Text style={{...t.meta,color:c.muted,marginTop:5}}>{profile.badgeIds.includes('six-percent-club')?'6% Club member':`${profile.badgeIds.length} ${profile.badgeIds.length===1?'badge':'badges'} shared`}</Text></View><StreakPill profile={profile} now={now}/>
        </Pressable>)}
        {!directory.loading&&!directory.profiles.some(profile=>profile.displayName.toLowerCase().includes(search.trim().toLowerCase()))&&<Notice text="No readers match that name in this list."/>}
      </>:<>
        <Text accessibilityRole="header" style={{...t.section,color:c.ink,marginBottom:16}}>A little encouragement goes a long way.</Text>
        {!directory.loading&&!directory.events.length&&<GlassSurface style={{padding:24,borderRadius:20}}><Icon name="people" color={c.orange} size={30}/><Text style={{...t.section,color:c.ink,marginTop:16}}>The journey starts with us.</Text><Text style={{...t.body,color:c.muted,marginTop:10}}>As readers join and earn badges, their milestones will appear here. Invite a friend into a reading circle to begin together.</Text><ActionButton title="Open reading circles" secondary onPress={()=>setSection('Circles')}/></GlassSurface>}
        {directory.events.map(event=>{
          const author=directory.profileMap.get(event.uid);if(!author)return null;
          const badge=ACHIEVEMENTS.find(a=>a.id===event.badgeId),cheered=directory.cheeredIds.includes(event.id),own=event.uid===user.uid;
          return <GlassSurface key={event.id} style={{padding:20,borderRadius:22,marginBottom:16}}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${author.displayName}’s profile`} onPress={()=>setReader(author)} style={{flexDirection:'row',alignItems:'center',gap:12}}><ProfileAvatar name={author.displayName} photoData={author.photoData} size={46} club={author.badgeIds.includes('six-percent-club')}/><View style={{flex:1,minWidth:0}}><Text style={{...t.label,color:c.ink}}>{author.displayName}{own?' (you)':''}</Text><Text style={{...t.meta,color:c.muted,fontSize:12,marginTop:3}}>{event.createdAt?new Date(event.createdAt.toMillis()).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Just now'}</Text></View><StreakPill profile={author} now={now}/></Pressable>
            <View style={{flexDirection:'row',alignItems:'center',gap:16,marginVertical:22}}>{badge?<BadgeArt symbol={badge.symbol} size={68}/>:<View style={{width:58,height:58,borderRadius:29,backgroundColor:c.tint,alignItems:'center',justifyContent:'center'}}><Icon name="people" size={28} color={c.orange}/></View>}<View style={{flex:1}}><Text style={{...t.meta,color:c.muted}}>{badge?'A MILESTONE WORTH CELEBRATING':'A NEW READER ON THE JOURNEY'}</Text><Text style={{...t.section,color:c.ink,marginTop:6}}>{badge?badge.name:'Welcome to the community.'}</Text><Text style={{...t.meta,color:c.muted,marginTop:8}}>{badge?badge.description:'Read a little. Ask a question. Grow together.'}</Text></View></View>
            <View style={{borderTopWidth:1,borderColor:c.border,paddingTop:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${cheered?'Encouraged':'Encourage'} ${author.displayName}. ${event.cheerCount} encouragements`} accessibilityState={{disabled:own||cheered||!!busy||!directory.encouragementReady}} disabled={own||cheered||!!busy||!directory.encouragementReady} onPress={()=>void run(event.id,async()=>{await community.perform('encourageCommunityMilestone',{activityId:event.id});setMessage('A little encouragement, sent.');})} style={{flexDirection:'row',gap:8,minHeight:44,alignItems:'center'}}><Icon name="heart" size={19} color={cheered?c.orange:c.muted}/><Text style={{...t.meta,color:cheered?c.ink:c.muted}}>{own?`${event.cheerCount} encouraged you`:cheered?`Encouraged · ${event.cheerCount}`:`Encourage${event.cheerCount?` · ${event.cheerCount}`:''}`}</Text></Pressable>
              {!own&&<Pressable accessibilityRole="button" accessibilityLabel="Report community activity" onPress={()=>{setReport(event.id);setReason('');}} style={{minHeight:44,justifyContent:'center',paddingHorizontal:10}}><Text style={{...t.meta,color:c.muted,fontSize:12}}>Report</Text></Pressable>}
            </View>
          </GlassSurface>;
        })}
      </>}
      {count<200&&(directory.profiles.length>=count||directory.events.length>=count)&&<ActionButton title="Load more community activity" secondary onPress={()=>setCount(value=>Math.min(200,value+40))}/>}
    </>}
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={()=>setReader(null)}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,.75)'}}><ScrollView style={{maxHeight:'90%',width:'100%',maxWidth:480,alignSelf:'center'}} contentContainerStyle={{padding:28,backgroundColor:c.surface,borderRadius:24}}>{selected&&<>
      <ReaderProfileDetails profile={selected} now={now}/>
      {selected.id!==user.uid&&<ActionButton title="Hide this reader" secondary disabled={!!busy} loading={busy==='hide'} onPress={()=>void run('hide',async()=>{await community.perform('hideCommunityReader',{uid:selected.id});setReader(null);setMessage('This reader’s activity and messages are hidden for you.');})}/>}
      <ActionButton title="Close reader profile" secondary onPress={()=>setReader(null)}/>
    </>}</ScrollView></View></Modal>
    <Modal visible={!!report} transparent animationType="fade" onRequestClose={()=>setReport(null)}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,.75)'}}><View style={{padding:24,borderRadius:22,backgroundColor:c.surface,width:'100%',maxWidth:480,alignSelf:'center'}}><Text accessibilityRole="header" style={{...t.section,color:c.ink,marginBottom:18}}>Report activity</Text><Field label="What should we know?" value={reason} onChangeText={setReason} multiline maxLength={500}/><ActionButton title="Submit activity report" loading={busy==='report'} disabled={!!busy||!reason.trim()} onPress={()=>void run('report',async()=>{await community.perform('reportReadingCommunityContent',{activityId:report,reason});setReport(null);setMessage('Report received for review. You can also hide this reader from their profile.');})}/>{!!error&&<Notice error text={error}/>}<ActionButton title="Cancel report" secondary disabled={!!busy} onPress={()=>setReport(null)}/></View></View></Modal>
  </View>;
}
function StreakPill({profile,now}:{profile:CommunityProfile;now:number}) {
  const {colors:c}=useTheme(),streak=visibleCommunityStreak(profile,now);
  if(streak===null)return null;
  return <View accessible accessibilityLabel={`${streak}-day reading streak`} style={{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:7,paddingHorizontal:9,borderRadius:20,backgroundColor:c.tint}}><Icon name="flame" color={c.orange} size={16}/><Text style={{...t.label,color:c.ink,fontSize:13}}>{streak}d</Text></View>;
}
function ClubIntro(){const {colors:c}=useTheme();return <View style={{flexDirection:'row',gap:18,alignItems:'center',paddingVertical:24,marginBottom:16,borderTopWidth:1,borderBottomWidth:1,borderColor:c.border}}><BadgeArt size={84}/><View style={{flex:1}}><Text style={{...t.section,color:c.ink}}>A journey worth finishing.</Text><Text style={{...t.meta,color:c.muted,marginTop:8}}>Complete all 365 days to earn the 6% Club emblem. Discover every badge in your profile.</Text></View></View>;}
