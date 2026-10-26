import { useEffect, useRef, useState } from 'react';
import { Image, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../services/AuthProvider';
import { useCommunity } from '../../services/CommunityProvider';
import { messageForUser } from '../../services/userMessage';
import { typography as t, useTheme } from '../../theme';
import { ActionButton, Field, Notice } from '../ui';
import { ProfileAvatar } from './ProfileAvatar';

export function CommunityProfileEditor({joining=false,onSaved}:{joining?:boolean;onSaved?:()=>void}) {
  const community=useCommunity(),{user}=useAuth(),{colors:c}=useTheme();
  const [name,setName]=useState(''),[photo,setPhoto]=useState<string|null>(null),[joined,setJoined]=useState(joining),[shareStreak,setShareStreak]=useState(true),[shareBadges,setShareBadges]=useState(true);
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
  const initialized=useRef(false),locked=useRef(false);
  useEffect(()=>{if(community.ready&&!initialized.current){initialized.current=true;const value=community.settings;setName(value.displayName||user?.displayName||'');setPhoto(value.photoData);setJoined(value.joined||joining);setShareStreak(value.shareStreak);setShareBadges(value.shareBadges);}},[community.ready,community.settings,user?.displayName,joining]);
  async function pickPhoto() {
    if(locked.current)return;locked.current=true;setBusy('photo');setError('');setMessage('');
    try {
      // The image-only system picker needs no broad library permission. Keep this
      // call directly in the button event so browsers preserve the user gesture.
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8,exif:false});
      if(result.canceled)return;
      const asset=result.assets[0];
      const dimensions=asset.width>0&&asset.height>0?asset:await Image.getSize(asset.uri),side=Math.min(dimensions.width,dimensions.height);
      if(!Number.isFinite(side)||side<=0)throw new Error('Invalid image');
      const actions:ImageManipulator.Action[]=[{crop:{originX:Math.floor((dimensions.width-side)/2),originY:Math.floor((dimensions.height-side)/2),width:side,height:side}},{resize:{width:192,height:192}}];
      let image=await ImageManipulator.manipulateAsync(asset.uri,actions,{compress:.65,format:ImageManipulator.SaveFormat.JPEG,base64:true});
      if(!image.base64||image.base64.length>59970)image=await ImageManipulator.manipulateAsync(asset.uri,[...actions,{resize:{width:128,height:128}}],{compress:.4,format:ImageManipulator.SaveFormat.JPEG,base64:true});
      if(!image.base64||image.base64.length>59970)throw new Error('Image too large');
      setPhoto(`data:image/jpeg;base64,${image.base64}`);setMessage('Photo ready. Save your profile to keep it.');
    }catch{setError('We couldn’t open that photo. Try another image.');}
    finally{locked.current=false;setBusy('');}
  }
  async function save() {
    if(locked.current)return;locked.current=true;setBusy('save');setError('');setMessage('');
    try {
      await community.perform('updateCommunityProfile',{displayName:name.trim(),photoData:photo,joined,shareStreak,shareBadges});
      if(user&&user.displayName!==name.trim())await updateProfile(user,{displayName:name.trim()}).catch(()=>{});
      setMessage(joined?'Your profile and sharing preferences are saved.':'Your profile is saved. You’re not sharing with the community.');onSaved?.();
    }catch(e){setError(messageForUser(e,'Your profile couldn’t be saved. Please try again.'));}
    finally{locked.current=false;setBusy('');}
  }
  return <View>
    {!community.ready&&!community.error&&<Notice text="Loading your saved profile…"/>}
    <View style={{alignItems:'center',gap:12,marginBottom:24}}><ProfileAvatar name={name||'Your profile'} photoData={photo} size={104} club={community.earned.some(a=>a.id==='six-percent-club')}/>
      <ActionButton title={photo?'Change profile photo':'Add profile photo'} icon="camera" secondary loading={busy==='photo'} disabled={!!busy||!community.ready} onPress={()=>void pickPhoto()}/>
      {!!photo&&<ActionButton title="Remove photo" variant="ghost" disabled={!!busy} onPress={()=>{setPhoto(null);setMessage('Photo removed. Save your profile to keep this change.');}}/>}
    </View>
    <Field label="Display name" value={name} onChangeText={setName} placeholder="What should we call you?" maxLength={80} autoComplete="name" editable={!busy&&community.ready}/>
    <Text style={{...t.section,color:c.ink,marginTop:12}}>Grow together</Text>
    <Text style={{...t.body,color:c.muted,marginVertical:12}}>Join to share your name and photo, celebrate milestones, and chat in reading circles. Your email, notes, and prayer journal stay private.</Text>
    <Preference label="Join the community" description="Make your profile visible to other signed-in community members." value={joined} onChange={setJoined} disabled={!!busy||!community.ready}/>
    <Preference label="Share my reading streak" description="Let others see your current reading rhythm." value={shareStreak} onChange={setShareStreak} disabled={!!busy||!community.ready}/>
    <Preference label="Share my achievements" description="Show earned badges and journey progress, including the 6% Club emblem." value={shareBadges} onChange={setShareBadges} disabled={!!busy||!community.ready}/>
    {!!error&&<Notice error text={error}/>}
    {!community.ready&&!!community.error&&<><Notice error text={community.error}/><ActionButton title="Retry community profile" secondary onPress={community.retryCommunity}/></>}
    {!!message&&<Notice success text={message}/>}
    <ActionButton title={joining&&!community.settings.joined?'Join community':'Save profile'} loading={busy==='save'} disabled={!!busy||!community.ready||!name.trim()} onPress={()=>void save()} icon="check"/>
    {!!community.settings.blockedUids.length&&community.settings.joined&&<View style={{marginTop:24}}><Notice text={`${community.settings.blockedUids.length} hidden ${community.settings.blockedUids.length===1?'reader':'readers'}. Their activity and messages are hidden for you.`}/><ActionButton title="Unhide all readers" secondary disabled={!!busy} onPress={()=>{if(locked.current)return;locked.current=true;setBusy('unhide');setError('');void community.perform('unhideReadingCommunityReaders',{}).then(()=>setMessage('All readers are visible again.')).catch(e=>setError(messageForUser(e,'Readers couldn’t be restored. Please try again.'))).finally(()=>{locked.current=false;setBusy('');});}}/></View>}
    {!joined&&community.settings.joined&&<Notice text="Saving removes your community profile and shared milestones. Your private badges and circle memberships are kept; you can rejoin later."/>}
  </View>;
}
function Preference({label,description,value,onChange,disabled}:{label:string;description:string;value:boolean;onChange:(value:boolean)=>void;disabled:boolean}) {
  const {colors:c}=useTheme();
  return <View style={{flexDirection:'row',alignItems:'center',gap:16,paddingVertical:14,borderBottomWidth:1,borderColor:c.border}}><View style={{flex:1}}><Text style={{...t.label,color:c.ink}}>{label}</Text><Text style={{...t.meta,color:c.muted,marginTop:4}}>{description}</Text></View><Switch accessibilityLabel={label} value={value} onValueChange={onChange} disabled={disabled} trackColor={{false:c.border,true:c.orange}} thumbColor={c.ink}/></View>;
}
