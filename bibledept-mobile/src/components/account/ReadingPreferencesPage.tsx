import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useHabit } from '../../services/HabitProvider';
import type { Translation } from '../../services/bible';
import { Colors, typography as t, useThemedStyles } from '../../theme';
import { useReadingText } from '../ReaderControls';
import { SelectField } from '../SelectField';
import { ActionButton, IconButton, Notice } from '../ui';
import { AccountPage } from './AccountPage';

const fallbackZones=['Pacific/Honolulu','America/Anchorage','America/Los_Angeles','America/Denver','America/Chicago','America/New_York','America/Sao_Paulo','Europe/London','Europe/Paris','Africa/Lagos','Africa/Johannesburg','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney','Pacific/Auckland','UTC'];
function timeZones(current:string) {
  let available=fallbackZones;
  try {if(typeof Intl.supportedValuesOf==='function')available=Intl.supportedValuesOf('timeZone');}catch{}
  return [...new Set([current,...available,'UTC'])].map(value=>({value,label:value==='UTC'?'Coordinated Universal Time (UTC)':value.split('/').slice(1).join(' / ').replace(/_/g,' ')||value,detail:value===current?'Your current time zone':value.split('/')[0]}));
}

export function ReadingPreferencesPage({onBack}:{onBack:()=>void}) {
  const {fontSize,setFontSize,preferredTranslation,setPreferredTranslation,error}=useReadingText(),habit=useHabit(),{c,s}=useThemedStyles(styles);
  const [deviceZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'),[zone,setZone]=useState(deviceZone),[zones]=useState(()=>timeZones(deviceZone));
  return <AccountPage title="Reading preferences" intro="Make the text comfortable to read and choose your usual Bible translation." onBack={onBack} backLabel="Back to preferences">
    <SelectField label="Usual translation" value={preferredTranslation} options={[{value:'web',label:'World English Bible',detail:'WEB'},{value:'kjv',label:'King James Version',detail:'KJV'}]} onChange={value=>setPreferredTranslation(value as Translation)}/>
    <View style={s.section}><Text style={s.heading}>Text size</Text><View style={s.sizeRow}><Text style={s.body}>Choose a comfortable size.</Text><IconButton name="minus" label="Decrease reading text size" disabled={fontSize<=18} onPress={()=>setFontSize(fontSize-2)}/><IconButton name="plus" label="Increase reading text size" disabled={fontSize>=28} onPress={()=>setFontSize(fontSize+2)}/></View>
      <View style={s.preview}><Text style={{fontSize,lineHeight:fontSize*1.55,color:c.ink}}>In the beginning, God created the heavens and the earth.</Text><Text style={s.previewReference}>Genesis 1:1 · WEB</Text></View>
    </View>
    {!!error&&<Notice text={error} error/>}
    <View style={s.section}><Text style={s.heading}>Reading days</Text>
      {habit.loading?<View style={s.loading}><ActivityIndicator color={c.orange}/><Text style={s.body}>Loading your reading preferences…</Text></View>:habit.ready?<Notice text={`Your reading days use ${habit.zone?.replace(/_/g,' ')} time. This stays the same when you travel. Finish a whole chapter to count a reading day.`}/>:<>
        <Notice text="Choose the time zone used for your reading days and reminders. Once you confirm it, it stays the same when you travel. Your past reading dates will stay as they are."/>
        <SelectField label="Reading time zone" value={zone} options={zones} onChange={setZone} disabled={habit.busy}/>
        <ActionButton title="Confirm reading time zone" icon="check" loading={habit.busy} onPress={()=>void habit.configure(zone).catch(()=>{})}/>
      </>}
      {!!habit.error&&<Notice text={habit.error} error/>}
    </View>
  </AccountPage>;
}
const styles=(c:Colors)=>StyleSheet.create({section:{marginTop:28,paddingTop:24,borderTopWidth:1,borderColor:c.border},heading:{...t.section,color:c.ink,marginBottom:12},body:{...t.meta,color:c.muted,flex:1},sizeRow:{flexDirection:'row',alignItems:'center',gap:8},preview:{backgroundColor:c.tint,borderRadius:16,padding:20,marginTop:12},previewReference:{...t.meta,color:c.muted,marginTop:10},loading:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12}});
