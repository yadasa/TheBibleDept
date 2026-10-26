import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useCommunity } from '../../services/CommunityProvider';
import { messageForUser } from '../../services/userMessage';
import { typography as t, useTheme } from '../../theme';
import { AccountLink } from '../account/AccountPage';
import { ActionButton, Field, Notice } from '../ui';
import { CircleConversation } from './CircleConversation';

export function ReadingCircles({active}:{active:boolean}) {
  const {colors:c}=useTheme(),community=useCommunity();
  const [selected,setSelected]=useState<string|null>(null),[mode,setMode]=useState<'list'|'create'|'join'>('list');
  const [name,setName]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const locked=useRef(false);
  async function enter(action:'create'|'join') {
    if(locked.current)return;locked.current=true;setBusy(true);setError('');
    try {
      const result=await community.perform<{id:string}>(action==='create'?'createReadingCircle':'joinReadingCircle',action==='create'?{name}:{code});
      setName('');setCode('');setMode('list');setSelected(result.id);
    }catch(e){setError(messageForUser(e,'Your circle couldn’t be opened. Please try again.'));}
    finally{locked.current=false;setBusy(false);}
  }
  return <View>
    <Text accessibilityRole="header" style={{...t.section,color:c.ink}}>Your reading circles</Text>
    <Text style={{...t.body,color:c.muted,marginTop:10,marginBottom:20}}>A smaller place to read, ask questions, and keep going together.</Text>
    {community.circles.map(circle=><AccountLink key={circle.id} icon="chat" title={circle.name} unread={circle.unread} detail={circle.unread?'New messages in your circle':circle.lastMessageAt?`Last active ${new Date(circle.lastMessageAt.toMillis()).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:'Start a conversation with your circle'} onPress={()=>setSelected(circle.id)}/>)}
    {!community.circles.length&&<Notice text="Your circle starts here. Create one for friends or join with an invitation code."/>}
    {mode==='list'?<>
      <ActionButton title="Create a reading circle" icon="plus" onPress={()=>{setMode('create');setError('');}}/>
      <ActionButton title="Join with an invitation code" secondary icon="people" onPress={()=>{setMode('join');setError('');}}/>
    </>:<View style={{padding:20,borderRadius:20,backgroundColor:c.surface,marginTop:16}}>
      {mode==='create'?<><Field label="Circle name" value={name} onChangeText={setName} placeholder="Sunday readers" maxLength={60} editable={!busy}/><ActionButton title="Create circle" loading={busy} disabled={busy||!name.trim()} onPress={()=>void enter('create')}/></>:<><Field label="Invitation code" value={code} onChangeText={setCode} placeholder="ABCD-EF12-3456" autoCapitalize="characters" autoCorrect={false} maxLength={20} editable={!busy}/><ActionButton title="Join circle" loading={busy} disabled={busy||!code.trim()} onPress={()=>void enter('join')}/></>}
      <ActionButton title="Cancel" variant="ghost" disabled={busy} onPress={()=>setMode('list')}/>
    </View>}
    {!!error&&<Notice error text={error}/>}
    <Notice text="Circles support up to 50 members. Their messages are only visible to members who have joined the community."/>
    {selected&&<CircleConversation key={selected} circleId={selected} active={active} onClose={()=>setSelected(null)}/>}
  </View>;
}
