import { GlassPressable } from "./Glass";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { Passage } from "../services/bible";
import { useTheme, useThemedStyles, Colors, typography as t } from "../theme";
import { useReadingText } from "./ReaderControls";
import { AnnotationEditor, highlightBackground } from "./AnnotationEditor";
import { Notice } from "./ui";
import { useAuth } from "../services/AuthProvider";
import { usePassageAnnotations, Annotation } from "../services/NotesProvider";
import { Icon } from "./Icon";
import { annotationForSelection, selectPassageVerse, selectedPassageText, selectedVerse, selectionReference, VerseSelection } from "../services/passageSelection";

export function PassageView({ passage, onAccount }: { passage: Passage; onAccount?: () => void }) {
  const { c, s } = useThemedStyles(styles);
  const { fontSize } = useReadingText();
  const { user } = useAuth(),
    { mode } = useTheme(),
    [selecting, setSelecting] = useState(false),
    [selection, setSelection] = useState<VerseSelection | null>(null),
    [copyMessage, setCopyMessage] = useState(""),
    [editing, setEditing] = useState<Annotation | null>(null);
  const chapterIds = [
    ...new Set(passage.verses.map((v) => `${v.book_id}.${v.chapter}`)),
  ];
  const notes = usePassageAnnotations(chapterIds, passage.translation_id);
  function choose(index: number, restart = false) {
    if (!user) return;
    setSelecting(true);
    setCopyMessage("");
    setSelection(old => selectPassageVerse(old, passage.verses[index], restart));
  }
  function annotate() {
    if (!selection || !user) return;
    setEditing(annotationForSelection(passage, selection));
  }
  async function copySelection() {
    if (!selection) return;
    try {
      const copied = await Clipboard.setStringAsync(`${selectionReference(selection)}\n${selectedPassageText(passage, selection)}\n${passage.translation_name}`);
      setCopyMessage(copied ? "Verses copied." : "This browser couldn’t copy the verses. Cancel selection, then copy the text directly.");
    } catch { setCopyMessage("We couldn’t copy the verses. Try again."); }
  }
  const multipleChapters = passage.verses.some(
    (verse) => verse.chapter !== passage.verses[0].chapter,
  );
  return (
    <View style={s.paper}>
      <Text accessibilityRole="header" style={s.reference}>
        {passage.reference}
      </Text>
      <Text style={s.translation}>{passage.translation_name}</Text>
      <View style={s.tools}>
        <GlassPressable accessibilityRole="button"
          accessibilityLabel={user ? selecting ? "Cancel verse selection" : "Highlight or add a note" : "Sign in to save highlights and notes"}
          accessibilityState={{expanded:!!user&&selecting,disabled:!user&&!onAccount}}
          disabled={!user&&!onAccount}
          onPress={() => {
            if (!user) { onAccount?.(); return; }
            setSelecting(!selecting);setSelection(null);setCopyMessage("");
          }} style={s.toolButton}>
          <Icon name={selecting ? "close" : "notes"} size={19}/>
          <View style={s.toolText}>
            <Text style={s.toolLabel}>{selecting ? "Cancel selection" : "Highlight & note"}</Text>
            {!user && <Text style={s.toolHint}>Sign in to save highlights and notes</Text>}
          </View>
          {!selecting && <Icon name="chevronRight" size={18} color={c.muted}/>}
        </GlassPressable>
        {user && <Text style={s.toolHint}>{selecting
          ? "Tap a verse, then the last verse for a range in the same chapter."
          : "Hold a verse to start, or choose Highlight & note."}</Text>}
      </View>
      {!!notes.error && <Notice text={notes.error} error />}
      {passage.verses.map((verse, index) => (
        <View key={`${verse.book_id}:${verse.chapter}:${verse.verse}`}>
          {multipleChapters &&
            (index === 0 ||
              passage.verses[index - 1].chapter !== verse.chapter) && (
              <Text style={s.chapter}>Chapter {verse.chapter}</Text>
            )}
          {(() => {
            const chapterId = `${verse.book_id}.${verse.chapter}`,
              note = notes.notes.find(
                (n) =>
                  n.chapterId === chapterId &&
                  n.verseStart <= verse.verse &&
                  n.verseEnd >= verse.verse,
              );
            const selected = selecting && selectedVerse(selection, verse);
            const selectionEnd = selecting && selection?.chapterId === chapterId && selection.last === verse.verse;
            const content = (
              <Text
                selectable={!selecting}
                style={[
                  s.verse,
                  {
                    fontSize,
                    lineHeight: fontSize * 1.6,
                    backgroundColor: selected
                      ? c.tint
                      : note
                        ? highlightBackground(note.color, mode === "dark")
                        : "transparent",
                    borderLeftWidth: selected ? 3 : 0,
                    borderLeftColor: c.action,
                    paddingLeft: selected ? 8 : 0,
                  },
                ]}
              >
                <Text style={s.number}>{verse.verse} </Text>
                {verse.text.trim()}
              </Text>
            );
            return (
              <>
                {user ? (
                  <Pressable
                    accessibilityRole={selecting ? "checkbox" : note ? "button" : "text"}
                    accessibilityLabel={`${selecting ? "Select verse" : "Verse"} ${verse.verse}: ${verse.text.trim()}`}
                    accessibilityHint={selecting ? "Select the first and last verse of the passage." : "Hold to select this verse for a highlight or note."}
                    aria-checked={selecting ? !!selected : undefined}
                    accessibilityState={selecting ? {checked:!!selected} : undefined}
                    accessibilityActions={!selecting ? [{name:"annotate",label:"Highlight or add a note"}] : undefined}
                    onAccessibilityAction={event => {if(event.nativeEvent.actionName === "annotate")choose(index,true);}}
                    tabIndex={selecting || note ? 0 : -1}
                    onPress={selecting ? () => choose(index) : note ? () => setEditing(note) : undefined}
                    onLongPress={() => choose(index,true)} delayLongPress={450}
                  >
                    {content}
                  </Pressable>
                ) : (
                  content
                )}
                {selectionEnd && selection && <View style={s.selectionTools}>
                  <Text accessibilityLiveRegion="polite" style={s.selectionLabel}>{selectionReference(selection)}</Text>
                  <View style={s.selectionActions}>
                    <GlassPressable accessibilityRole="button" accessibilityLabel="Add highlight or note"
                      tone="primary" onPress={annotate} style={s.selectionAction}>
                      <Text style={[s.actionLabel,{color:c.onOrange}]}>Highlight & note</Text>
                    </GlassPressable>
                    <GlassPressable accessibilityRole="button" accessibilityLabel="Copy verses"
                      onPress={() => void copySelection()} style={s.selectionAction}>
                      <Text style={[s.actionLabel,{color:c.ink}]}>Copy verses</Text>
                    </GlassPressable>
                  </View>
                  {!!copyMessage && <Notice text={copyMessage}/>}
                </View>}
                {!selecting && note && note.verseStart === verse.verse && (
                  <GlassPressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit note on verse ${verse.verse}`}
                    onPress={() => setEditing(note)}
                    style={{
                      minHeight: 44,
                      justifyContent: "center",
                      marginBottom: 16,
                      borderLeftWidth: 2,
                      borderLeftColor: c.action,
                      paddingLeft: 12,
                    }}
                  >
                    <Text style={{ ...t.meta, color: c.actionText }}>
                      {note.comment || "Highlighted · Add a note"}
                      {note.pending ? " · Saving…" : ""}
                    </Text>
                  </GlassPressable>
                )}
              </>
            );
          })()}
        </View>
      ))}
      {!!editing && user && (
        <AnnotationEditor
          key={
            editing.id ||
            `${editing.chapterId}:${editing.verseStart}:${editing.verseEnd}`
          }
          annotation={editing}
          onClose={() => {
            setEditing(null);
            setSelection(null);
            setSelecting(false);
            setCopyMessage("");
          }}
        />
      )}
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    paper: { paddingTop: 8 },
    reference: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "700",
      letterSpacing: -0.7,
      color: c.ink,
    },
    translation: { ...t.meta, color: c.muted, marginTop: 6, marginBottom: 28 },
    tools:{marginBottom:20,gap:8},
    toolButton:{minHeight:48,paddingHorizontal:12,paddingVertical:10,borderRadius:14,flexDirection:"row",alignItems:"center",gap:10},
    toolText:{flex:1,minWidth:0},
    toolLabel:{...t.label,color:c.ink},
    toolHint:{...t.meta,color:c.muted},
    selectionTools:{marginBottom:20,padding:12,borderRadius:14,backgroundColor:c.surface},
    selectionLabel:{...t.label,color:c.ink},
    selectionActions:{flexDirection:"row",gap:8,marginTop:10},
    selectionAction:{flex:1,minWidth:0,minHeight:44,paddingHorizontal:8,paddingVertical:10,borderRadius:12,alignItems:"center",justifyContent:"center"},
    actionLabel:{...t.label,textAlign:"center"},
    chapter: { ...t.label, color: c.actionText, marginTop: 16, marginBottom: 16 },
    verse: { color: c.ink, marginBottom: 16 },
    number: { fontSize: 13, fontWeight: "600", color: c.actionText },
  });
