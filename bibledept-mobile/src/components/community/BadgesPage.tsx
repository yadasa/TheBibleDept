import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ACHIEVEMENTS, Achievement, achievementProgress } from '../../../shared/community';
import { useCommunity } from '../../services/CommunityProvider';
import { messageForUser } from '../../services/userMessage';
import { typography as t, useTheme } from '../../theme';
import { AccountPage } from '../account/AccountPage';
import { ActionButton, Notice } from '../ui';
import { BadgeArt } from './BadgeArt';
export function BadgesPage({onBack,onRead,onCommunity}:{onBack:()=>void;onRead?:()=>void;onCommunity?:()=>void}) {
  const community=useCommunity(),{colors:c}=useTheme();
  const [filter,setFilter]=useState<'All'|'Earned'|'To discover'>('All'),[selected,setSelected]=useState<Achievement|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const earned=new Set(community.earned.map(a=>a.id)),list=ACHIEVEMENTS.filter(a=>filter==='All'||(filter==='Earned'?earned.has(a.id):!earned.has(a.id)));
  const club=ACHIEVEMENTS.find(a=>a.symbol==='club')!,clubEarned=earned.has(club.id);
  async function refresh(){if(busy)return;setBusy(true);setError('');try{await community.perform('refreshAchievements',{});}catch(e){setError(messageForUser(e,'Your achievements couldn’t refresh.'));}finally{setBusy(false);}}
  return <AccountPage title="Your badge collection" intro="Small steps worth celebrating. Tap any badge to see how to earn it." onBack={onBack}>
    <View style={{flexDirection:'row',alignItems:'center',gap:18,padding:20,backgroundColor:c.tint,borderRadius:22,marginBottom:24}}><BadgeArt size={88} locked={!clubEarned}/><View style={{flex:1}}><Text style={{...t.section,color:c.ink}}>The 6% Club</Text><Text style={{...t.meta,color:c.muted,marginTop:6}}>{clubEarned?'You finished the journey. Your emblem is on your profile.':'A whole journey, one day at a time.'}</Text><Text style={{...t.label,color:c.ink,marginTop:10}}>{clubEarned?365:achievementProgress(club,community.metrics)} / 365 days</Text></View></View>
    <Text style={{...t.section,color:c.ink}}>{earned.size} of {ACHIEVEMENTS.length} earned</Text>
    <View accessibilityRole="tablist" style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginVertical:20}}>{(['All','Earned','To discover'] as const).map(value=><Pressable key={value} accessibilityRole="tab" aria-selected={value===filter} accessibilityState={{selected:value===filter}} onPress={()=>setFilter(value)} style={{minHeight:44,borderRadius:22,paddingVertical:12,paddingHorizontal:18,backgroundColor:value===filter?c.orange:c.surface}}><Text style={{...t.label,color:value===filter?c.onOrange:c.ink}}>{value}</Text></Pressable>)}</View>
    {!list.length&&<Notice text={filter==='To discover'?'You’ve earned every badge in this collection. Keep growing, one day at a time.':'Your first badge is waiting. Complete a reading day or save a reflection to begin.'}/>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{list.map(badge=>{
      const isEarned=earned.has(badge.id),progress=isEarned?badge.target:achievementProgress(badge,community.metrics);
      return <Pressable key={badge.id} accessibilityRole="button" accessibilityLabel={`${badge.name}, ${isEarned?'earned':`${progress} of ${badge.target}`}. View requirements`} onPress={()=>setSelected(badge)} style={({pressed})=>({width:'47%',flexGrow:1,minWidth:130,maxWidth:'49%',padding:18,borderRadius:20,backgroundColor:c.surface,alignItems:'center',gap:10,opacity:pressed?.65:1})}>
        <BadgeArt symbol={badge.symbol} size={76} locked={!isEarned}/><Text style={{...t.label,color:c.ink,textAlign:'center'}}>{badge.name}</Text><Text style={{...t.meta,color:isEarned?c.success:c.muted}}>{isEarned?'Earned':`${progress} / ${badge.target}`}</Text>
        <View style={{height:3,width:'100%',backgroundColor:c.border,borderRadius:2,overflow:'hidden'}}><View style={{width:`${progress/badge.target*100}%`,height:3,backgroundColor:isEarned?c.success:c.orange}}/></View>
      </Pressable>;
    })}</View>
    {!!error&&<Notice error text={error}/>}<ActionButton title="Refresh achievements" secondary icon="refresh" loading={busy} onPress={()=>void refresh()}/>
    <Notice text="Journey badges follow your saved completed plan days. Reading streak badges follow your confirmed reading history. Earned badges stay in your collection."/>
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={()=>setSelected(null)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,.75)',justifyContent:'center',padding:24}}><ScrollView style={{maxHeight:'90%',width:'100%',maxWidth:480,alignSelf:'center'}} contentContainerStyle={{padding:28,borderRadius:24,backgroundColor:c.surface}}>
        {selected&&<><View style={{alignItems:'center'}}><BadgeArt symbol={selected.symbol} size={132} locked={!earned.has(selected.id)}/><Text style={{...t.meta,color:c.muted,marginTop:16}}>{selected.family.toUpperCase()}</Text><Text accessibilityRole="header" style={{...t.title,color:c.ink,textAlign:'center',marginTop:8}}>{selected.name}</Text><Text style={{...t.body,color:c.muted,textAlign:'center',marginVertical:18}}>{selected.description}</Text><Text style={{...t.label,color:c.ink}}>{earned.has(selected.id)?'Earned':`${achievementProgress(selected,community.metrics)} / ${selected.target}`}</Text></View>
        {earned.has(selected.id)&&community.earned.find(a=>a.id===selected.id)?.earnedAt&&<Notice success text={`Earned ${new Date(community.earned.find(a=>a.id===selected.id)!.earnedAt!.toMillis()).toLocaleDateString()}`}/>}
        {!earned.has(selected.id)&&(selected.family==='Community'?onCommunity:onRead)&&<ActionButton title={selected.family==='Community'?'Open community':'Keep reading'} icon="arrowRight" onPress={()=>{const action=selected.family==='Community'?onCommunity:onRead;setSelected(null);action?.();}}/>}
        <ActionButton title="Close badge details" secondary onPress={()=>setSelected(null)}/></>}
      </ScrollView></View>
    </Modal>
  </AccountPage>;
}
