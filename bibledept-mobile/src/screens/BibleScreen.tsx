import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Field, Notice } from '../components/ui';
import { fetchPassage, Passage, Translation } from '../services/bible';
import { theme as c } from '../theme';
import { useAuth } from '../services/AuthProvider';
import { useReadings } from '../services/ReadingProvider';
import { readingDay } from '../services/readingDays';
import * as Clipboard from 'expo-clipboard';
import { passageLink } from '../services/links';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ExpoLinking from 'expo-linking';

export function BibleScreen({ initialReference = 'Luke 1', initialTranslation = 'web', onPassageLoaded, onAccount }: { initialReference?: string; initialTranslation?: Translation; onPassageLoaded?: (passage: Passage) => void; onAccount: () => void }) {
  const {user}=useAuth();const {readings,complete}=useReadings();
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  const [draft, setDraft] = useState(initialReference);
  const [reference, setReference] = useState(initialReference);
  const [translation, setTranslation] = useState<Translation>(initialTranslation);
  const [linkMessage,setLinkMessage]=useState('');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setDraft(initialReference); setReference(initialReference); }, [initialReference]);
  useEffect(() => { setTranslation(initialTranslation); }, [initialTranslation]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setPassage(null); setLinkMessage('');
    fetchPassage(reference, translation, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setPassage(result); onPassageLoaded?.(result);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message || 'Unable to load this passage.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reference, translation, retry]);
  function read() { if (draft.trim() === reference) setRetry(v => v + 1); else setReference(draft.trim()); }
  return <View>
    <Field label="Passage" value={draft} onChangeText={setDraft} placeholder="Luke 1 or John 3:16" returnKeyType="search" onSubmitEditing={read} autoCorrect={false} />
    <View style={s.options}>{(['web', 'kjv'] as const).map(t => <Pressable key={t} accessibilityRole="radio" accessibilityState={{ checked: t === translation }} onPress={() => setTranslation(t)} style={[s.option, t === translation && s.selected]}><Text style={[s.optionText, t === translation && s.selectedText]}>{t === 'web' ? 'World English Bible' : 'King James Version'}</Text></Pressable>)}</View>
    <ActionButton title="Read passage" onPress={read} loading={loading} />
    {loading && <View style={s.loading}><ActivityIndicator color={c.action} /><Notice text="Opening Scripture…" /></View>}
    {!!error && <View><Notice text={error} error /><ActionButton title="Try again" onPress={() => setRetry(v => v + 1)} secondary /></View>}
    {passage && <View style={s.paper}>
      <Text style={s.reference}>{passage.reference}</Text><Text style={s.translation}>{passage.translation_name}</Text>
      {passage.verses.map(v => <Text key={`${v.book_id}.${v.chapter}.${v.verse}`} style={s.verse}><Text style={s.number}>{v.verse}  </Text>{v.text.trim()}</Text>)}
      {user?<ActionButton title="Mark today's reading complete" loading={saving} onPress={()=>{setSaving(true);setSaveError('');complete(passage).catch(()=>setSaveError('Could not save your progress. Check your connection and retry.')).finally(()=>setSaving(false));}}/>:<ActionButton title="Sign in to save progress" onPress={onAccount}/>}
      {readings.some(r=>r.day===readingDay()&&r.reference===passage.reference)&&<Notice text="Reading saved for today."/>}
      {!!saveError&&<Notice text={saveError} error/>}
      <ActionButton title="Copy passage link" secondary onPress={()=>{
        const url=Constants.executionEnvironment===ExecutionEnvironment.StoreClient
          ?ExpoLinking.createURL('read',{queryParams:{ref:passage.reference,translation}})
          :passageLink(passage.reference,translation);
        Clipboard.setStringAsync(url).then(copied=>setLinkMessage(copied?'Passage link copied.':'Copying is unavailable in this browser.')).catch(()=>setLinkMessage('Could not copy the link. Please retry.'));
      }}/>
      {!!linkMessage&&<Notice text={linkMessage}/>}
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://bible-api.com/')}><Text style={s.credit}>Public-domain translation · Online via bible-api.com</Text></Pressable>
    </View>}
    <Notice text="Reading is free. An internet connection is required; offline downloads will come later." />
  </View>;
}
const s = StyleSheet.create({ options: { flexDirection: 'row', gap: 8 }, option: { flex: 1, minHeight: 45, padding: 10, borderWidth: 1, borderColor: c.border, borderRadius: 4, justifyContent: 'center' }, selected: { backgroundColor: c.tint, borderColor: c.action }, optionText: { fontSize: 12, color: c.muted, textAlign: 'center', fontWeight: '600' }, selectedText: { color: c.action }, loading: { alignItems: 'center', paddingVertical: 35 }, paper: { backgroundColor: c.surface, padding: 22, marginTop: 26, borderWidth: 1, borderColor: c.border, borderRadius: 4 }, reference: { fontSize: 28, fontWeight: '800', letterSpacing: -1, color: c.ink }, translation: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: c.action, marginTop: 8, marginBottom: 25 }, verse: { fontSize: 18, lineHeight: 32, color: c.ink, marginBottom: 13 }, number: { fontSize: 12, fontWeight: '800', color: c.action }, credit: { fontSize: 11, lineHeight: 18, color: c.muted, marginTop: 20 } });
