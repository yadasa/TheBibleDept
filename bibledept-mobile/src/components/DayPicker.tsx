import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReadingPlanDay } from '../services/readingPlan';
import { radius, theme as c, typography as t } from '../theme';
import { Icon } from './Icon';
import { ActionButton, Field, IconButton, Notice } from './ui';

type Props = { visible: boolean; selectedDay: number; currentDay: number; finished: boolean; onSelect: (day: number) => void; onClose: () => void };

export function DayPicker({ visible, selectedDay, currentDay, finished, onSelect, onClose }: Props) {
  const { width, fontScale } = useWindowDimensions();
  const [page, setPage] = useState(0), [draft, setDraft] = useState(''), [error, setError] = useState('');
  const [reduceMotion, setReduceMotion] = useState(true);
  const [gridWidth, setGridWidth] = useState(Math.min(width, 560) - 40);
  const heading = useRef<Text>(null);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (visible) { setPage(Math.floor((selectedDay - 1) / 30)); setDraft(''); setError(''); }
  }, [visible, selectedDay]);

  // Follow available width and native text scale, rather than squeezing seven
  // calendar columns into an unscheduled reading plan.
  const columns = Math.min(6, Math.max(2, Math.floor((gridWidth + 8) / (44 * Math.max(1, fontScale) + 8))));
  const cellWidth = (gridWidth - (columns - 1) * 8) / columns;
  const first = page * 30 + 1, last = Math.min(first + 29, 365);

  function close() { Keyboard.dismiss(); onClose(); }
  function select(day: number) { Keyboard.dismiss(); onSelect(day); onClose(); }
  function jump() {
    const day = Number(draft);
    if (!/^\d+$/.test(draft) || !getReadingPlanDay(day)) { setError('Enter a day from 1 to 365.'); return; }
    select(day);
  }
  function focusHeading() {
    if (Platform.OS === 'web') return;
    const handle = findNodeHandle(heading.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }

  return <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={close} onShow={focusHeading}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={close}/>
      <SafeAreaView edges={['bottom']} style={s.sheet} accessibilityViewIsModal onAccessibilityEscape={close}>
        <View style={s.handle} accessible={false}/>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <View style={s.headingRow}>
            <Text ref={heading} accessibilityRole="header" style={s.title}>Choose a day</Text>
            <IconButton name="close" label="Close day picker" onPress={close}/>
          </View>
          <Text style={s.selection}>Viewing day {selectedDay} · {getReadingPlanDay(selectedDay)!.label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={'Open your current day, Day ' + currentDay + (finished ? ', plan complete' : '')} onPress={() => select(currentDay)} style={({ pressed }) => [s.currentSpot, pressed && s.pressed]}>
            <Icon name={finished ? 'checkCircle' : 'book'} size={20} color={c.action}/>
            <Text style={s.currentSpotText}>{finished ? 'Plan complete' : 'Your current day'}<Text style={s.currentSpotDay}> · Day {currentDay}</Text></Text>
            <Icon name="arrowRight" size={18} color={c.action}/>
          </Pressable>

          <View style={s.paging}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous 30 days" accessibilityState={{ disabled: page === 0 }} disabled={page === 0} onPress={() => setPage(value => value - 1)} style={({ pressed }) => [s.arrow, pressed && s.pressed, page === 0 && s.disabled]}><Icon name="chevronLeft" size={20}/></Pressable>
            <Text accessibilityLiveRegion="polite" style={s.range}>Days {first}–{last}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next 30 days" accessibilityState={{ disabled: last === 365 }} disabled={last === 365} onPress={() => setPage(value => value + 1)} style={({ pressed }) => [s.arrow, pressed && s.pressed, last === 365 && s.disabled]}><Icon name="chevronRight" size={20}/></Pressable>
          </View>
          <View onLayout={event => setGridWidth(event.nativeEvent.layout.width)} style={s.grid}>
            {Array.from({ length: last - first + 1 }, (_, index) => first + index).map(day => {
              const current = day === currentDay, selected = day === selectedDay, done = day < currentDay || finished;
              return <Pressable key={day} accessibilityRole="button" accessibilityLabel={'Day ' + day + ', ' + getReadingPlanDay(day)!.label + (current ? ', your current day' : '') + (done ? ', completed' : '')} accessibilityState={{ selected }} onPress={() => select(day)} style={({ pressed }) => [s.day, { width: cellWidth }, done && s.done, current && s.current, selected && s.selected, pressed && s.pressed]}>
                <View style={s.dayNumber}><Text style={[s.dayText, current && s.currentText]}>{day}</Text></View>
                {done && <View style={s.completionMarker}><Icon name="check" size={14} color={current ? c.ink : c.success}/></View>}
                {current && <Text style={s.currentMarker}>Now</Text>}
              </Pressable>;
            })}
          </View>
          <View style={s.legend}><View style={s.legendItem}><Icon name="check" size={16} color={c.success}/><Text style={s.legendText}>Complete</Text></View><View style={s.legendItem}><View style={s.selectedKey}/><Text style={s.legendText}>Viewing</Text></View></View>

          <View style={s.jump}>
            <View style={s.input}><Field label="Day number (1–365)" value={draft} onChangeText={value => { setDraft(value.replace(/\D/g, '').slice(0, 3)); setError(''); }} keyboardType="number-pad" returnKeyType="go" onSubmitEditing={jump} placeholder="e.g. 54" maxLength={3}/></View>
            <View style={s.jumpAction}><ActionButton title="Open day" onPress={jump}/></View>
          </View>
          {!!error && <Notice text={error} error/>}
          <Text style={s.storage}>Browse freely. Your saved spot stays on this device until you continue from your current day.</Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,10,9,0.5)' },
  sheet: { backgroundColor: c.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '94%', width: '100%', maxWidth: 560, alignSelf: 'center' },
  handle: { width: 36, height: 4, backgroundColor: c.controlBorder, opacity: .5, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { ...t.title, fontSize: 28, lineHeight: 34, color: c.ink, flexShrink: 1 },
  selection: { ...t.meta, color: c.muted, marginTop: 4 },
  currentSpot: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 12, borderRadius: radius, backgroundColor: c.tint, marginTop: 16 },
  currentSpotText: { ...t.meta, color: c.ink, flex: 1, flexWrap: 'wrap' }, currentSpotDay: { fontWeight: '700' },
  paging: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, marginBottom: 12 },
  arrow: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.controlBorder, borderRadius: radius, backgroundColor: c.surface },
  range: { ...t.label, color: c.ink, flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: .7 }, disabled: { opacity: .35 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { minHeight: 64, minWidth: 44, borderWidth: 1, borderColor: c.controlBorder, borderRadius: radius, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, paddingVertical: 8 },
  dayNumber: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }, dayText: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: c.ink },
  completionMarker: { position: 'absolute', top: 2, right: 2 },
  done: { backgroundColor: c.successTint }, current: { backgroundColor: c.orange, borderColor: c.orange }, selected: { borderColor: c.ink, borderWidth: 2 },
  currentText: { fontWeight: '800' }, currentMarker: { ...t.meta, color: c.ink, fontWeight: '600', textAlign: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginTop: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendText: { ...t.meta, color: c.muted },
  selectedKey: { width: 14, height: 14, borderColor: c.ink, borderWidth: 2, borderRadius: 2 },
  jump: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 20, flexWrap: 'wrap' }, input: { flex: 1, minWidth: 140 }, jumpAction: { marginBottom: 16, minWidth: 112 },
  storage: { ...t.meta, color: c.muted },
});
