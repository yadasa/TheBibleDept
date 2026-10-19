import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '../components/Icon';
import { ActionButton, Field, Notice } from '../components/ui';
import { authError, useAuth } from '../services/AuthProvider';
import { getFirebase, usingEmulators } from '../services/firebase';
import { radius, spacing, useThemedStyles, Colors, typography } from '../theme';
import { PhoneSignIn } from './PhoneSignIn';
import { SettingsScreen } from './SettingsScreen';
import { detachPushDevice } from '../services/NotificationProvider';

export function AccountScreen() {
  const {c,s}=useThemedStyles(styles);
  const { user, ready, error: setupError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(false);
  const [settings,setSettings]=useState(false);

  async function submit() {
    if (busy) return;
    setError('');
    setMessage('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    if (register && password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    try {
      const auth = getFirebase().auth;
      await (register ? createUserWithEmailAndPassword(auth, email.trim(), password) : signInWithEmailAndPassword(auth, email.trim(), password));
      setPassword('');
    } catch (e) { setError(authError(e)); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (busy) return;
    setError('');
    setMessage('');
    if (!email.trim()) { setError('Enter your email address above, then choose Forgot password.'); return; }
    setBusy(true);
    try {
      await sendPasswordResetEmail(getFirebase().auth, email.trim());
      setMessage(usingEmulators ? 'No email was sent in this preview.' : 'If there’s an account with this email address, you’ll receive a password reset link.');
    } catch (e) { setError(authError(e)); }
    finally { setBusy(false); }
  }

  async function leave() {
    if (busy) return;
    setError('');
    setMessage('');
    setBusy(true);
    try { if(user)await detachPushDevice(user.uid).catch(()=>{});await signOut(getFirebase().auth); }
    catch (e) { setError(authError(e)); }
    finally { setBusy(false); }
  }

  function switchMode() {
    setRegister(!register);
    setError('');
    setMessage('');
  }

  if (!ready) return <View style={s.loading}><ActivityIndicator color={c.action} /><Text style={s.loadingText}>Loading your account…</Text></View>;
  if (setupError) return <Notice text={setupError} error />;
  if(user&&settings)return <SettingsScreen onBack={()=>setSettings(false)}/>;

  return <View>
    {usingEmulators && <View style={s.mode}><Text style={s.modeTitle}>Practice account</Text><Text style={s.modeText}>Changes made here won’t appear in your usual account.</Text></View>}
    {user ? <View>
      <View style={s.identity}>
        <View style={s.avatar}><Icon name="user" size={26} color={c.ink} /></View>
        <View style={s.identityText}><View style={s.status}><Icon name="checkCircle" size={16} color={c.success} /><Text style={s.signedIn}>Signed in</Text></View><Text selectable style={s.email}>{user.email || user.phoneNumber || 'Your Bible Dept account'}</Text></View>
      </View>
      <View style={s.details}>
        <AccountDetail icon="heart" title="Private prayer journal" text="Your prayers are saved to this account. Only you can see them." />
        <AccountDetail icon="book" title="Reading history" text="Your saved chapters and reading streaks are kept with your account." />
        <AccountDetail icon="calendar" title="Your reading plan" text="Pick up where you left off and see the days you’ve completed." />
      </View>
      <ActionButton title="Settings" icon="settings" secondary onPress={()=>setSettings(true)}/>
      {!!error && <Notice text={error} error />}
      <ActionButton title="Sign out" onPress={leave} loading={busy} variant="secondary" icon="logout" />
    </View> : phone ? <PhoneSignIn onEmail={() => { setPhone(false); setError(''); setMessage(''); }} /> : <View>
      <View style={s.status}><Icon name="user" size={16} color={c.muted} /><Text style={s.statusText}>Not signed in</Text></View>
      <Text style={s.heading}>{register ? 'Create an account' : 'Sign in'}</Text>
      <Text style={s.intro}>Save your notes, prayers, and reading history.</Text>
      <View style={s.form}>
        <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" editable={!busy} placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType={register ? 'newPassword' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} onSubmitEditing={submit} returnKeyType="go" editable={!busy} />
        {register && <Text style={s.helper}>Use at least 8 characters.</Text>}
        {!!error && <Notice text={error} error />}
        {!!message && <Notice text={message} success />}
        <ActionButton title={register ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} icon="arrowRight" />
        {!register && <ActionButton title="Forgot password?" onPress={reset} variant="ghost" disabled={busy} />}
      </View>
      <View style={s.switchRow}><Text style={s.switchText}>{register ? 'Already have an account?' : 'New to Bible Dept?'}</Text></View>
      <ActionButton title={register ? 'Sign in' : 'Create an account'} onPress={switchMode} disabled={busy} icon="arrowRight"/>
      <View style={s.divider}><View style={s.rule} /><Text style={s.dividerText}>or</Text><View style={s.rule} /></View>
      <ActionButton title="Continue with phone" onPress={() => { setPhone(true); setError(''); setMessage(''); }} variant="secondary" icon="phone" disabled={busy} />
    </View>}
  </View>;
}

function AccountDetail({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const {c,s}=useThemedStyles(styles);
  return <View style={s.detail}><View style={s.detailIcon}><Icon name={icon} size={20} color={c.action} /></View><View style={s.detailText}><Text style={s.detailTitle}>{title}</Text><Text style={s.detailBody}>{text}</Text></View></View>;
}

const styles=(c:Colors)=>StyleSheet.create({
  loading: { flexDirection: 'row', gap: spacing[12], alignItems: 'center', paddingVertical: spacing[24] },
  loadingText: { ...typography.body, color: c.muted },
  mode: { padding: spacing[16], backgroundColor: c.tint, borderRadius: radius, marginBottom: spacing[24], gap: spacing[4] },
  modeTitle: { ...typography.label, color: c.actionText },
  modeText: { ...typography.meta, color: c.ink },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing[8], marginBottom: spacing[8] },
  statusText: { ...typography.meta, color: c.muted },
  heading: { ...typography.section, color: c.ink, marginTop: spacing[4] },
  intro: { ...typography.body, color: c.muted, marginTop: spacing[12] },
  form: { marginTop: spacing[24] },
  helper: { ...typography.meta, color: c.muted, marginBottom: spacing[8] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: spacing[4], marginTop: spacing[12] },
  switchText: { ...typography.meta, color: c.muted },
  switchButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius },
  switchLink: { ...typography.label, color: c.actionText },
  pressed: { backgroundColor: c.tint },
  focused: { outlineColor: c.action, outlineWidth: 2, outlineOffset: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing[16], marginTop: spacing[16], marginBottom: spacing[8] },
  rule: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: { ...typography.meta, color: c.muted },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[16], padding: spacing[20], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius },
  avatar: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: c.tint, borderRadius: radius },
  identityText: { flex: 1, minWidth: 0 },
  signedIn: { ...typography.meta, color: c.success, fontWeight: '600' },
  email: { ...typography.body, fontWeight: '600', color: c.ink, flexShrink: 1 },
  details: { marginTop: spacing[16], marginBottom: spacing[24] },
  detail: { flexDirection: 'row', gap: spacing[16], borderBottomWidth: 1, borderColor: c.border, paddingVertical: spacing[20] },
  detailIcon: { paddingTop: spacing[4] },
  detailText: { flex: 1 },
  detailTitle: { ...typography.label, color: c.ink, marginBottom: spacing[4] },
  detailBody: { ...typography.meta, color: c.muted },
  freeNote: { flexDirection: 'row', gap: spacing[8], alignItems: 'flex-start', marginTop: spacing[32] },
  freeText: { ...typography.meta, color: c.muted, flex: 1 },
});
