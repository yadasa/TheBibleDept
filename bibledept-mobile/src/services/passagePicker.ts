import type { Passage } from './bible';
import { READING_PLAN_BOOKS } from './readingPlan';

export function referenceSelection(reference: string) {
  const match = reference.trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  const aliases:Record<string,string>={psalm:'psalms','song of solomon':'song of songs'};
  const name=match ? aliases[match[1].toLowerCase()] || match[1].toLowerCase() : '';
  const book = READING_PLAN_BOOKS.find(item => item.name.toLowerCase() === name) || READING_PLAN_BOOKS.find(item => item.bookId === 'LUK')!;
  const chapter = match && book.name.toLowerCase() === name ? Math.max(1, Math.min(book.chapterCount, Number(match[2]))) : 1;
  return { bookId: book.bookId, chapter, verse: match?.[3] ? `${match[3]}${match[4]&&match[4]!==match[3] ? `-${match[4]}` : ''}` : 'all' };
}

export function verseChoices(passage: Passage | null) {
  return [{ value: 'all', label: 'Whole chapter' }, ...(passage?.verses || []).map(verse => ({ value: String(verse.verse), label: `Verse ${verse.verse}` }))];
}

/** Verse choices come from the loaded translation, including any omitted numbers. */
export function selectPassageVerses(passage: Passage, selection: string): Passage {
  if (selection === 'all') return passage;
  const match = selection.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return passage;
  const first = Number(match[1]), last = Number(match[2] || match[1]);
  if (first > last || !passage.verses.some(verse => verse.verse === first) || !passage.verses.some(verse => verse.verse === last)) return passage;
  const verses = passage.verses.filter(verse => verse.verse >= first && verse.verse <= last);
  return { ...passage, reference: `${passage.verses[0].book_name} ${passage.verses[0].chapter}:${first}${last===first?'':`-${last}`}`, verses, text: verses.map(verse => verse.text).join('') };
}
