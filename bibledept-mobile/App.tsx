import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme as c, typography as t } from './src/theme';
import { Icon, IconName } from './src/components/Icon';
import { ReadingTextProvider } from './src/components/ReaderControls';
import { ScreenScrollView } from './src/components/ScreenScrollView';
import { BibleHub } from './src/screens/BibleHub';
import { AccountScreen } from './src/screens/AccountScreen';
import { AuthProvider } from './src/services/AuthProvider';
import { ReadingProvider } from './src/services/ReadingProvider';
import { HomeScreen } from './src/screens/HomeScreen';
import { PrayerScreen } from './src/screens/PrayerScreen';
import { parseAppLink } from './src/services/links';
import type { Translation } from './src/services/bible';
import { PlanProvider } from './src/services/PlanProvider';

const tabs = ['Today', 'Bible', 'Prayer', 'Account'] as const;
type Tab = (typeof tabs)[number];
const icons:Record<(typeof tabs)[number],IconName> = {Today:'home',Bible:'book',Prayer:'heart',Account:'user'};
const titles = {Today:'Today',Bible:'Bible',Prayer:'Prayer journal',Account:'Your account'};
export default function App() {
  const [tab, setTab] = useState<Tab>('Today');
  const [reference,setReference]=useState<string>();
  const [translation,setTranslation]=useState<Translation>('web');
  const [requestRevision,setRequestRevision]=useState(0);
  useEffect(()=>{
    const open=(url:string|null)=>{
      if(!url)return;
      const route=parseAppLink(url,__DEV__);
      if(!route)return;
      if(route.tab==='Bible'){setReference(route.reference);setTranslation(route.translation);setRequestRevision(value=>value+1);}
      setTab(route.tab);
    };
    let active=true;
    Linking.getInitialURL().then(url=>{if(active)open(url);}).catch(()=>{});
    const subscription=Linking.addEventListener('url',event=>open(event.url));
    return()=>{active=false;subscription.remove();};
  },[]);
  return <SafeAreaProvider><AuthProvider><ReadingProvider><ReadingTextProvider><PlanProvider>
    <AppShell tab={tab} onNavigate={setTab} reference={reference} translation={translation} requestRevision={requestRevision} onRead={()=>{setReference(undefined);setRequestRevision(value=>value+1);setTab('Bible');}}/>
  </PlanProvider></ReadingTextProvider></ReadingProvider></AuthProvider></SafeAreaProvider>;
}

function AppShell({tab,onNavigate,reference,translation,requestRevision,onRead}:{tab:Tab;onNavigate:(value:Tab)=>void;reference?:string;translation:Translation;requestRevision:number;onRead:()=>void}) {
  // PlanProvider remounts this shell when the authenticated owner changes, so
  // retained drafts and view state never carry into another person's session.
  const [visited,setVisited]=useState<Tab[]>([tab]);
  useEffect(()=>{
    Keyboard.dismiss();
    setVisited(value=>value.includes(tab)?value:[...value,tab]);
  },[tab]);
  return <SafeAreaView style={s.safe}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={s.app} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={s.header}><View style={s.headerInner}><Text style={s.brand}>The Bible Dept.</Text><View style={s.brandRule}/></View></View>
      {tabs.filter(item=>visited.includes(item)||item===tab).map(item=>{
        const active=item===tab;
        return <View key={item} style={[s.panel,!active&&s.hidden]} accessibilityElementsHidden={!active} importantForAccessibility={active?'auto':'no-hide-descendants'}>
          <ScreenScrollView active={active} resetOnPlanDayChange={item==='Bible'} style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={s.content}>
              <Text accessibilityRole="header" style={s.heading}>{titles[item]}</Text>
              {item === 'Today' ? <HomeScreen onRead={onRead} onAccount={()=>onNavigate('Account')} onPrayer={()=>onNavigate('Prayer')}/>
                : item === 'Bible' ? <BibleHub active={active} requestRevision={requestRevision} initialReference={reference} initialTranslation={translation} onAccount={()=>onNavigate('Account')}/>
                : item === 'Account' ? <AccountScreen/>
                : <PrayerScreen onAccount={()=>onNavigate('Account')}/>}
            </View>
          </ScreenScrollView>
        </View>;
      })}
      <View style={s.nav}><View style={s.tabs}>{tabs.map(item => {
        const active=item===tab;
        return <Pressable key={item} accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{selected:active}} onPress={()=>onNavigate(item)} style={({pressed})=>[s.tab,pressed&&s.pressed]}>
          <View style={[s.tabIcon,active&&s.activeIcon]}><Icon name={icons[item]} size={22} color={active?c.action:c.muted}/></View>
          <Text style={[s.tabLabel,active&&s.activeLabel]}>{item}</Text>
        </Pressable>;
      })}</View></View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:c.background},app:{flex:1},panel:{flex:1},hidden:{display:'none'},
  header:{borderBottomWidth:1,borderBottomColor:c.border},headerInner:{width:'100%',maxWidth:680,alignSelf:'center',paddingHorizontal:20,minHeight:56,flexDirection:'row',alignItems:'center',gap:16},
  brand:{color:c.ink,fontSize:17,fontWeight:'800',letterSpacing:-.5},brandRule:{width:28,height:3,backgroundColor:c.orange,marginLeft:'auto'},
  scroll:{flex:1},scrollContent:{flexGrow:1},content:{width:'100%',maxWidth:680,alignSelf:'center',paddingHorizontal:20,paddingTop:24,paddingBottom:32},
  heading:{...t.title,color:c.ink,marginBottom:20},
  nav:{backgroundColor:c.surface,borderTopWidth:1,borderTopColor:c.border},tabs:{width:'100%',maxWidth:680,alignSelf:'center',flexDirection:'row',paddingHorizontal:8,paddingTop:8,paddingBottom:8},
  tab:{flex:1,minHeight:60,alignItems:'center',justifyContent:'center',gap:4,paddingVertical:4},tabIcon:{paddingHorizontal:16,paddingVertical:4,borderRadius:4},activeIcon:{backgroundColor:c.tint},
  tabLabel:{fontSize:13,lineHeight:18,fontWeight:'500',color:c.muted},activeLabel:{color:c.action,fontWeight:'700'},pressed:{opacity:.65},
});
