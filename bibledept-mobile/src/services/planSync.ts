export type AccountPlanProgress={currentDay:number;finished:boolean;completedDays:number[]};
export function decodeAccountPlan(value:unknown):AccountPlanProgress|null {
  if(!value||typeof value!=='object')return null;
  const data=value as AccountPlanProgress;
  if(!Number.isInteger(data.currentDay)||data.currentDay<1||data.currentDay>365||typeof data.finished!=='boolean'
    ||(data.finished&&data.currentDay!==365)||!Array.isArray(data.completedDays)||data.completedDays.length>365
    ||data.completedDays.some(day=>!Number.isInteger(day)||day<1||day>365))return null;
  return {currentDay:data.currentDay,finished:data.finished,completedDays:Array.from(new Set([...data.completedDays,...Array.from({length:data.finished?365:data.currentDay-1},(_,i)=>i+1)])).sort((a,b)=>a-b)};
}
export function mergeAccountPlans(left:AccountPlanProgress,right:AccountPlanProgress):AccountPlanProgress {
  return decodeAccountPlan({currentDay:Math.max(left.currentDay,right.currentDay),finished:left.finished||right.finished,completedDays:Array.from(new Set([...left.completedDays,...right.completedDays]))})!;
}
export function sameAccountPlan(left:AccountPlanProgress|null,right:AccountPlanProgress) {
  return !!left&&left.currentDay===right.currentDay&&left.finished===right.finished&&left.completedDays.length===right.completedDays.length&&left.completedDays.every((day,i)=>day===right.completedDays[i]);
}
