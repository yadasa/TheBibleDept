import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { AccountHome } from '../components/account/AccountHome';
import { ProfilePage } from '../components/account/ProfilePage';
import { ReadingProgressPage } from '../components/account/ReadingProgressPage';
import { AccountTransition } from '../components/account/AccountTransition';
import { useScreenScroll } from '../components/ScreenScrollView';
import type { Translation } from '../services/bible';
import { ActionButton, Field, Notice } from '../components/ui';
import { authError, useAuth } from '../services/AuthProvider';
import { getFirebase, usingEmulators } from '../services/firebase';
import { radius, spacing, useThemedStyles, Colors, typography } from '../theme';
import { PhoneSignIn } from './PhoneSignIn';
import { SettingsScreen, SettingsSection } from './SettingsScreen';
import { detachPushDevice } from '../services/NotificationProvider';
import { BadgesPage } from '../components/community/BadgesPage';
import { PrayerScreen } from './PrayerScreen';
import { AccountPage } from '../components/account/AccountPage';

export function AccountScreen({onOpenPlan,onReadPassage,onOpenNotes,onCommunity,onCircles,onRead,onRememberPage,requestedPage='home',requestRevision=0}:{onOpenPlan?:(day:number)=>void;onReadPassage?:(reference:string,translation:Translation)=>void;onOpenNotes?:()=>void;onCommunity?:()=>void;onCircles?:()=>void;onRead?:()=>void;onRememberPage?:(page:'home'|'badges'|'prayer')=>void;requestedPage?:'home'|'badges'|'prayer';requestRevision?:number}) {
  const {c,s}=useThemedStyles(styles);
  const { user, ready, error: setupError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(false);
  const [page,setPage]=useState<'home'|'profile'|'progress'|'settings'|'badges'|'prayer'>('home');
  const [settingsSection,setSettingsSection]=useState<SettingsSection>('home'),top=useScreenScroll();
  function open(next:typeof page){setPage(next);onRememberPage?.(next==='badges'||next==='prayer'?next:'home');top();}
  useEffect(()=>{open(requestedPage);},[requestedPage,requestRevision]);
  function openSettings(section:SettingsSection='home'){setSettingsSection(section);open('settings');}

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
  if(user)return <AccountTransition pageKey={page}>
    {usingEmulators&&<View style={s.mode}><Text style={s.modeTitle}>Practice account</Text><Text style={s.modeText}>Changes made here won’t appear in your usual account.</Text></View>}
    {page==='badges'?<BadgesPage onBack={()=>open('home')} onRead={onRead} onCommunity={onCommunity}/>:page==='prayer'?<AccountPage title="Your prayer journal" intro="A private place to pray and reflect." onBack={()=>open('home')}><PrayerScreen onAccount={()=>open('home')}/></AccountPage>:page==='settings'?<SettingsScreen onBack={()=>open('home')} initialSection={settingsSection}/>:page==='profile'?<ProfilePage onBack={()=>open('home')}/>:page==='progress'?<ReadingProgressPage onBack={()=>open('home')} onOpenPlan={onOpenPlan} onReadPassage={onReadPassage} onReadingSettings={()=>openSettings('reading')}/>:<View>
      <AccountHome onProfile={()=>open('profile')} onProgress={()=>open('progress')} onSettings={()=>openSettings()} onNotes={onOpenNotes} onPrayer={()=>open('prayer')} onBadges={()=>open('badges')} onCommunity={onCommunity} onCircles={onCircles}/>
      {!!error&&<Notice text={error} error/>}<ActionButton title="Sign out" onPress={leave} loading={busy} variant="secondary" icon="logout"/>
    </View>}
  </AccountTransition>;

  return <AccountTransition pageKey={phone?'phone':register?'register':'signin'}>
    {usingEmulators && <View style={s.mode}><Text style={s.modeTitle}>Practice account</Text><Text style={s.modeText}>Changes made here won’t appear in your usual account.</Text></View>}
    {phone ? <PhoneSignIn onEmail={() => { setPhone(false); setError(''); setMessage(''); }} /> : <View>
      <View style={s.status}><Icon name="user" size={16} color={c.muted} /><Text style={s.statusText}>Not signed in</Text></View>
      <Text accessibilityRole="header" style={s.heading}>{register ? 'Create an account' : 'Sign in'}</Text>
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
  </AccountTransition>;
}

const styles=(c:Colors)=>StyleSheet.create({
  loading: { flexDirection: 'row', gap: spacing[12], alignItems: 'center', paddingVertical: spacing[24] },
  loadingText: { ...typography.body, color: c.muted },
  mode: { padding: spacing[16], backgroundColor: c.tint, borderRadius: radius, marginBottom: spacing[24], gap: spacing[4] },
  modeTitle: { ...typography.label, color: c.actionText },
  modeText: { ...typography.meta, color: c.ink },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing[8], marginBottom: spacing[8] },
  statusText: { ...typography.meta, color: c.muted },
  heading: { ...typography.title, color: c.ink, marginTop: spacing[4] },
  intro: { ...typography.body, color: c.muted, marginTop: spacing[12] },
  form: { marginTop: spacing[24] },
  helper: { ...typography.meta, color: c.muted, marginBottom: spacing[8] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: spacing[4], marginTop: spacing[12] },
  switchText: { ...typography.meta, color: c.muted },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing[16], marginTop: spacing[16], marginBottom: spacing[8] },
  rule: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: { ...typography.meta, color: c.muted },
});
