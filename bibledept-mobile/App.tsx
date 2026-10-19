import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BlurTargetView } from "expo-blur";
import { ThemeProvider, useTheme, typography as t } from "./src/theme";
import { BrandLogo } from "./src/components/BrandLogo";
import { GrainBackground } from "./src/components/GrainBackground";
import {
  LiquidBottomNav,
  tabOrder,
  Tab,
} from "./src/components/LiquidBottomNav";
import { ReadingTextProvider } from "./src/components/ReaderControls";
import { ScreenScrollView } from "./src/components/ScreenScrollView";
import { BibleHub } from "./src/screens/BibleHub";
import { AccountScreen } from "./src/screens/AccountScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PrayerScreen } from "./src/screens/PrayerScreen";
import { NotesScreen } from "./src/screens/NotesScreen";
import { AuthProvider } from "./src/services/AuthProvider";
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

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
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
      </AuthProvider>
    </SafeAreaProvider>
  );
}
function AppShell() {
  const { mode, colors: c } = useTheme(),
    plan = usePlan(),
    notifications = useNotifications();
  const [tab, setTab] = useState<Tab>("Home"),
    [visited, setVisited] = useState<Tab[]>(["Home"]),
    [reference, setReference] = useState<string>(),
    [translation, setTranslation] = useState<Translation>("web"),
    [revision, setRevision] = useState(0);
  const [scene, setScene] = useState<{
      from: Tab | null;
      to: Tab;
      direction: number;
    }>({ from: null, to: "Home", direction: 1 }),
    displayed = useRef<Tab>("Home"),
    slide = useRef(new Animated.Value(1)).current,
    blurTarget = useRef<View | null>(null),
    [panelWidth, setPanelWidth] = useState(400);
  function openPassage(ref: string, version: Translation) {
    setReference(ref);
    setTranslation(version);
    setRevision((v) => v + 1);
    setTab("Bible");
  }
  function read() {
    plan.returnToCurrent();
    setReference(undefined);
    setRevision((v) => v + 1);
    setTab("Bible");
  }
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
      else setTab(route.tab === "Today" ? "Home" : route.tab);
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
  }, []);
  const beginTransition = useCallback((next: Tab, immediate: boolean) => {
    const from = displayed.current,
      direction = tabOrder.indexOf(next) > tabOrder.indexOf(from) ? 1 : -1;
    Keyboard.dismiss();
    setVisited((value) => (value.includes(next) ? value : [...value, next]));
    displayed.current = next;
    if (immediate || next === from) {
      setScene({ from: null, to: next, direction });
      return;
    }
    setScene({ from, to: next, direction });
  }, []);
  const settle = useCallback((next: Tab) => {
    if (next === displayed.current)
      setScene((value) => ({ ...value, from: null }));
  }, []);
  useEffect(() => () => slide.stopAnimation(), []);
  const headings: Record<Tab, string> = {
    Home: "",
    Bible: "Bible",
    Prayer: "Prayer journal",
    Notes: "Your notes",
    Account: "Your account",
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
          <GrainBackground />
          <View style={{ borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View
              style={{
                width: "100%",
                maxWidth: 720,
                alignSelf: "center",
                paddingHorizontal: 20,
                minHeight: 72,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <BrandLogo />
              <Text style={{ ...t.meta, color: c.muted }}>
                READ. UNDERSTAND. GROW.
              </Text>
            </View>
          </View>
          <View
            onLayout={(e) => setPanelWidth(e.nativeEvent.layout.width)}
            style={{ flex: 1, overflow: "hidden" }}
          >
            {tabOrder
              .filter((item) => visited.includes(item) || item === scene.to)
              .map((item) => {
                const active = item === scene.to,
                  show = active || item === scene.from;
                const translate = scene.from
                  ? active
                    ? slide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [scene.direction * panelWidth, 0],
                      })
                    : slide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -scene.direction * panelWidth],
                      })
                  : 0;
                return (
                  <Animated.View
                    key={item}
                    testID={`scene-${item}`}
                    pointerEvents={active ? "auto" : "none"}
                    aria-hidden={!active}
                    accessibilityElementsHidden={!active}
                    importantForAccessibility={
                      active ? "auto" : "no-hide-descendants"
                    }
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: show ? "flex" : "none",
                      transform: [{ translateX: translate }],
                    }}
                  >
                    <ScreenScrollView
                      active={active}
                      resetOnPlanDayChange={item === "Bible"}
                      contentContainerStyle={{ flexGrow: 1 }}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                    >
                      <View
                        style={{
                          width: "100%",
                          maxWidth: 720,
                          alignSelf: "center",
                          paddingHorizontal: 20,
                          paddingTop: 24,
                          paddingBottom: 124,
                        }}
                      >
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
                          <HomeScreen
                            onRead={read}
                            onAccount={() => setTab("Account")}
                            onPrayer={() => setTab("Prayer")}
                            onNotes={() => setTab("Notes")}
                          />
                        ) : item === "Bible" ? (
                          <BibleHub
                            active={active}
                            requestRevision={revision}
                            initialReference={reference}
                            initialTranslation={translation}
                            onAccount={() => setTab("Account")}
                          />
                        ) : item === "Prayer" ? (
                          <PrayerScreen onAccount={() => setTab("Account")} />
                        ) : item === "Notes" ? (
                          <NotesScreen
                            onAccount={() => setTab("Account")}
                            onPassage={openPassage}
                          />
                        ) : (
                          <AccountScreen />
                        )}
                      </View>
                    </ScreenScrollView>
                  </Animated.View>
                );
              })}
          </View>
        </BlurTargetView>
        <LiquidBottomNav
          active={tab}
          onNavigate={setTab}
          onTransitionStart={beginTransition}
          onSettled={settle}
          progress={slide}
          blurTarget={blurTarget}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
