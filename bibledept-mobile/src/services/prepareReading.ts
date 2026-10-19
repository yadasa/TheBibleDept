import { getPlanChapters } from './readingPlan';

/** Warm the saved chapter first, then the remaining chapters of this day only. */
export function planPreloadReferences(day:number,savedChapter:number) {
  const chapters=getPlanChapters(day),index=Number.isInteger(savedChapter)&&savedChapter>=0&&savedChapter<chapters.length?savedChapter:0;
  return chapters.length?[chapters[index].reference,...chapters.filter((_,i)=>i!==index).map(chapter=>chapter.reference)]:[];
}
