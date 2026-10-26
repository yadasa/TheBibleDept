import { StatusBar } from "expo-status-bar";
import { memo, PropsWithChildren, RefObject, startTransition, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurTargetView } from "expo-blur";
import { ThemeProvider, useTheme, typography as t } from "./src/theme";
import { BrandLogo } from "./src/components/BrandLogo";
import { GlassProvider } from "./src/components/Glass";
import { PageMask } from "./src/components/PageMask";
import { PageBackdrop } from "./src/components/PageBackdrop";
import { PodcastProvider, usePodcastPresence } from "./src/state/PodcastProvider";
import { PodcastNowPlaying } from "./src/components/PodcastNowPlaying";
import {
  pagePosition,
  pagesCrossed,
  PageJourney,
} from "./src/services/tabPaging";
import {
  LiquidBottomNav,
  tabOrder,
  Tab,
} from "./src/components/LiquidBottomNav";
import { ReadingTextProvider, useReadingText } from "./src/components/ReaderControls";
import { ScreenScrollView } from "./src/components/ScreenScrollView";
import { NativeScrollFade } from "./src/components/NativeScrollFade";
import { BibleHub } from "./src/screens/BibleHub";
import { AccountScreen } from "./src/screens/AccountScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CommunityScreen, CommunitySection } from "./src/screens/CommunityScreen";
import { CommunityProvider } from './src/services/CommunityProvider';
import { AchievementCelebration } from './src/components/community/AchievementCelebration';
import { NotesScreen } from "./src/screens/NotesScreen";
import { AuthProvider, useAuth } from "./src/services/AuthProvider";
import { ReadingProvider } from "./src/services/ReadingProvider";
import { HabitProvider } from "./src/services/HabitProvider";
import {
  NotificationProvider,
  useNotifications,
} from "./src/services/NotificationProvider";
import { NotesProvider } from "./src/services/NotesProvider";
import { parseAppLink } from "./src/services/links";
import type { Translation } from "./src/services/bible";
import { PlanProvider, usePlan } from "./src/services/PlanProvider";
import { usePrepareReading } from './src/services/usePrepareReading';

// Retained pages keep their own context updates, but unrelated pager renders
// should not rebuild a reading, prayer draft or account form before motion.
const HomePage = memo(HomeScreen);
const BiblePage = memo(BibleHub);
const CommunityPage = memo(CommunityScreen);
const NotesPage = memo(NotesScreen);
const AccountPage = memo(AccountScreen);
const BottomNavigation = memo(LiquidBottomNav);
type NavigationMemory={tab:Tab;accountPage:'home'|'badges'|'prayer';communitySection:CommunitySection;returnToCommunity?:boolean;initialLinkHandled:boolean;initialLinkRequest?:Promise<string|null>};
const warmOrder: readonly Tab[] = ["Bible", "Community", "Account", "Notes"];
function retainPages(current: Tab[], required: readonly Tab[]): Tab[] {
  const missing = required.filter((item) => !current.includes(item));
  return missing.length ? [...current, ...missing] : current;
}

export default function App() {
  const navigation=useRef<NavigationMemory>({tab:'Home',accountPage:'home',communitySection:'Activity',initialLinkHandled:false});
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PodcastProvider>
          <ThemeProvider>
            <HabitProvider>
              <NotificationProvider>
                <NotesProvider>
                  <ReadingProvider>
                    <ReadingTextProvider>
                      <PlanProvider>
                        <CommunityProvider><AppShell navigation={navigation}/></CommunityProvider>
                      </PlanProvider>
                    </ReadingTextProvider>
                  </ReadingProvider>
                </NotesProvider>
              </NotificationProvider>
            </HabitProvider>
          </ThemeProvider>
        </PodcastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
function AppShell({navigation}:{navigation:RefObject<NavigationMemory>}) {
  const initialTab=useRef(navigation.current.tab).current,initialIndex=tabOrder.indexOf(initialTab);
  const insets = useSafeAreaInsets();
  const { user,ready:authReady } = useAuth();
  const { mode, colors: c } = useTheme(),
    plan = usePlan(),
    notifications = useNotifications();
  const [tab, setTab] = useState<Tab>(initialTab),
    [visited, setVisited] = useState<Tab[]>([initialTab]),
    [reference, setReference] = useState<string>(),
    [translation, setTranslation] = useState<Translation>("web"),
    [revision, setRevision] = useState(0),
    [planRequestDay, setPlanRequestDay] = useState<number>(),
    [podcastRequestRevision, setPodcastRequestRevision] = useState(0),
    [podcastRequestDay, setPodcastRequestDay] = useState(1),
    [preparedReadKey,setPreparedReadKey]=useState(''),
    [accountRequest,setAccountRequest]=useState<{page:'home'|'badges'|'prayer';revision:number}>({page:navigation.current.accountPage,revision:0}),
    [communityRequest,setCommunityRequest]=useState<{section:CommunitySection;revision:number}>({section:navigation.current.communitySection,revision:0});
  const {preferredTranslation}=useReadingText();
  const currentReadKey=`${user?.uid||'guest'}:${plan.currentDay}`;
  usePrepareReading(tab==='Home'&&plan.ready,plan.currentDay,plan.getReadingPosition(plan.currentDay).chapter,preferredTranslation);
  const journeyRef = useRef<PageJourney>({ from: initialIndex, to: initialIndex }),
    position = useRef(initialIndex),
    page = useRef(new Animated.Value(initialIndex)).current,
    displayed = useRef<Tab>(initialTab),
    slide = useRef(new Animated.Value(1)).current,
    blurTarget = useRef<View | null>(null),
    grainTarget = useRef<View | null>(null),
    [panelWidth, setPanelWidth] = useState(400),
    [screenHeight, setScreenHeight] = useState(800),
    [contentTop, setContentTop] = useState(84);
  const transitionInProgress = useRef(false),
    requestedTab = useRef<Tab>(initialTab),
    visitedPages = useRef(visited),
    latestPlan = useRef(plan);
  visitedPages.current = visited;
  latestPlan.current = plan;
  const navigate = useCallback((next: Tab) => {
    if (next === requestedTab.current) return;
    requestedTab.current = next;
    navigation.current.tab=next;
    if(next!=='Account')navigation.current.returnToCommunity=false;
    transitionInProgress.current = true;
    const required = pagesCrossed(position.current, tabOrder.indexOf(next));
    if (required.some((item) => !visitedPages.current.includes(item)))
      setVisited((current) => retainPages(current, required));
    setTab(next);
  }, [navigation]);
  const openAccount = useCallback(() => {navigation.current.accountPage='home';setAccountRequest(value=>({page:'home',revision:value.revision+1}));navigate("Account");}, [navigate,navigation]);
  const openPrayer = useCallback(() => {navigation.current.accountPage='prayer';setAccountRequest(value=>({page:'prayer',revision:value.revision+1}));navigate('Account');}, [navigate,navigation]);
  const openBadges = useCallback(() => {navigation.current.accountPage='badges';setAccountRequest(value=>({page:'badges',revision:value.revision+1}));navigate('Account');}, [navigate,navigation]);
  const openCommunity = useCallback(() => {navigation.current.communitySection='Activity';setCommunityRequest(value=>({section:'Activity',revision:value.revision+1}));navigate('Community');}, [navigate,navigation]);
  const openCircles = useCallback(() => {navigation.current.communitySection='Circles';setCommunityRequest(value=>({section:'Circles',revision:value.revision+1}));navigate('Community');}, [navigate,navigation]);
  const openCommunitySignIn=useCallback(()=>{navigation.current.returnToCommunity=true;openAccount();},[navigation,openAccount]);
  const rememberAccountPage=useCallback((page:'home'|'badges'|'prayer')=>{navigation.current.accountPage=page;},[navigation]);
  useEffect(()=>{if(user&&navigation.current.returnToCommunity){navigation.current.returnToCommunity=false;navigate('Community');}},[user?.uid,navigation,navigate]);
  const openNotes = useCallback(() => navigate("Notes"), [navigate]);
  const openPassage = useCallback((ref: string, version: Translation) => {
    setReference(ref);
    setTranslation(version);
    setRevision((v) => v + 1);
    navigate("Bible");
  }, [navigate]);
  const openPlan = useCallback((day: number) => {
    latestPlan.current.selectDay(day);
    setPlanRequestDay(day);
    setReference(undefined);
    setRevision((value) => value + 1);
    navigate("Bible");
  }, [navigate]);
  const openPodcast = useCallback((day: number) => {
    setPodcastRequestDay(day);
    openPlan(day);
    setPodcastRequestRevision((value) => value + 1);
  }, [openPlan]);
  const read = useCallback(() => {
    if(preparedReadKey===`${user?.uid||'guest'}:${latestPlan.current.currentDay}`&&latestPlan.current.selectedDay===latestPlan.current.currentDay&&!reference){
      navigate('Bible');return;
    }
    latestPlan.current.returnToCurrent();
    setPlanRequestDay(latestPlan.current.currentDay);
    setReference(undefined);
    setRevision((v) => v + 1);
    navigate("Bible");
  }, [navigate,preparedReadKey,reference,user?.uid]);
  useEffect(()=>{
    if(tab!=='Home'||!plan.ready)return;
    // Prepare the exact Home destination after paint, before the next tap.
    // Stored reading offsets remain intact; no lesson is marked complete here.
    startTransition(()=>{
      latestPlan.current.returnToCurrent();setPlanRequestDay(plan.currentDay);
      setReference(undefined);setRevision(value=>value+1);
      setVisited(current=>retainPages(current,['Bible']));setPreparedReadKey(currentReadKey);
    });
  },[tab,plan.ready,plan.currentDay,currentReadKey]);
  useEffect(() => {
    if (visited.length === tabOrder.length) return;
    let live = true,
      idle: number | undefined,
      retry: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (typeof requestIdleCallback === "function")
        idle = requestIdleCallback(deadline=>{
          idle=undefined;
          // Optional page preparation must not be forced into a busy frame.
          if(deadline.timeRemaining()<8){retry=setTimeout(schedule,200);return;}
          warmNext();
        });
      else retry = setTimeout(warmNext, 200);
    };
    const warmNext = () => {
      idle = undefined;
      retry = undefined;
      if (!live) return;
      if (transitionInProgress.current) {
        retry = setTimeout(schedule, 120);
        return;
      }
      const next = warmOrder.find((item) => !visited.includes(item));
      if (next)
        startTransition(() => setVisited((current) => retainPages(current, [next])));
    };
    schedule();
    return () => {
      live = false;
      if (idle !== undefined && typeof cancelIdleCallback === "function")
        cancelIdleCallback(idle);
      if (retry !== undefined) clearTimeout(retry);
    };
  }, [visited]);
  useEffect(() => {
    if (notifications.intent) {
      notifications.consume();
      read();
    }
  }, [notifications.intent]);
  useEffect(() => {
    if(!authReady)return;
    const open = (url: string | null) => {
      if (!url) return;
      const route = parseAppLink(url, __DEV__);
      if (!route) return;
      if (route.tab === "Bible")
        openPassage(route.reference, route.translation);
      else if(route.tab==='Prayer')openPrayer();
      else if(route.tab==='Circles')openCircles();
      else if(route.tab==='Badges')openBadges();
      else if(route.tab==='Community')openCommunity();
      else navigate(route.tab === "Today" ? "Home" : route.tab);
    };
    let active = true;
    if(!navigation.current.initialLinkHandled) {
      navigation.current.initialLinkRequest??=Linking.getInitialURL();
      void navigation.current.initialLinkRequest.then(url=>{
        if(active&&!navigation.current.initialLinkHandled){navigation.current.initialLinkHandled=true;open(url);}
      }).catch(()=>{});
    }
    const subscription = Linking.addEventListener("url", (event) =>
      open(event.url),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, [authReady,navigation,openPassage,navigate,openPrayer,openCircles,openBadges,openCommunity]);
  const beginTransition = useCallback(
    (next: Tab, immediate: boolean) => {
      const to = tabOrder.indexOf(next),
        from = immediate ? to : position.current;
      Keyboard.dismiss();
      const required = pagesCrossed(from, to);
      if (required.some((item) => !visitedPages.current.includes(item)))
        setVisited((value) => retainPages(value, required));
      transitionInProgress.current = !immediate && from !== to;
      displayed.current = next;
      journeyRef.current = { from, to };
      position.current = from;
      page.setValue(from);
    },
    [page],
  );
  const settle = useCallback((next: Tab) => {
    if (next !== displayed.current) return;
    transitionInProgress.current = false;
    const index = tabOrder.indexOf(next);
    // Pin both the visible track and its clock after an interrupted journey.
    // A delayed progress notification must not move a settled page again.
    journeyRef.current = { from: index, to: index };
    position.current = index;
    page.setValue(index);
  }, [page]);
  useEffect(() => {
    const listener = slide.addListener(({ value }) => {
      position.current = pagePosition(journeyRef.current, value);
      page.setValue(position.current);
    });
    return () => {
      slide.removeListener(listener);
      slide.stopAnimation();
    };
  }, [slide, page]);
  const headings: Record<Tab, string> = {
    Home: "",
    Bible: "Bible",
    Community: "",
    Notes: "Your notes",
    Account: "",
  };
  return (
    <GlassProvider target={grainTarget}>
      <View style={{ flex: 1, minWidth: 0, width: "100%", backgroundColor: c.background }} onLayout={event => setScreenHeight(event.nativeEvent.layout.height)}>
      <AppBackdrop page={page} panelWidth={panelWidth} target={grainTarget}/>
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
            <View>
              <View
                style={{
                  width: "100%",
                  maxWidth: 720,
                  alignSelf: "center",
                  paddingHorizontal: 20,
                  minHeight: 84,
                  paddingVertical: 16,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {tab==="Account"&&!user
                  ? <View accessible accessibilityRole="image" accessibilityLabel="The Bible Dept." style={{width:128,height:128*229/580,flexShrink:0,justifyContent:"center"}}>
                      <Text accessible={false} allowFontScaling={false} style={{fontSize:12,lineHeight:18,fontWeight:"800",letterSpacing:.7,color:c.ink}}>THE BIBLE DEPT.</Text>
                    </View>
                  : <BrandLogo />}
                <Text style={{ ...t.meta, color: c.muted, flexShrink: 0, maxWidth: "100%" }}>
                  READ. UNDERSTAND. GROW.
                </Text>
              </View>
            </View>
            <View
              testID="page-viewport"
              onLayout={(e) => {setPanelWidth(e.nativeEvent.layout.width);setContentTop(e.nativeEvent.layout.y + insets.top);}}
              // Unlike hidden, CSS clip cannot scroll to a focused retained
              // panel and leave the entire pager horizontally displaced.
              style={{ flex: 1, minWidth: 0, overflow: Platform.OS === "web" ? "clip" : "hidden" } as ViewStyle}
            >
              <>
                <PageMask>
                  <Animated.View
                    testID="page-track"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: panelWidth * tabOrder.length,
                      transform: [
                        {
                          translateX: page.interpolate({
                            inputRange: [0, tabOrder.length - 1],
                            outputRange: [
                              0,
                              -(tabOrder.length - 1) * panelWidth,
                            ],
                          }),
                        },
                      ],
                    }}
                  >
                    {/* CSS masks form a backdrop root. A matching inner backdrop
                      lets glass blur real pixels, while the outer one remains
                      visible wherever the content mask reaches zero alpha. */}
                    {Platform.OS === "web" && <View pointerEvents="none" style={{position:"absolute",left:0,right:0,top:-contentTop,height:screenHeight}}><PageBackdrop /></View>}
                    {tabOrder
                      .filter((item) => visited.includes(item))
                      .map((item) => {
                        const active = item === tab;
                        return (
                          <View
                            key={item}
                            testID={`scene-${item}`}
                            pointerEvents={active ? "auto" : "none"}
                            aria-hidden={!active}
                            {...(Platform.OS === "web"
                              ? { inert: !active }
                              : {})}
                            accessibilityElementsHidden={!active}
                            importantForAccessibility={
                              active ? "auto" : "no-hide-descendants"
                            }
                            style={{
                              position: "absolute",
                              top: 0,
                              bottom: 0,
                              left: tabOrder.indexOf(item) * panelWidth,
                              width: panelWidth,
                              minWidth: 0,
                              overflow: Platform.OS === "web" ? "clip" : "hidden",
                            } as ViewStyle}
                          >
                            <ScreenScrollView
                              active={active}
                              trackMotion={item === "Bible"}
                              resetOnPlanDayChange={item === "Bible"}
                              contentContainerStyle={{ flexGrow: 1 }}
                              keyboardShouldPersistTaps="handled"
                              keyboardDismissMode="on-drag"
                            >
                              <PodcastPageContent>
                                {!!headings[item] && (
                                  <Text
                                    accessibilityRole="header"
                                    style={{
                                      ...t.title,
                                      color: c.ink,
                                      marginBottom: 20,
                                    }}
                                  >
                                    {headings[item]}
                                  </Text>
                                )}
                                {item === "Home" ? (
                                  <HomePage
                                    active={active}
                                    onRead={read}
                                    onAccount={openAccount}
                                    onPrayer={openPrayer}
                                    onNotes={openNotes}
                                  />
                                ) : item === "Bible" ? (
                                  <BiblePage
                                    active={active}
                                    requestRevision={revision}
                                    planRequestDay={planRequestDay}
                                    podcastRequestRevision={podcastRequestRevision}
                                    podcastRequestDay={podcastRequestDay}
                                    initialReference={reference}
                                    initialTranslation={reference ? translation : undefined}
                                    onAccount={openAccount}
                                  />
                                ) : item === "Community" ? (
                                  <CommunityPage
                                    key={user?.uid||'guest'}
                                    active={active}
                                    onAccount={openCommunitySignIn}
                                    onBadges={openBadges}
                                    requestedSection={communityRequest.section}
                                    requestRevision={communityRequest.revision}
                                  />
                                ) : item === "Notes" ? (
                                  <NotesPage
                                    onAccount={openAccount}
                                    onPassage={openPassage}
                                  />
                                ) : (
                                  <AccountPage onOpenPlan={openPlan} onReadPassage={openPassage} onOpenNotes={openNotes} onCommunity={openCommunity} onCircles={openCircles} onRead={read} onRememberPage={rememberAccountPage} requestedPage={accountRequest.page} requestRevision={accountRequest.revision}/>
                                )}
                              </PodcastPageContent>
                            </ScreenScrollView>
                          </View>
                        );
                      })}
                  </Animated.View>
                </PageMask>
                <NativeScrollFade page={page} panelWidth={panelWidth} contentTop={contentTop} screenHeight={screenHeight}/>
              </>
            </View>
          </BlurTargetView>
          <PodcastNowPlaying onOpen={openPodcast} />
          <AchievementCelebration onOpen={openBadges}/>
          <BottomNavigation
            active={tab}
            onNavigate={navigate}
            onTransitionStart={beginTransition}
            onSettled={settle}
            progress={slide}
            blurTarget={blurTarget}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
      </View>
    </GlassProvider>
  );
}

/** One full-height background also reaches beneath the nav and home indicator. */
function AppBackdrop({page,panelWidth,target}:{page:Animated.Value;panelWidth:number;target:RefObject<View|null>}) {
  const {colors:c}=useTheme();
  return <View pointerEvents="none" style={{position:"absolute",inset:0,overflow:"hidden"}}>
    <Animated.View testID="page-background-track" style={{position:"absolute",left:0,top:0,bottom:0,width:panelWidth*tabOrder.length,
      transform:[{translateX:page.interpolate({inputRange:[0,tabOrder.length-1],outputRange:[0,-(tabOrder.length-1)*panelWidth]})}]}}>
      <BlurTargetView ref={target} pointerEvents="none" style={{position:"absolute",inset:0,backgroundColor:c.background}}><PageBackdrop/></BlurTargetView>
    </Animated.View>
  </View>;
}

/** Keep high-frequency player updates outside the retained page components. */
function PodcastPageContent({ children }: PropsWithChildren) {
  const hasEpisode=usePodcastPresence();
  return <View style={{
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: hasEpisode ? 240 : 168,
  }}>{children}</View>;
}
