/** Intro is an entry screen, never a reading day or a prerequisite for continuing. */
export function showPlanIntroduction(day:number,completedDays:readonly number[],continuing=false) {
  return day===0||(day===1&&completedDays.length===0&&!continuing);
}
export function calendarPageDays(page:number) {
  const first=page*30+1,last=Math.min(first+29,365);
  return [...(page===0?[0]:[]),...Array.from({length:Math.max(0,last-first+1)},(_,index)=>first+index)];
}
