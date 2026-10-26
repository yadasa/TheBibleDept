import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { Circle, CommunityProfile } from '../../../shared/community';
import { useAuth } from '../../services/AuthProvider';
import { useCommunity } from '../../services/CommunityProvider';
import { typography as t, useTheme } from '../../theme';
import { ActionButton, Field, Notice } from '../ui';

type Confirmation={kind:'invitation'}|{kind:'remove';uid:string;name:string};
export function CircleManagement({circle,readers,busy,run,onNotice}:{
  circle:Circle&{memberIds:string[]};readers:Map<string,CommunityProfile>;busy:string;
  run:(action:string,work:()=>Promise<void>)=>Promise<void>;onNotice:(notice:string)=>void;
}) {
  const {user}=useAuth(),community=useCommunity(),{colors:c}=useTheme();
  const [open,setOpen]=useState(false),[name,setName]=useState(circle.name),[confirmation,setConfirmation]=useState<Confirmation|null>(null);
  useEffect(()=>setName(circle.name),[circle.name]);
  if(circle.createdBy!==user?.uid)return null;
  const confirmationControls=confirmation&&<View style={{marginTop:12,paddingTop:16,borderTopWidth:1,borderColor:c.border}}>
    <Text accessibilityRole="header" style={{...t.label,color:c.ink}}>{confirmation.kind==='invitation'?'Replace this invitation?':`Remove ${confirmation.name}?`}</Text>
    <Notice text={confirmation.kind==='invitation'?'The current code will stop working. Everyone already in the circle stays a member.':'Their existing messages remain. The invitation code is also replaced, so they need a fresh invitation to return.'}/>
    <ActionButton title={confirmation.kind==='invitation'?'Confirm replace invitation':'Confirm remove reader'} secondary loading={busy==='manage'} disabled={!!busy} onPress={()=>void run('manage',async()=>{
      if(confirmation.kind==='invitation')await community.perform('replaceReadingCircleInvitation',{circleId:circle.id,expectedCode:circle.code});
      else await community.perform('removeReadingCircleMember',{circleId:circle.id,uid:confirmation.uid,expectedCode:circle.code});
      onNotice(confirmation.kind==='invitation'?'Invitation replaced. Find the new code in Circle details.':'Reader removed. Share the new invitation only with people you want to join.');setConfirmation(null);
    })}/>
    <ActionButton title="Cancel owner action" variant="ghost" disabled={!!busy} onPress={()=>setConfirmation(null)}/>
  </View>;
  return <View style={{marginVertical:16}}>
    <ActionButton title={open?'Close owner controls':'Manage circle'} secondary disabled={!!busy} onPress={()=>{setOpen(value=>!value);setConfirmation(null);}}/>
    {open&&<View style={{padding:18,borderRadius:20,backgroundColor:c.surface,gap:8}}>
      <Text accessibilityRole="header" style={{...t.section,color:c.ink}}>Owner controls</Text>
      <Field label="Circle name" value={name} onChangeText={setName} maxLength={60} editable={!busy}/>
      <ActionButton title="Save circle name" secondary loading={busy==='rename'} disabled={!!busy||!name.trim()||name.trim()===circle.name} onPress={()=>void run('rename',async()=>{
        await community.perform('renameReadingCircle',{circleId:circle.id,name});onNotice('Circle name saved for everyone.');
      })}/>
      <ActionButton title="Replace invitation code" secondary disabled={!!busy} onPress={()=>setConfirmation({kind:'invitation'})}/>
      {confirmation?.kind==='invitation'&&confirmationControls}
      <Text style={{...t.label,color:c.ink,marginTop:18}}>Circle memberships</Text>
      <Text style={{...t.meta,color:c.muted}}>These controls include hidden readers and members without a shared profile.</Text>
      {circle.memberIds.filter(uid=>uid!==user?.uid).map((uid,index)=>{
        const name=readers.get(uid)?.displayName||`Reader ${index+1} (profile private)`;
        return <View key={uid} style={{paddingVertical:10,borderBottomWidth:1,borderColor:c.border}}>
          <Text style={{...t.label,color:c.ink}}>{name}</Text>
          <ActionButton title={`Remove ${name}`} variant="ghost" disabled={!!busy} onPress={()=>setConfirmation({kind:'remove',uid,name})}/>
          {confirmation?.kind==='remove'&&confirmation.uid===uid&&confirmationControls}
        </View>;
      })}
      {circle.memberIds.length===1&&<Notice text="You’re the only member. Share the invitation code to read with someone."/>}
    </View>}
  </View>;
}
