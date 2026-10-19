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
          Hold on to what stands out.
        </Text>
        <Notice text="Highlight Scripture and add your reflections. Your private notes stay together here." />
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
      <Notice text="Your highlights. Your questions. The words you want to return to. Synced privately to your account." />
      <Field
        label="Search loaded notes"
        value={search}
        onChangeText={setSearch}
        placeholder="A passage or a thought"
      />
      {notes.loading && <ActivityIndicator color={c.action} />}
      {!notes.loading && !notes.notes.length && (
        <View style={{ paddingVertical: 24 }}>
          <Text style={{ ...t.section, color: c.ink }}>
            A thought worth keeping.
          </Text>
          <Notice text="In the Bible reader, choose Highlight or comment, select your first and last verse, then save. It will appear here automatically." />
        </View>
      )}
      {!visible.length && !!search && (
        <Notice text="No matching notes in the loaded results. Load more notes or try another word." />
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
          <Text style={{ ...t.label, color: c.action }}>
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
          {note.pending && <Notice text="Syncing with your account…" />}
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
