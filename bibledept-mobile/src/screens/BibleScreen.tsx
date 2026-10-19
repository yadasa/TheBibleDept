import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Notice } from '../components/ui';
import { ReaderControls, useReadingText } from '../components/ReaderControls';
import { SelectField } from '../components/SelectField';
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
import { READING_PLAN_BOOKS } from '../services/readingPlan';
import { referenceSelection, selectPassageVerses, verseChoices } from '../services/passagePicker';

export function BibleScreen({ initialReference = 'Luke 1', initialTranslation, requestRevision = 0, onPassageLoaded, onAccount }: { initialReference?: string; initialTranslation?: Translation; requestRevision?: number; onPassageLoaded?: (passage: Passage) => void; onAccount: () => void }) {
  const {c,s}=useThemedStyles(styles);
  const scrollTop=useScreenScroll();
  const {preferredTranslation:translation,setPreferredTranslation:setTranslation}=useReadingText();
  const [selection,setSelection]=useState(()=>referenceSelection(initialReference));
  const book=READING_PLAN_BOOKS.find(item=>item.bookId===selection.bookId)!;
  const reference=`${book.name} ${selection.chapter}`;
  const [linkMessage,setLinkMessage]=useState(''),[chapterPassage,setChapterPassage]=useState<Passage|null>(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  useEffect(()=>{setSelection(referenceSelection(initialReference));},[initialReference,requestRevision]);
  useEffect(()=>{if(initialTranslation)setTranslation(initialTranslation);},[initialTranslation,requestRevision]);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError('');setChapterPassage(null);setLinkMessage('');
    fetchPassage(reference,translation,controller.signal).then(result=>{
      if(controller.signal.aborted)return;
      setChapterPassage(result);onPassageLoaded?.(result);
    }).catch(e=>{if(!controller.signal.aborted)setError(messageForUser(e,'We couldn’t open this passage. Please try again.'));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[reference,translation,retry]);
  const passage=chapterPassage?selectPassageVerses(chapterPassage,selection.verse):null;
  const choices=verseChoices(chapterPassage);
  if(selection.verse.includes('-')&&passage?.reference.includes(':'))choices.push({value:selection.verse,label:`Verses ${selection.verse}`});
  const selectedVerse=choices.some(option=>option.value===selection.verse)?selection.verse:'all';
  function choose(next:typeof selection){Keyboard.dismiss();setSelection(next);setLinkMessage('');scrollTop();}
  return <View>
    <View style={s.pickers}>
      <View style={s.bookPicker}><SelectField label="Book" value={selection.bookId} options={READING_PLAN_BOOKS.map(item=>({value:item.bookId,label:item.name}))} onChange={bookId=>choose({bookId,chapter:1,verse:'all'})}/></View>
      <View style={s.chapterPicker}><SelectField label="Chapter" value={String(selection.chapter)} options={Array.from({length:book.chapterCount},(_,index)=>({value:String(index+1),label:String(index+1)}))} onChange={chapter=>choose({...selection,chapter:Number(chapter),verse:'all'})}/></View>
      <View style={s.versePicker}><SelectField label="Verse" value={selectedVerse} options={choices} disabled={!chapterPassage||loading} onChange={verse=>choose({...selection,verse})}/></View>
    </View>
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
    </View>}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({pickers:{flexDirection:'row',flexWrap:'wrap',gap:12},bookPicker:{width:'100%'},chapterPicker:{flex:1,minWidth:80},versePicker:{flex:2,minWidth:150},loading:{alignItems:'center',paddingVertical:48},error:{paddingVertical:24},errorTitle:{...t.section,color:c.ink},actions:{paddingTop:16,marginTop:16}});
