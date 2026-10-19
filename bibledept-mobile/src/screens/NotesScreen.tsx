import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Annotation } from "../../shared/annotations";
import {
  AnnotationEditor,
  highlightBackground,
} from "../components/AnnotationEditor";
import { ActionButton, Field, Notice } from "../components/ui";
import { Icon } from "../components/Icon";
import { useAuth } from "../services/AuthProvider";
import { useNotes } from "../services/NotesProvider";
import { useTheme, typography as t } from "../theme";
export function NotesScreen({
  onAccount,
  onPassage,
}: {
  onAccount: () => void;
  onPassage: (ref: string, translation: "web" | "kjv") => void;
}) {
  const { user } = useAuth(),
    notes = useNotes(),
    { colors: c, mode } = useTheme(),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Annotation | null>(null);
  if (!user)
    return (
      <View>
        <Icon name="notes" size={32} color={c.action} />
        <Text style={{ ...t.section, color: c.ink, marginTop: 20 }}>
          Save a note as you read
        </Text>
        <Notice text="Sign in to highlight verses, write notes, and find them here later." />
        <ActionButton title="Sign in to save notes" onPress={onAccount} />
      </View>
    );
  const visible = notes.notes.filter((n) =>
    `${n.reference} ${n.comment} ${n.excerpt}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <View>
      <Notice text="Highlights and notes from your reading appear here automatically. Only you can see them." />
      <Field
        label="Search these notes"
        value={search}
        onChangeText={setSearch}
        placeholder="Book, passage, or note"
      />
      {notes.loading && <ActivityIndicator color={c.action} />}
      {!notes.loading && !notes.notes.length && (
        <View style={{ paddingVertical: 24 }}>
          <Text style={{ ...t.section, color: c.ink }}>
            No notes yet
          </Text>
          <Notice text="Open a chapter and choose Highlight & note, or hold a verse. Select a verse or range, then save a highlight, a note, or both." />
        </View>
      )}
      {!visible.length && !!search && (
        <Notice text="No matches in these notes. Try another word, or load more notes below if available." />
      )}
      {visible.map((note) => (
        <View
          key={note.id}
          style={{
            padding: 20,
            marginBottom: 16,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 4,
            borderLeftWidth: 3,
            borderLeftColor: c.action,
          }}
        >
          <Text style={{ ...t.label, color: c.actionText }}>
            {note.reference}:{note.verseStart}
            {note.verseStart === note.verseEnd
              ? ""
              : `–${note.verseEnd}`} · {note.translation.toUpperCase()}
          </Text>
          <View
            style={{
              backgroundColor: highlightBackground(note.color, mode === "dark"),
              padding: 12,
              marginTop: 12,
            }}
          >
            <Text
              selectable
              numberOfLines={4}
              style={{ ...t.body, color: c.ink }}
            >
              {note.excerpt}
            </Text>
          </View>
          {!!note.comment && (
            <Text
              selectable
              numberOfLines={6}
              style={{ ...t.body, color: c.ink, marginTop: 16 }}
            >
              {note.comment}
            </Text>
          )}
          {note.pending && <Notice text="Saving to your account…" />}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <ActionButton
              title="Open passage"
              variant="ghost"
              onPress={() =>
                onPassage(
                  `${note.reference}:${note.verseStart}-${note.verseEnd}`,
                  note.translation,
                )
              }
            />
            <ActionButton
              title="Edit note"
              variant="ghost"
              onPress={() => setEditing(note)}
            />
          </View>
        </View>
      ))}
      {notes.hasMore && (
        <ActionButton
          title="Load more notes"
          secondary
          loading={notes.loading}
          onPress={notes.loadMore}
        />
      )}
      {!!notes.error && <Notice text={notes.error} error />}
      {!!editing && (
        <AnnotationEditor
          key={editing.id}
          annotation={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}
