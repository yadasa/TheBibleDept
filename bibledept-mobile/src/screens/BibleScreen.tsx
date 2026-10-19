import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Field, Notice } from '../components/ui';
import { ReaderControls } from '../components/ReaderControls';
import { PassageView } from '../components/PassageView';
import { useScreenScroll } from '../components/ScreenScrollView';
import { fetchPassage, Passage, Translation } from '../services/bible';
import { useThemedStyles, Colors, typography as t } from '../theme';
import * as Clipboard from 'expo-clipboard';
import { passageLink } from '../services/links';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ExpoLinking from 'expo-linking';
import { ReadingCompletion } from '../components/ReadingCompletion';
import { messageForUser } from '../services/userMessage';

export function BibleScreen({ initialReference = 'Luke 1', initialTranslation = 'web', requestRevision = 0, onPassageLoaded, onAccount }: { initialReference?: string; initialTranslation?: Translation; requestRevision?: number; onPassageLoaded?: (passage: Passage) => void; onAccount: () => void }) {
  const {c,s}=useThemedStyles(styles);
  const scrollTop=useScreenScroll();
  const [draft,setDraft]=useState(initialReference),[reference,setReference]=useState(initialReference);
  const [translation,setTranslation]=useState<Translation>(initialTranslation);
  const [linkMessage,setLinkMessage]=useState(''),[passage,setPassage]=useState<Passage|null>(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  useEffect(()=>{setDraft(initialReference);setReference(initialReference);},[initialReference,requestRevision]);
  useEffect(()=>setTranslation(initialTranslation),[initialTranslation,requestRevision]);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError('');setPassage(null);setLinkMessage('');
    fetchPassage(reference,translation,controller.signal).then(result=>{
      if(controller.signal.aborted)return;
      setPassage(result);onPassageLoaded?.(result);
    }).catch(e=>{if(!controller.signal.aborted)setError(messageForUser(e,'We couldn’t open this passage. Please try again.'));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[reference,translation,retry]);
  function read(){Keyboard.dismiss();scrollTop();if(draft.trim()===reference)setRetry(v=>v+1);else setReference(draft.trim());}
  return <View>
    <Text style={s.intro}>Open a chapter or a specific verse.</Text>
    <Field label="Bible passage" value={draft} onChangeText={setDraft} placeholder="Luke 1 or John 3:16" returnKeyType="search" onSubmitEditing={read} autoCorrect={false}/>
    <ActionButton title="Read passage" icon="search" onPress={read} loading={loading}/>
    <ReaderControls translation={translation} onTranslation={setTranslation}/>
    {loading&&<View style={s.loading}><ActivityIndicator color={c.action}/><Notice text="Loading passage…"/></View>}
    {!!error&&<View style={s.error}><Text style={s.errorTitle}>We couldn’t load this passage</Text><Notice text={error} error/><ActionButton title="Try again" icon="refresh" onPress={()=>setRetry(v=>v+1)} secondary/></View>}
    {passage&&<View>
      <PassageView key={`${passage.reference}:${translation}`} passage={passage} onAccount={onAccount}/>
      <ReadingCompletion passage={passage} source="reader" onAccount={onAccount}/>
      <View style={s.actions}>
        <ActionButton title="Copy passage link" variant="ghost" onPress={()=>{
          const url=Constants.executionEnvironment===ExecutionEnvironment.StoreClient
            ?ExpoLinking.createURL('read',{queryParams:{ref:passage.reference,translation}})
            :passageLink(passage.reference,translation);
          Clipboard.setStringAsync(url).then(copied=>setLinkMessage(copied?'Passage link copied.':'We couldn’t copy the link. Try again.')).catch(()=>setLinkMessage('We couldn’t copy the link. Try again.'));
        }}/>
        {!!linkMessage&&<Notice text={linkMessage}/>}
      </View>
      <Text style={s.credit}>Public-domain Scripture.</Text>
    </View>}
    <Notice text="You’ll need an internet connection to load a passage."/>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({intro:{...t.body,color:c.muted,marginBottom:20},loading:{alignItems:'center',paddingVertical:48},error:{paddingVertical:24},errorTitle:{...t.section,color:c.ink},actions:{borderTopWidth:1,borderColor:c.border,paddingTop:16,marginTop:16},credit:{...t.meta,color:c.muted,marginTop:12}});
