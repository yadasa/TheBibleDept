import { useRef, useState } from 'react';
import { View } from 'react-native';
import type { CommunityProfile } from '../../../shared/community';
import { useAuth } from '../../services/AuthProvider';
import { useCommunity } from '../../services/CommunityProvider';
import { messageForUser } from '../../services/userMessage';
import { ActionButton, Field, Notice } from '../ui';

/** Keep reporting available even when a reader shares no milestones or messages. */
export function ProfileReport({profile}:{profile:CommunityProfile}) {
  const {user}=useAuth(),community=useCommunity();
  const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receivedVersion,setReceivedVersion]=useState('');
  const [version,setVersion]=useState(''),currentVersion=profile.profileVersion||'',validVersion=/^[a-f0-9]{32}$/.test(currentVersion),changed=version!==currentVersion;
  const locked=useRef(false);
  if(profile.id===user?.uid)return null;
  async function submit() {
    if(locked.current||!reason.trim()||changed||!validVersion)return;locked.current=true;setBusy(true);setError('');
    try{await community.perform('reportReadingCommunityContent',{profileUid:profile.id,profileVersion:version,reason});setReceivedVersion(version);setOpen(false);setReason('');}
    catch(error){setError(messageForUser(error,'This profile report couldn’t be saved. Please try again.'));}
    finally{locked.current=false;setBusy(false);}
  }
  return <View style={{marginTop:12}}>
    {receivedVersion&&receivedVersion===currentVersion?<Notice success text="Profile report received for review. You can also hide this reader."/>:open?<>
      <Notice text="App staff will receive this profile’s name, photo, and your explanation."/>
      {!validVersion&&<Notice text="This profile is still updating. Reopen it in a moment to report it."/>}
      {changed&&validVersion&&<><Notice text="This profile changed while you were writing. Review its current name and photo before continuing."/><ActionButton title="Use current profile" secondary disabled={busy} onPress={()=>{setVersion(currentVersion);setError('');}}/></>}
      <Field label="Why are you reporting this profile?" value={reason} onChangeText={setReason} multiline maxLength={500} editable={!busy}/>
      {!!error&&<Notice error text={error}/>}
      <ActionButton title="Submit profile report" secondary loading={busy} disabled={busy||!reason.trim()||changed||!validVersion} onPress={()=>void submit()}/>
      <ActionButton title="Cancel profile report" variant="ghost" disabled={busy} onPress={()=>{setOpen(false);setError('');}}/>
    </>:<ActionButton title="Report this profile" variant="ghost" onPress={()=>{setVersion(currentVersion);setOpen(true);setError('');}}/>}
    {!!receivedVersion&&receivedVersion!==currentVersion&&<Notice text="Your earlier report was received. This profile has since changed."/>}
  </View>;
}
