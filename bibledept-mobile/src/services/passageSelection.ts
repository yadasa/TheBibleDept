import { annotationRange, Annotation } from '../../shared/annotations';
import type { Passage, Verse } from './bible';

export type VerseSelection = {
  chapterId: string;
  first: number;
  last: number;
  reference: string;
};

/** Ranges stay within a chapter; holding another verse starts a new range. */
export function selectPassageVerse(previous: VerseSelection | null, verse: Verse, restart = false): VerseSelection {
  const chapterId = `${verse.book_id}.${verse.chapter}`;
  return !restart && previous?.chapterId === chapterId
    ? { ...previous, last: verse.verse }
    : { chapterId, first: verse.verse, last: verse.verse, reference: `${verse.book_name} ${verse.chapter}` };
}

export function selectedVerse(selection: VerseSelection | null, verse: Verse) {
  return !!selection && selection.chapterId === `${verse.book_id}.${verse.chapter}` &&
    verse.verse >= Math.min(selection.first, selection.last) && verse.verse <= Math.max(selection.first, selection.last);
}

export function selectionReference(selection: VerseSelection) {
  const { verseStart, verseEnd } = annotationRange(selection.first, selection.last);
  return `${selection.reference}:${verseStart}${verseEnd === verseStart ? '' : `–${verseEnd}`}`;
}

export function selectedPassageText(passage: Passage, selection: VerseSelection) {
  return passage.verses.filter(verse => selectedVerse(selection, verse)).map(verse => verse.text.trim()).join(' ');
}

export function annotationForSelection(passage: Passage, selection: VerseSelection): Annotation | null {
  const range = annotationRange(selection.first, selection.last);
  const verses = passage.verses.filter(verse => selectedVerse(selection, verse));
  // A stale selection from a replaced passage must never save different text.
  if (!verses.some(verse => verse.verse === range.verseStart) || !verses.some(verse => verse.verse === range.verseEnd)) return null;
  return {
    id: '', chapterId: selection.chapterId, reference: selection.reference,
    translation: passage.translation_id, ...range,
    excerpt: selectedPassageText(passage, selection).slice(0, 1200),
    color: 'gold', comment: '',
  };
}
