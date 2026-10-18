import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Field, Notice } from '../components/ui';
import { authError, useAuth } from '../services/AuthProvider';
import { getFirebase, usingEmulators } from '../services/firebase';
import { theme as c } from '../theme';

export function AccountScreen() {
  const {user,ready,error:setupError}=useAuth();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[register,setRegister]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function submit(){
    setError('');setMessage('');
    if(!email.trim()||!password){setError('Enter your email and password.');return;}
    if(register&&password.length<8){setError('Use at least 8 characters for your password.');return;}
    setBusy(true);
    try {const auth=getFirebase().auth;await(register?createUserWithEmailAndPassword(auth,email.trim(),password):signInWithEmailAndPassword(auth,email.trim(),password));setPassword('');}
    catch(e){setError(authError(e));}finally{setBusy(false);}
  }
  async function reset(){
    setError('');setMessage('');
    if(!email.trim()){setError('Enter your email address first.');return;}
    setBusy(true);
    try{await sendPasswordResetEmail(getFirebase().auth,email.trim());setMessage(usingEmulators?'The reset link is available in the local Firebase emulator output. No email was sent.':'If an account exists, a reset email is on its way.');}
    catch(e){setError(authError(e));}finally{setBusy(false);}
  }
  if(!ready)return <Notice text="Opening your account…"/>;
  if(setupError)return <Notice text={setupError} error/>;
  return <View>
    {usingEmulators&&<View style={s.mode}><Text style={s.modeTitle}>LOCAL FIREBASE</Text><Text style={s.modeText}>Test accounts only. Nothing here is connected to a live project.</Text></View>}
    {user?<View style={s.card}>
      <Text style={s.title}>You're signed in.</Text><Text style={s.body}>{user.email||user.phoneNumber}</Text>
      <Notice text="Your reading progress and private prayers can now be saved to your account."/>
      <ActionButton title="Sign out" secondary onPress={()=>{setBusy(true);signOut(getFirebase().auth).catch(e=>setError(authError(e))).finally(()=>setBusy(false));}} loading={busy}/>
    </View>:<View>
      <Text style={s.title}>{register?'Make it your own.':'Welcome back.'}</Text><Notice text="Reading is always free. Sign in to keep your progress and prayers together."/>
      <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email"/>
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType={register?'newPassword':'password'} autoComplete={register?'new-password':'current-password'} onSubmitEditing={submit}/>
      <ActionButton title={register?'Create free account':'Sign in with email'} onPress={submit} loading={busy}/>
      <ActionButton title={register?'I already have an account':'Create a free account'} onPress={()=>{setRegister(!register);setError('');setMessage('');}} secondary disabled={busy}/>
      {!register&&<ActionButton title="Forgot password?" onPress={reset} secondary disabled={busy}/>}
      <Notice text="Phone-number sign-in is being connected separately. No social login is required."/>
    </View>}
    {!!error&&<Notice text={error} error/>}{!!message&&<Notice text={message}/>}
  </View>;
}
const s=StyleSheet.create({mode:{padding:15,backgroundColor:c.tint,borderRadius:4,marginBottom:22},modeTitle:{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:c.action,marginBottom:5},modeText:{fontSize:12,lineHeight:19,color:c.ink},title:{fontSize:25,fontWeight:'800',letterSpacing:-.6,color:c.ink},body:{fontSize:16,lineHeight:25,color:c.muted,marginTop:10},card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:4,padding:20}});
