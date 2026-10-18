import data from '../data/bibledept-365.json';

export type PlanPassage = Readonly<{
  book: string;
  bookId: string;
  chapterStart: number;
  chapterEnd: number;
  /** Explicit chapter range, including chapter 1 for single-chapter books. */
  reference: string;
}>;

export type ReadingPlanDay = Readonly<{
  day: number;
  /** The PDF's printed reading label, with range dashes normalized to ASCII. */
  label: string;
  passages: readonly PlanPassage[];
  chapterCount: number;
  sourcePage: number;
}>;

type CompactPassage = [bookIndex: number, chapterStart: number, chapterEnd?: number];
type CompactDay = CompactPassage | CompactPassage[];
export const READING_PLAN_BOOKS = Object.freeze((data.books as [string,string,number][]).map(
  ([name,bookId,chapterCount]) => Object.freeze({name,bookId,chapterCount}),
));

function expandPassage([bookIndex,chapterStart,chapterEnd = chapterStart]: CompactPassage): PlanPassage {
  const book = READING_PLAN_BOOKS[bookIndex];
  return Object.freeze({book:book.name,bookId:book.bookId,chapterStart,chapterEnd,
    reference:`${book.name} ${chapterStart}${chapterEnd===chapterStart?'':`-${chapterEnd}`}`});
}

// Only the compact numeric data is bundled. Repeated labels and ranges are derived.
const printedLabels: Record<number,string> = {42:'Philemon',43:'Titus',54:'2 Peter 1-3 & Jude',75:'2 & 3 John',243:'Obadiah'};
export const READING_PLAN_BY_DAY: Readonly<Partial<Record<number, ReadingPlanDay>>> = Object.freeze(
  Object.fromEntries((data.days as CompactDay[]).map((entry,index) => {
    const day=index+1;
    const passages=Object.freeze((typeof entry[0]==='number'?[entry as CompactPassage]:entry as CompactPassage[]).map(expandPassage));
    return [day,Object.freeze({day,passages,label:printedLabels[day]||passages.map(p=>p.reference).join(' & '),
      chapterCount:passages.reduce((sum,p)=>sum+p.chapterEnd-p.chapterStart+1,0),
      sourcePage:day<=54?1:day<=147?2:day<=240?3:day<=333?4:5})];
  })),
);

// These are relative plan days. Calendar dates require a separately chosen start date.
export const READING_PLAN = Object.freeze({
  id:'bibledept-365',title:'The Bible Dept - 365 Day Plan',totalDays:data.days.length,
  totalChapters:READING_PLAN_BOOKS.reduce((sum,book)=>sum+book.chapterCount,0),
});

export const READING_PLAN_DAYS: readonly ReadingPlanDay[] = Object.freeze(
  Object.values(READING_PLAN_BY_DAY).filter((day): day is ReadingPlanDay => day !== undefined).sort((a, b) => a.day - b.day),
);

export function getReadingPlanDay(day: number): ReadingPlanDay | undefined {
  return Number.isInteger(day) && day >= 1 && day <= READING_PLAN.totalDays
    ? READING_PLAN_BY_DAY[day]
    : undefined;
}

/** The free API accepts one whole chapter per request. No network calls here. */
export function getPlanChapters(day:number):ReadonlyArray<{book:string;chapter:number;reference:string}> {
  return getReadingPlanDay(day)?.passages.flatMap(p=>Array.from(
    {length:p.chapterEnd-p.chapterStart+1},(_,index)=>({book:p.book,chapter:p.chapterStart+index,reference:`${p.book} ${p.chapterStart+index}`}),
  ))||[];
}
