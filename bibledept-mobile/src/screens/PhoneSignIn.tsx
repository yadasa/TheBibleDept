import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Icon } from '../components/Icon';
import { ActionButton, Field, Notice } from '../components/ui';
import { authError } from '../services/AuthProvider';
import { usingEmulators } from '../services/firebase';
import { confirmPhoneCode, PhoneChallenge, requestPhoneCode } from '../services/phone';
import { radius, spacing, theme as c, typography } from '../theme';

export function PhoneSignIn({ onEmail }: { onEmail: () => void }) {
  const nativeReady = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && Constants.expoConfig?.extra?.nativePhoneAuth === true;
  const available = usingEmulators || nativeReady;
  const [number, setNumber] = useState(usingEmulators ? '+16505550123' : '');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<PhoneChallenge>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy) return;
    setError('');
    if (challenge && !/^\d{6}$/.test(code)) { setError('Enter the 6-digit verification code.'); return; }
    if (!challenge && !/^\+[1-9]\d{7,14}$/.test(number.replace(/[\s()-]/g, ''))) { setError('Include your country code, for example +1 650 555 0123.'); return; }
    setBusy(true);
    try {
      if (challenge) await confirmPhoneCode(challenge.verificationId, code);
      else setChallenge(await requestPhoneCode(number.replace(/[\s()-]/g, '')));
    } catch (e) { setError(authError(e)); }
    finally { setBusy(false); }
  }

  return <View>
    <View style={s.status}><Icon name="phone" size={16} color={c.muted} /><Text style={s.statusText}>{challenge ? 'Verify your number' : 'Sign in by phone'}</Text></View>
    <Text style={s.heading}>{challenge ? 'Check your messages.' : 'Your number. Your account.'}</Text>
    <Text style={s.intro}>{challenge ? usingEmulators ? 'Enter the local test code below. No text message was sent.' : 'Enter the 6-digit code sent to ' + number + '.' : 'Use your phone number with its country code to sign in or create an account.'}</Text>
    {!challenge && (usingEmulators || !nativeReady) && <View style={s.info}><Icon name="phone" size={18} color={c.action} /><Text style={s.infoText}>{usingEmulators ? 'Local test only. Use a fictional number from +16505550100 to +16505550199. No SMS is sent.' : 'SMS verification needs the iPhone development build. Use email to sign in to this preview.'}</Text></View>}
    <View style={s.form}>
      <Field label="Phone number" value={number} onChangeText={setNumber} keyboardType="phone-pad" textContentType="telephoneNumber" editable={!challenge && !busy} autoComplete="tel" placeholder="+1 650 555 0123" />
      {challenge && <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} onSubmitEditing={submit} editable={!busy} placeholder="6-digit code" />}
      {challenge?.testCode && <Notice text={'Local emulator code: ' + challenge.testCode + '. This is a test code, not a text message.'} />}
      {!!error && <Notice text={error} error />}
      <ActionButton title={challenge ? 'Verify and sign in' : usingEmulators ? 'Get local test code' : 'Send verification code'} onPress={submit} disabled={!available} loading={busy} icon={challenge ? 'check' : 'arrowRight'} />
      {challenge && <ActionButton title="Use a different number" variant="ghost" disabled={busy} onPress={() => { setChallenge(undefined); setCode(''); setError(''); }} />}
    </View>
    <View style={s.email}><ActionButton title="Use email instead" variant={available?'secondary':'primary'} icon="mail" onPress={onEmail} disabled={busy} /></View>
  </View>;
}

const s = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing[8], marginBottom: spacing[12] },
  statusText: { ...typography.meta, color: c.muted },
  heading: { ...typography.section, color: c.ink },
  intro: { ...typography.body, color: c.muted, marginTop: spacing[12] },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[12], padding: spacing[16], backgroundColor: c.tint, borderRadius: radius, marginTop: spacing[24] },
  infoText: { ...typography.meta, color: c.ink, flex: 1 },
  form: { marginTop: spacing[24] },
  email: { borderTopWidth: 1, borderColor: c.border, marginTop: spacing[24], paddingTop: spacing[16] },
});
