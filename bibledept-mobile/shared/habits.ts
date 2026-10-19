import planData from '../src/data/bibledept-365.json';
export type Streak = {current:number;longest:number;totalReadingDays:number;lastQualifiedDate:string|null};
export type Completion = {sessionId:string;chapterId:string;translation:'web'|'kjv';source:'reader'|'plan';planDay?:number;expectedHabitDate:string};
export type Receipt = {sessionId:string;creditedDate:string;awardedNewDay:boolean;current:number;longest:number;totalReadingDays:number;milestone:number|null};
export const emptyStreak:Streak={current:0,longest:0,totalReadingDays:0,lastQualifiedDate:null};
export const milestones=[7,30,100,365];
export function validZone(zone:unknown):zone is string{
  if(typeof zone!=='string'||zone.length>80)return false;
  try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format();return true;}catch{return false;}
}
export function localDate(now:number|Date,zone:string):string{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validDate(value:unknown):value is string{
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
export function shiftDate(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function dateDistance(a:string,b:string){return Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);}
export function currentStreak(streak:Streak,today:string){return streak.lastQualifiedDate&&(streak.lastQualifiedDate===today||streak.lastQualifiedDate===shiftDate(today,-1))?streak.current:0;}
export function addDay(streak:Streak,date:string):Streak{
  if(streak.lastQualifiedDate===date)return streak;
  const current=streak.lastQualifiedDate===shiftDate(date,-1)?streak.current+1:1;
  return {current,longest:Math.max(streak.longest,current),totalReadingDays:streak.totalReadingDays+1,lastQualifiedDate:date};
}
export function summarizeDays(days:string[]):Streak{return [...new Set(days)].sort().reduce(addDay,emptyStreak);}
export function chapterFromReference(reference:string):string|null{
  const match=/^(.+?)\s+(\d+)$/.exec(reference.trim());
  if(!match)return null;
  const book=planData.books.find(b=>String(b[0]).toLowerCase()===match[1].toLowerCase());
  const chapter=Number(match[2]);
  return book&&chapter>=1&&chapter<=Number(book[2])?`${book[1]}.${chapter}`:null;
}
export function chapterReference(id:string):string|null{
  const [bookId,number,...extra]=id.split('.');const book=planData.books.find(b=>b[1]===bookId),n=Number(number);
  return !extra.length&&book&&Number.isInteger(n)&&n>=1&&n<=Number(book[2])?`${book[0]} ${n}`:null;
}
export function validateCompletion(input:unknown):Completion{
  if(!input||typeof input!=='object')throw new Error('Invalid reading completion.');
  const data=input as Completion;
  if(!/^[A-Za-z0-9_-]{20,80}$/.test(data.sessionId)||!chapterReference(data.chapterId||'')||!['web','kjv'].includes(data.translation)||!['reader','plan'].includes(data.source)||!validDate(data.expectedHabitDate))throw new Error('Complete one whole chapter using WEB or KJV.');
  if(data.source==='plan'){
    if(!Number.isInteger(data.planDay)||data.planDay!<1||data.planDay!>365)throw new Error('Invalid plan day.');
    const raw=planData.days[data.planDay!-1] as number[]|number[][];
    const parts=(typeof raw[0]==='number'?[raw]:raw) as number[][];
    const matches=parts.some(([index,first,last=first])=>{
      const bookId=planData.books[index][1];const [id,n]=data.chapterId.split('.');return id===bookId&&Number(n)>=first&&Number(n)<=last;
    });
    if(!matches)throw new Error('This chapter does not belong to that plan day.');
  }
  return {sessionId:data.sessionId,chapterId:data.chapterId,translation:data.translation,source:data.source,...(data.source==='plan'?{planDay:data.planDay}:{}),expectedHabitDate:data.expectedHabitDate};
}
export function sameCompletion(a:Completion,b:Completion){return a.chapterId===b.chapterId&&a.translation===b.translation&&a.source===b.source&&a.planDay===b.planDay&&a.expectedHabitDate===b.expectedHabitDate;}
