import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { cleanCircleName } from '../../../shared/community';
import { useAuth } from '../../services/AuthProvider';
import { useCommunity } from '../../services/CommunityProvider';
import { circleCreationKey, clearCircleCreation, decodeCircleCreation, deliverCircleCreation, PendingCircleCreation } from '../../services/circleCreation';
import { readDurableValue, writeDurableValue } from '../../services/durableStorage';
import { messageForUser } from '../../services/userMessage';
import { typography as t, useTheme } from '../../theme';
import { AccountLink } from '../account/AccountPage';
import { ActionButton, Field, Notice } from '../ui';
import { CircleConversation } from './CircleConversation';

export function ReadingCircles({active}:{active:boolean}) {
  const {colors:c}=useTheme(),community=useCommunity(),{user}=useAuth();
  const [selected,setSelected]=useState<string|null>(null),[mode,setMode]=useState<'list'|'create'|'join'>('list');
  const [name,setName]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [creation,setCreation]=useState<PendingCircleCreation|null>(null),[creationReady,setCreationReady]=useState(false),[loadError,setLoadError]=useState(false),[loadRevision,setLoadRevision]=useState(0);
  const locked=useRef(false),wantsResult=useRef(false),activeNow=useRef(active),knownCircles=useRef(community.circles);
  activeNow.current=active;knownCircles.current=community.circles;
  const storageKey=user?circleCreationKey(user.uid):'';
  useEffect(()=>{
    if(!storageKey)return;
    let live=true;setCreationReady(false);setLoadError(false);
    void readDurableValue(AsyncStorage,storageKey).then(raw=>{if(live){setCreation(decodeCircleCreation(raw));setCreationReady(true);}}).catch(()=>{if(live)setLoadError(true);});
    return()=>{live=false;};
  },[storageKey,loadRevision]);
  async function startDifferent() {
    if(locked.current)return;locked.current=true;setBusy(true);setError('');
    try{await writeDurableValue(AsyncStorage,storageKey,null);setCreation(null);setName('');setMode('create');}
    catch{setError('The saved circle request couldn’t be cleared. Please try again.');}
    finally{locked.current=false;setBusy(false);}
  }
  function openCircle(id:string) {
    wantsResult.current=false;setSelected(id);
    if(creation?.id===id&&!locked.current) {
      locked.current=true;setBusy(true);
      void clearCircleCreation(AsyncStorage,storageKey,creation).then(()=>setCreation(previous=>previous?.id===id?null:previous)).catch(()=>{}).finally(()=>{locked.current=false;setBusy(false);});
    }
  }
  async function enter(action:'create'|'join') {
    if(locked.current||(action==='create'&&!creationReady))return;
    let request:PendingCircleCreation|null=null;
    if(action==='create') {
      try{request=creation||{id:randomUUID(),name:cleanCircleName(name)};}
      catch{setError('Give your circle a name with 1–60 characters.');return;}
    }
    locked.current=true;wantsResult.current=true;setBusy(true);setError('');
    try {
      let result:{id:string};
      if(request) {
        setCreation(request);
        result=await deliverCircleCreation(AsyncStorage,storageKey,request,pending=>community.perform<{id:string}>('createReadingCircle',{requestId:pending.id,name:pending.name}));
        setCreation(null);
      }else result=await community.perform<{id:string}>('joinReadingCircle',{code});
      setName('');setCode('');
      if(wantsResult.current){setMode('list');if(activeNow.current)setSelected(result.id);}
    }catch(e){
      // A server-owned membership is also proof of a completed creation.
      if(request&&knownCircles.current.some(circle=>circle.id===request!.id)) {
        await clearCircleCreation(AsyncStorage,storageKey,request).then(()=>setCreation(null)).catch(()=>{});
        if(wantsResult.current){setMode('list');if(activeNow.current)setSelected(request.id);}
      }else setError(messageForUser(e,'Your circle couldn’t be opened. Please try again.'));
    }
    finally{locked.current=false;setBusy(false);}
  }
  return <View>
    <Text accessibilityRole="header" style={{...t.section,color:c.ink}}>Your reading circles</Text>
    <Text style={{...t.body,color:c.muted,marginTop:10,marginBottom:20}}>A smaller place to read, ask questions, and keep going together.</Text>
    {community.circles.map(circle=><AccountLink key={circle.id} icon="chat" title={circle.name} unread={circle.unread} detail={circle.unread?'New messages in your circle':circle.lastMessageAt?`Last active ${new Date(circle.lastMessageAt.toMillis()).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:'Start a conversation with your circle'} onPress={()=>openCircle(circle.id)}/>)}
    {!community.circles.length&&<Notice text="Your circle starts here. Create one for friends or join with an invitation code."/>}
    {mode==='list'?<>
      {!!creation&&<Notice text={`Your saved request for “${creation.name}” is ready to retry. It will open the same circle if creation already finished.`}/>}
      {busy&&<Notice text="Your request is still finishing. You can open another circle while you wait."/>}
      <ActionButton title={creation?'Continue circle creation':'Create a reading circle'} icon="plus" disabled={busy||!creationReady} onPress={()=>{setMode('create');setError('');}}/>
      <ActionButton title="Join with an invitation code" secondary icon="people" disabled={busy} onPress={()=>{setMode('join');setError('');}}/>
    </>:<View style={{padding:20,borderRadius:20,backgroundColor:c.surface,marginTop:16}}>
      {mode==='create'?<><Field label="Circle name" value={creation?.name||name} onChangeText={setName} placeholder="Sunday readers" maxLength={60} editable={creationReady&&!busy&&!creation}/>{!!creation&&<Notice text="We’ve kept the original request. Retrying opens the same circle if it already exists."/>}<ActionButton title={creation?'Retry circle creation':'Create circle'} loading={busy} disabled={busy||!creationReady||!(creation?.name||name).trim()} onPress={()=>void enter('create')}/>{!!creation&&<ActionButton title="Start a different circle" secondary disabled={busy} onPress={()=>void startDifferent()}/>}</>:<><Field label="Invitation code" value={code} onChangeText={setCode} placeholder="ABCD-EF12-3456" autoCapitalize="characters" autoCorrect={false} maxLength={20} editable={!busy}/><ActionButton title="Join circle" loading={busy} disabled={busy||!code.trim()} onPress={()=>void enter('join')}/></>}
      <ActionButton title="Back to your circles" variant="ghost" onPress={()=>{wantsResult.current=false;setMode('list');}}/>
    </View>}
    {loadError&&<><Notice error text="Your saved circle request couldn’t load. Retry before creating another circle."/><ActionButton title="Retry saved circle request" secondary onPress={()=>setLoadRevision(value=>value+1)}/></>}
    {!!error&&<Notice error text={error}/>}
    <Notice text="Circles support up to 50 members. Their messages are only visible to members who have joined the community."/>
    {selected&&<CircleConversation key={selected} circleId={selected} active={active} onClose={()=>setSelected(current=>current===selected?null:current)}/>}
  </View>;
}
