import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Field, Notice } from '../components/ui';
import { useAuth } from '../services/AuthProvider';
import { getFirebase } from '../services/firebase';
import { theme as c } from '../theme';
import { USER_COLLECTION } from '../services/dataPaths';

type Prayer = {id:string;text:string;answered:boolean};
export function PrayerScreen({onAccount}:{onAccount:()=>void}) {
  const {user}=useAuth();
  const [owner,setOwner]=useState<string>(),[prayers,setPrayers]=useState<Prayer[]>([]);
  const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    setOwner(user?.uid);setPrayers([]);setError('');
    if(!user)return;
    return onSnapshot(query(collection(getFirebase().db,USER_COLLECTION,user.uid,'prayers'),orderBy('createdAt','desc'),limit(100)),snapshot=>{
      setPrayers(snapshot.docs.map(d=>({id:d.id,text:String(d.data().text),answered:d.data().answered===true})));
    },()=>setError('Your prayers could not be loaded. Check your Firebase connection.'));
  },[user?.uid]);
  async function save(){
    if(!user)return;
    const value=text.trim();if(!value){setError('Write a prayer first.');return;}
    setBusy(true);setError('');
    try{await addDoc(collection(getFirebase().db,USER_COLLECTION,user.uid,'prayers'),{text:value,answered:false,createdAt:serverTimestamp()});setText('');}
    catch{setError('Your prayer could not be saved. Check your connection and retry.');}finally{setBusy(false);}
  }
  async function toggle(prayer:Prayer){
    if(!user)return;
    setBusy(true);setError('');
    try{await updateDoc(doc(getFirebase().db,USER_COLLECTION,user.uid,'prayers',prayer.id),{answered:!prayer.answered});}
    catch{setError('The prayer could not be updated. Please retry.');}finally{setBusy(false);}
  }
  if(!user)return <View style={s.card}><Text style={s.title}>Make space for prayer.</Text><Notice text="Keep a private journal of what you are praying about and return to it as you grow."/><ActionButton title="Sign in to save prayers" onPress={onAccount}/></View>;
  const visible=owner===user.uid?prayers:[];
  return <View>
    <Text style={s.title}>What's on your heart?</Text><Notice text="Your prayer journal is private to your account."/>
    <Field label="Your prayer" value={text} onChangeText={setText} multiline maxLength={3000} placeholder="God, today I am praying about…"/>
    <ActionButton title="Save prayer" onPress={save} loading={busy}/>
    {!!error&&<Notice text={error} error/>}
    <Text style={s.section}>Your prayer journal</Text>
    {!visible.length&&<Notice text="Your first prayer can start right here."/>}
    {visible.map(prayer=><View key={prayer.id} style={s.card}><Text style={s.status}>{prayer.answered?'ANSWERED':'PRAYING'}</Text><Text style={s.prayer}>{prayer.text}</Text><ActionButton title={prayer.answered?'Keep praying':'Mark answered'} onPress={()=>toggle(prayer)} secondary disabled={busy}/></View>)}
  </View>;
}
const s=StyleSheet.create({card:{padding:20,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:4,marginBottom:16},title:{fontSize:24,fontWeight:'800',color:c.ink,letterSpacing:-.6},section:{fontSize:21,fontWeight:'800',color:c.ink,marginTop:30,marginBottom:16},status:{fontSize:10,fontWeight:'900',letterSpacing:1.4,color:c.action,marginBottom:12},prayer:{fontSize:16,lineHeight:25,color:c.ink,marginBottom:10}});
