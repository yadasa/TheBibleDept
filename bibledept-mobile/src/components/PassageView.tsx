import { StyleSheet, Text, View } from 'react-native';
import type { Passage } from '../services/bible';
import { useThemedStyles, Colors, typography as t } from '../theme';
import { useReadingText } from './ReaderControls';

export function PassageView({passage}:{passage:Passage}) {
  const {c,s}=useThemedStyles(styles);
  const {fontSize}=useReadingText();
  const multipleChapters=passage.verses.some(verse=>verse.chapter!==passage.verses[0].chapter);
  return <View style={s.paper}>
    <Text accessibilityRole="header" style={s.reference}>{passage.reference}</Text><Text style={s.translation}>{passage.translation_name}</Text>
    {passage.verses.map((verse,index)=><View key={`${verse.book_id}:${verse.chapter}:${verse.verse}`}>
      {multipleChapters&&(index===0||passage.verses[index-1].chapter!==verse.chapter)&&<Text style={s.chapter}>Chapter {verse.chapter}</Text>}
      <Text selectable style={[s.verse,{fontSize,lineHeight:fontSize*1.6}]}><Text style={s.number}>{verse.verse}  </Text>{verse.text.trim()}</Text>
    </View>)}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({paper:{paddingTop:8},reference:{fontSize:28,lineHeight:34,fontWeight:'700',letterSpacing:-.7,color:c.ink},translation:{...t.meta,color:c.muted,marginTop:6,marginBottom:28},chapter:{...t.label,color:c.action,marginTop:16,marginBottom:16},verse:{color:c.ink,marginBottom:16},number:{fontSize:13,fontWeight:'600',color:c.action}});
