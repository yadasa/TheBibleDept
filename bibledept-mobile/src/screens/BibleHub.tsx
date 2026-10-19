import { GlassPressable as Pressable } from "../components/Glass";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { BibleScreen } from './BibleScreen';
import { PlanScreen } from './PlanScreen';
import { Icon } from '../components/Icon';
import { useScreenScroll } from '../components/ScreenScrollView';
import { useThemedStyles, Colors } from '../theme';
import type { Translation } from '../services/bible';

type Mode='plan'|'search';
export function BibleHub({initialReference,initialTranslation,onAccount,active=true,requestRevision=0,podcastRequestRevision=0}:{initialReference?:string;initialTranslation?:Translation;onAccount:()=>void;active?:boolean;requestRevision?:number;podcastRequestRevision?:number}) {
  const {c,s}=useThemedStyles(styles);
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const [mode,setMode]=useState<Mode>(initialReference?'search':'plan');
  const [visited,setVisited]=useState<Mode[]>([initialReference?'search':'plan']);
  const [searchRequest,setSearchRequest]=useState({reference:initialReference||'Luke 1',translation:initialTranslation,revision:requestRevision});
  const scrollTop=useScreenScroll();
  const lastPodcastRequest=useRef(0);
  const chooseMode=useCallback((value:Mode,resetScroll=true)=>{
    Keyboard.dismiss();setVisited(items=>items.includes(value)?items:[...items,value]);setMode(value);if(resetScroll)scrollTop();
  },[scrollTop]);
  useEffect(()=>{
    // A Home command opens the plan without clearing a passage or draft in
    // the visited Search panel. Explicit passage links replace that request.
    if(initialReference)setSearchRequest({reference:initialReference,translation:initialTranslation,revision:requestRevision});
    const openingPodcast=podcastRequestRevision>0&&lastPodcastRequest.current!==podcastRequestRevision;
    lastPodcastRequest.current=podcastRequestRevision;
    chooseMode(initialReference?'search':'plan',!openingPodcast);
  },[initialReference,initialTranslation,requestRevision,podcastRequestRevision,chooseMode]);
  return <View style={s.container}>
    <View testID="bible-view-switcher" accessibilityRole="tablist" accessibilityLabel="Bible views" style={s.modes}>
      {(['plan','search'] as const).map(value=>{
        const selected=mode===value;
        return <Pressable key={value} nativeID={`bible-${id}-tab-${value}`}
          accessibilityRole="tab" accessibilityLabel={value==='plan'?'Reading plan':'Search passages'}
          aria-selected={selected} aria-controls={`bible-${id}-panel-${value}`}
          accessibilityState={{selected}} tone={selected?'primary':'subtle'}
          onPress={()=>chooseMode(value)} style={({pressed})=>[s.mode,pressed&&s.pressed]}>
          <Icon name={value==='plan'?'book':'search'} size={18} color={selected?c.onOrange:c.muted}/>
          <Text numberOfLines={1} style={[s.text,selected&&s.activeText]}>{value==='plan'?'Reading plan':'Search'}</Text>
        </Pressable>;
      })}
    </View>
    {(['plan','search'] as const).map(value=>{
      const showing=mode===value,mounted=visited.includes(value)||showing;
      return <View key={value} nativeID={`bible-${id}-panel-${value}`} role="tabpanel"
        aria-labelledby={`bible-${id}-tab-${value}`} aria-hidden={!active||!showing}
        {...(Platform.OS==='web'?{inert:!active||!showing}:{})}
        style={!showing&&s.hidden} accessibilityElementsHidden={!active||!showing} importantForAccessibility={active&&showing?'auto':'no-hide-descendants'}>
        {mounted&&(value==='plan'?<PlanScreen active={active&&showing} onAccount={onAccount} podcastRequestRevision={podcastRequestRevision}/>:<BibleScreen initialReference={searchRequest.reference} initialTranslation={searchRequest.translation} requestRevision={searchRequest.revision} onAccount={onAccount}/>)}
      </View>;
    })}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  container:{minWidth:0,width:'100%'},
  hidden:{display:'none'},
  modes:{width:'100%',minWidth:0,flexDirection:'row',gap:4,padding:4,borderRadius:18,backgroundColor:c.surface,overflow:'hidden',marginBottom:24},
  mode:{flex:1,minWidth:0,minHeight:48,paddingHorizontal:8,paddingVertical:12,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center',borderRadius:14},
  text:{fontSize:15,lineHeight:22,fontWeight:'500',color:c.muted,flexShrink:1,textAlign:'center'},
  activeText:{color:c.onOrange,fontWeight:'700'},
  pressed:{transform:[{scale:.985}]},
});
