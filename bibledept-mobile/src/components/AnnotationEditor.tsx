import { GlassPressable as Pressable } from "./Glass";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Annotation,
  highlightColors,
  HighlightColor,
} from "../../shared/annotations";
import { useAuth } from "../services/AuthProvider";
import { removeAnnotation, saveAnnotation } from "../services/NotesProvider";
import { useTheme, typography as t } from "../theme";
import { ActionButton, Field, Notice } from "./ui";
import { ORANGE_TONES } from "../themeColors";
export const highlightBackground = (color: HighlightColor, dark: boolean) =>
  ({
    gold: dark ? "#443A1B" : "#FFF0B8",
    orange: dark ? ORANGE_TONES.darkTint : ORANGE_TONES.lightTint,
    sage: dark ? "#253D2D" : "#DDEEDF",
    none: "transparent",
  })[color];
export function AnnotationEditor({
  annotation,
  onClose,
}: {
  annotation: Annotation;
  onClose: () => void;
}) {
  const { user } = useAuth(),
    { colors: c, mode } = useTheme(),
    [comment, setComment] = useState(annotation.comment),
    [color, setColor] = useState(annotation.color),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  async function save() {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      const { id, pending, ...rest } = annotation;
      await saveAnnotation(
        user.uid,
        { ...rest, comment: comment.trim(), color },
        id || undefined,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,.6)",
        }}
      >
        <SafeAreaView
          edges={["bottom"]}
          accessibilityViewIsModal
          style={{
            backgroundColor: c.surface,
            maxHeight: "90%",
            padding: 24,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text
              accessibilityRole="header"
              style={{ ...t.section, color: c.ink }}
            >
              {annotation.id ? "Edit note" : "Highlight and note"}
            </Text>
            <Notice
              text={`${annotation.reference}:${annotation.verseStart}${annotation.verseEnd === annotation.verseStart ? "" : `–${annotation.verseEnd}`} · ${annotation.translation.toUpperCase()}`}
            />
            <Text
              style={{
                ...t.body,
                color: c.ink,
                backgroundColor: highlightBackground(color, mode === "dark"),
                padding: 12,
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              {annotation.excerpt}
            </Text>
            <Text style={{ ...t.label, color: c.ink }}>Highlight</Text>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                flexWrap: "wrap",
                marginVertical: 12,
              }}
            >
              {highlightColors.map((value) => (
                <Pressable
                  key={value}
                  glassColor={
                    value === "none"
                      ? undefined
                      : highlightBackground(value, mode === "dark") + "B8"
                  }
                  accessibilityRole="radio"
                  accessibilityLabel={`${value} highlight`}
                  aria-checked={value === color}
                  accessibilityState={{ checked: value === color }}
                  onPress={() => setColor(value)}
                  disabled={busy}
                  style={{
                    minHeight: 48,
                    minWidth: 64,
                    padding: 12,
                    borderRadius: 4,
                    borderWidth: color === value ? 2 : 1,
                    borderColor: color === value ? c.action : c.controlBorder,
                    backgroundColor: highlightBackground(
                      value,
                      mode === "dark",
                    ),
                  }}
                >
                  <Text style={{ ...t.label, color: c.ink }}>
                    {value[0].toUpperCase() + value.slice(1)}
                    {value === color ? " ✓" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              label="Note (optional)"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={3000}
              editable={!busy}
              placeholder="Add a note about these verses…"
            />
            <Notice text="Save your highlight and note together to find them in Notes. Only you can see them. Connect to the internet to finish syncing." />
            {!!error && <Notice text={error} error />}
            <ActionButton
              title="Save to Notes"
              icon="check"
              loading={busy}
              onPress={() => void save()}
            />
            <ActionButton
              title="Cancel"
              secondary
              disabled={busy}
              onPress={onClose}
            />
            {!!annotation.id && (
              <ActionButton
                title={
                  confirmDelete
                    ? "Confirm delete highlight and note"
                    : "Delete highlight and note"
                }
                variant="ghost"
                disabled={busy}
                onPress={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  if (user) {
                    setBusy(true);
                    removeAnnotation(user.uid, annotation.id)
                      .then(onClose)
                      .catch(() => {
                        setError("We couldn’t delete this note. Try again.");
                        setBusy(false);
                      });
                  }
                }}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
