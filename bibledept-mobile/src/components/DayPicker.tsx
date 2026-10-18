import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReadingPlanDay } from '../services/readingPlan';
import { theme as c } from '../theme';
import { ActionButton, Field, Notice } from './ui';

type Props={visible:boolean;selectedDay:number;currentDay:number;finished:boolean;onSelect:(day:number)=>void;onClose:()=>void};
export function DayPicker({visible,selectedDay,currentDay,finished,onSelect,onClose}:Props) {
  const [page,setPage]=useState(0),[draft,setDraft]=useState(''),[error,setError]=useState('');
  useEffect(()=>{if(visible){setPage(Math.floor((selectedDay-1)/30));setDraft('');setError('');}},[visible,selectedDay]);
  const first=page*30+1,last=Math.min(first+29,365);
  function select(day:number){Keyboard.dismiss();onSelect(day);onClose();}
  function jump(){const day=Number(draft);if(!/^\d+$/.test(draft)||!getReadingPlanDay(day)){setError('Choose a day from 1 to 365.');return;}select(day);}
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS==='ios'?'padding':undefined}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss day picker" onPress={onClose}/>
      <SafeAreaView edges={['bottom']} style={s.sheet} accessibilityViewIsModal>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <View style={s.row}><View><Text style={s.kicker}>365 DAYS. YOUR PACE.</Text><Text style={s.title}>Choose a day.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close day picker" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
          <View style={s.legend}><View style={s.dot}/><Text style={s.legendText}>Your spot: Day {currentDay}{finished?' · Plan complete':''}</Text></View>
          <View style={s.paging}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous 30 days" disabled={page===0} onPress={()=>setPage(value=>value-1)} style={[s.arrow,page===0&&s.disabled]}><Text style={s.arrowText}>←</Text></Pressable>
            <Text style={s.range}>DAYS {first}–{last}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next 30 days" disabled={last===365} onPress={()=>setPage(value=>value+1)} style={[s.arrow,last===365&&s.disabled]}><Text style={s.arrowText}>→</Text></Pressable>
          </View>
          <View style={s.grid}>{Array.from({length:last-first+1},(_,i)=>first+i).map(day=>{
            const current=day===currentDay,selected=day===selectedDay,done=day<currentDay||finished;
            return <View key={day} style={s.cell}><Pressable accessibilityRole="button" accessibilityLabel={`Day ${day}, ${getReadingPlanDay(day)!.label}${current?', your current day':''}${done?', completed':''}`} accessibilityState={{selected}} onPress={()=>select(day)} style={[s.day,done&&s.done,selected&&s.selected,current&&s.current]}><Text style={[s.dayText,current&&s.currentText]}>{day}</Text>{done&&<Text style={s.check}>✓</Text>}</Pressable></View>;
          })}</View>
          <View style={s.jump}><View style={s.input}><Field label="Jump to day (1–365)" value={draft} onChangeText={value=>{setDraft(value.replace(/\D/g,'').slice(0,3));setError('');}} keyboardType="number-pad" returnKeyType="go" onSubmitEditing={jump} placeholder="e.g. 54" maxLength={3}/></View><View style={s.go}><ActionButton title="Go" onPress={jump}/></View></View>
          {!!error&&<Notice text={error} error/>}
          <Notice text="Explore any day. Your saved spot changes only when you continue from your current day."/>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
const s=StyleSheet.create({overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(10,10,9,0.6)'},sheet:{backgroundColor:c.background,borderTopLeftRadius:20,borderTopRightRadius:20,maxHeight:'92%'},content:{padding:22},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},kicker:{fontSize:9,letterSpacing:1.5,fontWeight:'900',color:c.action,marginBottom:8},title:{fontSize:29,fontWeight:'900',letterSpacing:-1,color:c.ink},close:{width:44,height:44,borderRadius:22,backgroundColor:c.surface,alignItems:'center',justifyContent:'center'},closeText:{fontSize:28,color:c.ink},legend:{flexDirection:'row',alignItems:'center',gap:8,marginTop:20},dot:{width:10,height:10,borderRadius:5,backgroundColor:c.orange},legendText:{fontSize:12,color:c.muted,fontWeight:'600'},paging:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:20,marginBottom:10},arrow:{height:44,width:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.border,borderRadius:4,backgroundColor:c.surface},arrowText:{fontSize:20,fontWeight:'700',color:c.action},range:{fontSize:11,fontWeight:'800',letterSpacing:1,color:c.ink},disabled:{opacity:.3},grid:{flexDirection:'row',flexWrap:'wrap',marginHorizontal:-3},cell:{width:'14.285714%',padding:3},day:{height:44,borderWidth:1,borderColor:c.border,borderRadius:5,alignItems:'center',justifyContent:'center',backgroundColor:c.surface},dayText:{fontSize:14,fontWeight:'700',color:c.ink},selected:{borderColor:c.ink,borderWidth:2},current:{backgroundColor:c.orange,borderColor:c.orange,borderWidth:2},currentText:{fontWeight:'900'},done:{backgroundColor:c.tint},check:{position:'absolute',right:2,top:0,fontSize:9,color:c.action,fontWeight:'900'},jump:{flexDirection:'row',alignItems:'center',gap:12,marginTop:22},input:{flex:1},go:{width:64,marginBottom:5}});
