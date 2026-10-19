import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { ActionButton, Field, Notice } from '../components/ui';
import { useAuth } from '../services/AuthProvider';
import { USER_COLLECTION } from '../services/dataPaths';
import { getFirebase } from '../services/firebase';
import { radius, spacing, useThemedStyles, Colors, typography } from '../theme';

type Prayer = { id: string; text: string; answered: boolean };

export function PrayerScreen({ onAccount }: { onAccount: () => void }) {
  const {c,s}=useThemedStyles(styles);
  const { user } = useAuth();
  const [owner, setOwner] = useState<string>();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;

  useEffect(() => {
    setText('');
    setError('');
    setMessage('');
    setSaving(false);
    setUpdating(undefined);
  }, [user?.uid]);

  useEffect(() => {
    setOwner(user?.uid);
    setPrayers([]);
    setLoadError('');
    setLoading(!!user);
    if (!user) return;
    return onSnapshot(
      query(collection(getFirebase().db, USER_COLLECTION, user.uid, 'prayers'), orderBy('createdAt', 'desc'), limit(100)),
      snapshot => {
        setPrayers(snapshot.docs.map(d => ({ id: d.id, text: String(d.data().text), answered: d.data().answered === true })));
        setLoading(false);
      },
      () => {
        setLoadError('We couldn’t load your prayers. Check your connection and try again.');
        setLoading(false);
      },
    );
  }, [user?.uid, revision]);

  async function save() {
    if (!user || saving) return;
    const value = text.trim();
    setMessage('');
    if (!value) { setError('Write a prayer before saving.'); return; }
    const uid = user.uid;
    setSaving(true);
    setError('');
    try {
      await addDoc(collection(getFirebase().db, USER_COLLECTION, uid, 'prayers'), { text: value, answered: false, createdAt: serverTimestamp() });
      if (activeUid.current === uid) { setText(''); setMessage('Prayer saved.'); }
    } catch {
      if (activeUid.current === uid) setError('We couldn’t save your prayer. Your text is still here. Check your connection and try again.');
    } finally {
      if (activeUid.current === uid) setSaving(false);
    }
  }

  async function toggle(prayer: Prayer) {
    if (!user || updating) return;
    const uid = user.uid;
    setUpdating(prayer.id);
    setError('');
    setMessage('');
    try {
      await updateDoc(doc(getFirebase().db, USER_COLLECTION, uid, 'prayers', prayer.id), { answered: !prayer.answered });
      if (activeUid.current === uid) setMessage(prayer.answered ? 'Prayer moved back to Praying.' : 'Prayer marked as answered.');
    } catch {
      if (activeUid.current === uid) setError('We couldn’t update this prayer. Try again.');
    } finally {
      if (activeUid.current === uid) setUpdating(undefined);
    }
  }

  if (!user) return <View style={s.guest}>
    <View style={s.iconTile}><Icon name="heart" size={28} color={c.action} /></View>
    <Text style={s.heading}>Keep a prayer journal</Text>
    <Text style={s.intro}>Write down your prayers and come back to them later. You can mark a prayer as answered when you’re ready.</Text>
    <View style={s.guestAction}><ActionButton title="Sign in to save prayers" onPress={onAccount} icon="arrowRight" /></View>
    <View style={s.privacy}><Icon name="lock" size={16} color={c.muted} /><Text style={s.privacyText}>Saved prayers are private to your account.</Text></View>
  </View>;

  const visible = owner === user.uid ? prayers : [];
  return <View style={s.screen}>
    <View style={s.privacy}><Icon name="lock" size={16} color={c.muted} /><Text style={s.privacyText}>Your prayers are saved to your account. Only you can see them.</Text></View>
    <View style={s.composer}>
      <Text style={s.heading}>Write a prayer</Text>
      <Text style={s.composerHint}>You can come back to this prayer after you save it.</Text>
      <Field label="Your prayer" value={text} onChangeText={value => { setText(value); setMessage(''); setError(''); }} multiline maxLength={3000} placeholder="Write your prayer here…" style={s.writing} editable={!saving} />
      <Text style={s.count}>{text.length.toLocaleString()} / 3,000 characters</Text>
      <ActionButton title="Save prayer" onPress={save} loading={saving} icon="plus" />
    </View>
    {!!error && <Notice text={error} error />}
    {!!message && <Notice text={message} success />}
    <View style={s.sectionHeader}><Text style={s.section}>Your prayers</Text>{!loading && !loadError && <Text style={s.total}>{visible.length}{visible.length === 100 ? '+' : ''}</Text>}</View>
    {loading ? <View style={s.loading}><ActivityIndicator color={c.action} /><Text style={s.loadingText}>Loading your prayers…</Text></View> : loadError ? <View><Notice text={loadError} error /><ActionButton title="Try again" onPress={() => setRevision(value => value + 1)} variant="secondary" icon="refresh" /></View> : !visible.length ? <View style={s.empty}>
      <Icon name="heart" size={22} color={c.muted} /><Text style={s.emptyTitle}>No saved prayers yet</Text><Text style={s.emptyText}>Save your first prayer using the space above.</Text>
    </View> : visible.map(prayer => <View key={prayer.id} style={s.prayerRow}>
      <View style={s.status}><Icon name={prayer.answered ? 'checkCircle' : 'heart'} size={16} color={prayer.answered ? c.success : c.action} /><Text style={[s.statusText, prayer.answered && s.answered]}>{prayer.answered ? 'Answered' : 'Praying'}</Text></View>
      <Text selectable style={s.prayer}>{prayer.text}</Text>
      <ActionButton title={prayer.answered ? 'Keep praying' : 'Mark as answered'} onPress={() => toggle(prayer)} variant="ghost" icon={prayer.answered ? 'heart' : 'check'} loading={updating === prayer.id} disabled={!!updating && updating !== prayer.id} />
    </View>)}
  </View>;
}

const styles=(c:Colors)=>StyleSheet.create({
  screen: { gap: spacing[8] },
  guest: { paddingVertical: spacing[16] },
  iconTile: { width: 56, height: 56, backgroundColor: c.tint, borderRadius: radius, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[24] },
  heading: { ...typography.section, color: c.ink },
  intro: { ...typography.body, color: c.muted, marginTop: spacing[12] },
  guestAction: { marginTop: spacing[24], marginBottom: spacing[16] },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[8], marginBottom: spacing[16] },
  privacyText: { ...typography.meta, color: c.muted, flex: 1 },
  composer: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius, padding: spacing[20] },
  composerHint: { ...typography.body, color: c.muted, marginTop: spacing[8], marginBottom: spacing[24] },
  writing: { minHeight: 160, lineHeight: 25 },
  count: { ...typography.meta, color: c.muted, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[12], marginTop: spacing[24], marginBottom: spacing[8] },
  section: { ...typography.section, color: c.ink, flexShrink: 1 },
  total: { ...typography.meta, fontWeight: '600', color: c.muted },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing[12], paddingVertical: spacing[24] },
  loadingText: { ...typography.meta, color: c.muted },
  empty: { borderTopWidth: 1, borderColor: c.border, paddingVertical: spacing[24], gap: spacing[8] },
  emptyTitle: { ...typography.label, color: c.ink, marginTop: spacing[4] },
  emptyText: { ...typography.body, color: c.muted },
  prayerRow: { borderTopWidth: 1, borderColor: c.border, paddingTop: spacing[24], paddingBottom: spacing[16] },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing[8], marginBottom: spacing[12] },
  statusText: { ...typography.meta, fontWeight: '600', color: c.action },
  answered: { color: c.success },
  prayer: { ...typography.body, color: c.ink, lineHeight: 26, marginBottom: spacing[8] },
});
