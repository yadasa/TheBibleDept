import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message||'Unable to load this passage.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[reference,translation,retry]);
  function read(){Keyboard.dismiss();scrollTop();if(draft.trim()===reference)setRetry(v=>v+1);else setReference(draft.trim());}
  return <View>
    <Text style={s.intro}>Open a chapter or a specific verse.</Text>
    <Field label="Bible passage" value={draft} onChangeText={setDraft} placeholder="Luke 1 or John 3:16" returnKeyType="search" onSubmitEditing={read} autoCorrect={false}/>
    <ActionButton title="Read passage" icon="search" onPress={read} loading={loading}/>
    <ReaderControls translation={translation} onTranslation={setTranslation}/>
    {loading&&<View style={s.loading}><ActivityIndicator color={c.action}/><Notice text="Opening Scripture…"/></View>}
    {!!error&&<View style={s.error}><Text style={s.errorTitle}>This passage couldn't load</Text><Notice text={error} error/><ActionButton title="Try again" icon="refresh" onPress={()=>setRetry(v=>v+1)} secondary/></View>}
    {passage&&<View>
      <PassageView key={`${passage.reference}:${translation}`} passage={passage}/>
      <ReadingCompletion passage={passage} source="reader" onAccount={onAccount}/>
      <View style={s.actions}>
        <ActionButton title="Copy passage link" variant="ghost" onPress={()=>{
          const url=Constants.executionEnvironment===ExecutionEnvironment.StoreClient
            ?ExpoLinking.createURL('read',{queryParams:{ref:passage.reference,translation}})
            :passageLink(passage.reference,translation);
          Clipboard.setStringAsync(url).then(copied=>setLinkMessage(copied?'Passage link copied.':'Copying is unavailable in this browser.')).catch(()=>setLinkMessage('Could not copy the link. Please retry.'));
        }}/>
        {!!linkMessage&&<Notice text={linkMessage}/>}
      </View>
      <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('https://bible-api.com/')} style={s.creditLink}><Text style={s.credit}>Public-domain Scripture via bible-api.com.</Text></Pressable>
    </View>}
    <Notice text="Connect to the internet to load a passage. Reading is always free."/>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({intro:{...t.body,color:c.muted,marginBottom:20},loading:{alignItems:'center',paddingVertical:48},error:{paddingVertical:24},errorTitle:{...t.section,color:c.ink},actions:{borderTopWidth:1,borderColor:c.border,paddingTop:16,marginTop:16},creditLink:{minHeight:44,justifyContent:'center',paddingVertical:12},credit:{...t.meta,color:c.muted,textDecorationLine:'underline'}});
