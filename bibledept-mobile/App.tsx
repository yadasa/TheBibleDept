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
import { PodcastProvider, usePodcast } from "./src/state/PodcastProvider";
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
import { ReadingTextProvider } from "./src/components/ReaderControls";
import { ScreenScrollView } from "./src/components/ScreenScrollView";
import { NativeScrollFade } from "./src/components/NativeScrollFade";
import { BibleHub } from "./src/screens/BibleHub";
import { AccountScreen } from "./src/screens/AccountScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PrayerScreen } from "./src/screens/PrayerScreen";
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

// Retained pages keep their own context updates, but unrelated pager renders
// should not rebuild a reading, prayer draft or account form before motion.
const HomePage = memo(HomeScreen);
const BiblePage = memo(BibleHub);
const PrayerPage = memo(PrayerScreen);
const NotesPage = memo(NotesScreen);
const AccountPage = memo(AccountScreen);
const BottomNavigation = memo(LiquidBottomNav);
const warmOrder: readonly Tab[] = ["Bible", "Prayer", "Account", "Notes"];
function retainPages(current: Tab[], required: readonly Tab[]): Tab[] {
  const missing = required.filter((item) => !current.includes(item));
  return missing.length ? [...current, ...missing] : current;
}

export default function App() {
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
                        <AppShell />
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
function AppShell() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { mode, colors: c } = useTheme(),
    plan = usePlan(),
    notifications = useNotifications();
  const [tab, setTab] = useState<Tab>("Home"),
    [visited, setVisited] = useState<Tab[]>(["Home"]),
    [reference, setReference] = useState<string>(),
    [translation, setTranslation] = useState<Translation>("web"),
    [revision, setRevision] = useState(0),
    [podcastRequestRevision, setPodcastRequestRevision] = useState(0),
    [podcastRequestDay, setPodcastRequestDay] = useState(1);
  const journeyRef = useRef<PageJourney>({ from: 2, to: 2 }),
    position = useRef(2),
    page = useRef(new Animated.Value(2)).current,
    displayed = useRef<Tab>("Home"),
    slide = useRef(new Animated.Value(1)).current,
    blurTarget = useRef<View | null>(null),
    grainTarget = useRef<View | null>(null),
    [panelWidth, setPanelWidth] = useState(400),
    [screenHeight, setScreenHeight] = useState(800),
    [contentTop, setContentTop] = useState(84);
  const transitionInProgress = useRef(false),
    requestedTab = useRef<Tab>("Home"),
    visitedPages = useRef(visited),
    latestPlan = useRef(plan);
  visitedPages.current = visited;
  latestPlan.current = plan;
  const navigate = useCallback((next: Tab) => {
    if (next === requestedTab.current) return;
    requestedTab.current = next;
    transitionInProgress.current = true;
    const required = pagesCrossed(position.current, tabOrder.indexOf(next));
    if (required.some((item) => !visitedPages.current.includes(item)))
      setVisited((current) => retainPages(current, required));
    setTab(next);
  }, []);
  const openAccount = useCallback(() => navigate("Account"), [navigate]);
  const openPrayer = useCallback(() => navigate("Prayer"), [navigate]);
  const openNotes = useCallback(() => navigate("Notes"), [navigate]);
  const openPassage = useCallback((ref: string, version: Translation) => {
    setReference(ref);
    setTranslation(version);
    setRevision((v) => v + 1);
    navigate("Bible");
  }, [navigate]);
  const openPlan = useCallback((day: number) => {
    latestPlan.current.selectDay(day);
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
    latestPlan.current.returnToCurrent();
    setReference(undefined);
    setRevision((v) => v + 1);
    navigate("Bible");
  }, [navigate]);
  useEffect(() => {
    if (visited.length === tabOrder.length) return;
    let live = true,
      idle: number | undefined,
      retry: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (typeof requestIdleCallback === "function")
        idle = requestIdleCallback(warmNext, { timeout: 1000 });
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
    const open = (url: string | null) => {
      if (!url) return;
      const route = parseAppLink(url, __DEV__);
      if (!route) return;
      if (route.tab === "Bible")
        openPassage(route.reference, route.translation);
      else navigate(route.tab === "Today" ? "Home" : route.tab);
    };
    let active = true;
    Linking.getInitialURL()
      .then((url) => {
        if (active) open(url);
      })
      .catch(() => {});
    const subscription = Linking.addEventListener("url", (event) =>
      open(event.url),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, [openPassage, navigate]);
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
    Prayer: "Prayer journal",
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
                                    onRead={read}
                                    onAccount={openAccount}
                                    onPrayer={openPrayer}
                                    onNotes={openNotes}
                                  />
                                ) : item === "Bible" ? (
                                  <BiblePage
                                    active={active}
                                    requestRevision={revision}
                                    podcastRequestRevision={podcastRequestRevision}
                                    podcastRequestDay={podcastRequestDay}
                                    initialReference={reference}
                                    initialTranslation={reference ? translation : undefined}
                                    onAccount={openAccount}
                                  />
                                ) : item === "Prayer" ? (
                                  <PrayerPage
                                    onAccount={openAccount}
                                  />
                                ) : item === "Notes" ? (
                                  <NotesPage
                                    onAccount={openAccount}
                                    onPassage={openPassage}
                                  />
                                ) : (
                                  <AccountPage onOpenPlan={openPlan} onReadPassage={openPassage} onOpenPrayer={openPrayer} onOpenNotes={openNotes}/>
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
  const { episode } = usePodcast();
  return <View style={{
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: episode ? 240 : 168,
  }}>{children}</View>;
}
