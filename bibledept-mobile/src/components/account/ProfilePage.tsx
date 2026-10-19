import { reload, sendEmailVerification, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../services/AuthProvider';
import { getFirebase, usingEmulators } from '../../services/firebase';
import { messageForUser } from '../../services/userMessage';
import { Colors, typography as t, useThemedStyles } from '../../theme';
import { ActionButton, Field, Notice } from '../ui';
import { AccountPage } from './AccountPage';

export function ProfilePage({onBack}:{onBack:()=>void}) {
  const {user}=useAuth(),{s}=useThemedStyles(styles);
  const [name,setName]=useState(user?.displayName||''),[verified,setVerified]=useState(!!user?.emailVerified);
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[positive,setPositive]=useState(false);
  const mounted=useRef(true),locked=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  if(!user)return null;
  const owner=user,hasPassword=user.providerData.some(provider=>provider.providerId==='password');
  async function run(action:string,work:()=>Promise<string>) {
    if(locked.current)return;locked.current=true;setBusy(action);setError('');setMessage('');
    try {const result=await work();if(mounted.current){setMessage(result);setPositive(action==='name'||(!usingEmulators&&(action!=='check'||owner.emailVerified)));}}
    catch(e){if(mounted.current)setError(messageForUser(e,'We couldn’t finish that change. Please try again.'));}
    finally{locked.current=false;if(mounted.current)setBusy('');}
  }
  return <AccountPage title="Profile & sign-in" intro="Keep your details up to date and recover access to your account." onBack={onBack}>
    <Field label="Your name" value={name} onChangeText={value=>{setName(value);setMessage('');}} maxLength={80} autoComplete="name" textContentType="name" editable={!busy} placeholder="Your name"/>
    <ActionButton title="Save name" icon="check" disabled={!!busy||name.trim()===(owner.displayName||'')} loading={busy==='name'} onPress={()=>void run('name',async()=>{await updateProfile(owner,{displayName:name.trim()||null});return 'Your name is saved.';})}/>
    {!!owner.email&&<View style={s.section}><Text style={s.label}>Email address</Text><Text selectable style={s.value}>{owner.email}</Text><Notice text={verified?'Email confirmed.':'Confirm this email address belongs to you.'} success={verified}/>
      {!verified&&<><ActionButton title="Send confirmation email" secondary disabled={!!busy} loading={busy==='verify'} onPress={()=>void run('verify',async()=>{await sendEmailVerification(owner);return usingEmulators?'No email was sent in this preview.':'Confirmation email sent. Check your inbox.';})}/>
      <ActionButton title="I’ve confirmed my email" secondary disabled={!!busy} loading={busy==='check'} onPress={()=>void run('check',async()=>{await reload(owner);if(mounted.current)setVerified(owner.emailVerified);return owner.emailVerified?'Your email is confirmed.':'Your email isn’t confirmed yet. Open the link in your inbox, then check again.';})}/></>}
    </View>}
    {!!owner.phoneNumber&&<View style={s.section}><Text style={s.label}>Phone number</Text><Text selectable style={s.value}>{owner.phoneNumber}</Text></View>}
    {hasPassword&&!!owner.email&&<View style={s.section}><Text style={s.label}>Password</Text><Text style={s.body}>We’ll send you a link to choose a new password.</Text><ActionButton title="Send password reset email" secondary icon="mail" disabled={!!busy} loading={busy==='password'} onPress={()=>void run('password',async()=>{await sendPasswordResetEmail(getFirebase().auth,owner.email!);return usingEmulators?'No email was sent in this preview.':'Password reset email sent. Check your inbox.';})}/></View>}
    {!!message&&<Notice text={message} success={positive}/>}{!!error&&<Notice text={error} error/>}
  </AccountPage>;
}
const styles=(c:Colors)=>StyleSheet.create({section:{borderTopWidth:1,borderColor:c.border,paddingTop:24,marginTop:28},label:{...t.label,color:c.ink},value:{...t.body,color:c.ink,marginTop:8},body:{...t.body,color:c.muted,marginTop:10}});
