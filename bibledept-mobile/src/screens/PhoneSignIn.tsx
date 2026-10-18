import { useState } from 'react';
import { View } from 'react-native';
import { ActionButton, Field, Notice } from '../components/ui';
import { authError } from '../services/AuthProvider';
import { usingEmulators } from '../services/firebase';
import { confirmPhoneCode, PhoneChallenge, requestPhoneCode } from '../services/phone';

export function PhoneSignIn({onEmail}:{onEmail:()=>void}){
  const [number,setNumber]=useState(usingEmulators?'+16505550123':''),[code,setCode]=useState('');
  const [challenge,setChallenge]=useState<PhoneChallenge>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(){
    setError('');setBusy(true);
    try{if(challenge)await confirmPhoneCode(challenge.verificationId,code);else setChallenge(await requestPhoneCode(number.replace(/[\s()-]/g,'')));}
    catch(e){setError(authError(e));}finally{setBusy(false);}
  }
  return <View>
    <Notice text={usingEmulators?'Local phone test: no SMS is sent. Use a fictional +165055501xx number.':'Sign in with your phone number. Live SMS verification requires the configured iPhone development build.'}/>
    <Field label="Phone number" value={number} onChangeText={setNumber} keyboardType="phone-pad" textContentType="telephoneNumber" editable={!challenge} autoComplete="tel" placeholder="+1 650 555 0123"/>
    {challenge&&<Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} onSubmitEditing={submit}/>}
    {challenge?.testCode&&<Notice text={`Local emulator code: ${challenge.testCode}. This is a test code, not a real SMS.`}/>}
    <ActionButton title={challenge?'Verify phone number':usingEmulators?'Get local test code':'Send verification code'} onPress={submit} loading={busy}/>
    {challenge&&<ActionButton title="Use a different number" secondary disabled={busy} onPress={()=>{setChallenge(undefined);setCode('');setError('');}}/>}
    <ActionButton title="Use email instead" secondary onPress={onEmail} disabled={busy}/>
    {!!error&&<Notice text={error} error/>}
  </View>;
}
