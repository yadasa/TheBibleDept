import { dateDistance, localDate, shiftDate, Streak } from './habits';
export type NotificationPreferences={enabled:boolean;keepMyRhythm:boolean;welcomeMeBack:boolean;preferredLocalTime:string;quietHours:{start:string;end:string};pausedUntil:number|null;preferredInstallationId:string|null;preferenceRevision:number};
export const defaultPreferences:NotificationPreferences={enabled:false,keepMyRhythm:true,welcomeMeBack:false,preferredLocalTime:'19:30',quietHours:{start:'21:00',end:'09:00'},pausedUntil:null,preferredInstallationId:null,preferenceRevision:0};
export type ReminderState={lastForegroundAt?:number;lastDispatchAttemptAt?:number;lastDispatchLocalDate?:string;recentAttempts?:number[];inactivityEpisodeId?:string;comebackHandoffs?:number;lastComebackHandoffAt?:number;episodePaused?:boolean};
export function minuteOfDay(value:string){if(!/^\d{2}:\d{2}$/.test(value))return -1;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:-1;}
export function inQuietHours(minute:number,quiet:NotificationPreferences['quietHours']){const start=minuteOfDay(quiet.start),end=minuteOfDay(quiet.end);return start===end||start<end?minute>=start&&minute<end||start===end:minute>=start||minute<end;}
export function validatePreferences(input:unknown):Omit<NotificationPreferences,'preferenceRevision'>{
  if(!input||typeof input!=='object')throw new Error('Invalid reminder preferences.');
  const p=input as NotificationPreferences;
  if([p.enabled,p.keepMyRhythm,p.welcomeMeBack].some(v=>typeof v!=='boolean'))throw new Error('Choose your reminder options.');
  const minutes=minuteOfDay(p.preferredLocalTime);
  if(minutes<0||minutes%15!==0||!p.quietHours||minuteOfDay(p.quietHours.start)<0||minuteOfDay(p.quietHours.end)<0||p.quietHours.start===p.quietHours.end||inQuietHours(minutes,p.quietHours))throw new Error('Choose a reminder time in 15-minute steps outside quiet hours.');
  if(p.pausedUntil!==null&&(!Number.isFinite(p.pausedUntil)||p.pausedUntil<0||p.pausedUntil>Date.now()+366*86400000))throw new Error('Choose a valid pause date.');
  if(p.preferredInstallationId!==null&&!/^[A-Za-z0-9_-]{20,80}$/.test(p.preferredInstallationId))throw new Error('Register this device before enabling reminders.');
  return {enabled:p.enabled,keepMyRhythm:p.keepMyRhythm,welcomeMeBack:p.welcomeMeBack,preferredLocalTime:p.preferredLocalTime,quietHours:{start:p.quietHours.start,end:p.quietHours.end},pausedUntil:p.pausedUntil,preferredInstallationId:p.preferredInstallationId};
}
export function reminderWindow(now:number,zone:string,p:NotificationPreferences){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const m=Number(parts.find(p=>p.type==='hour')!.value)*60+Number(parts.find(p=>p.type==='minute')!.value);
  const start=minuteOfDay(p.preferredLocalTime),remaining=Math.min(60-(m-start),1440-m);
  if(m<start||remaining<=0||inQuietHours(m,p.quietHours))return null;
  let safe=0;while(safe<remaining&&!inQuietHours(m+safe,p.quietHours))safe++;
  return {today:localDate(now,zone),ttl:Math.min(900,safe*60)};
}
export function reminderCandidate(now:number,zone:string,p:NotificationPreferences,streak:Streak,state:ReminderState):'streak'|'comeback'|null{
  const window=reminderWindow(now,zone,p);if(!window||!p.enabled||!p.preferredInstallationId||p.pausedUntil&&p.pausedUntil>now)return null;
  const today=window.today,last=streak.lastQualifiedDate;
  if(!last||last>=today||state.lastForegroundAt&&now-state.lastForegroundAt<1800000||state.lastDispatchLocalDate===today||state.lastDispatchAttemptAt&&now-state.lastDispatchAttemptAt<86400000||(state.recentAttempts||[]).filter(n=>now-n<7*86400000).length>=3)return null;
  if(p.keepMyRhythm&&last===shiftDate(today,-1)&&streak.current>0)return 'streak';
  if(!p.welcomeMeBack||state.episodePaused)return null;
  const days=dateDistance(today,last),count=state.inactivityEpisodeId===last?state.comebackHandoffs||0:0;
  if(days===3&&count===0)return 'comeback';
  if(days===10&&count===1&&state.lastComebackHandoffAt&&now-state.lastComebackHandoffAt>=7*86400000)return 'comeback';
  return null;
}
export type ResumeIntent={version:1;kind:'resume-reading';notificationId:string;accountScope:string};
export function parseResumeIntent(data:unknown):ResumeIntent|null{
  if(!data||typeof data!=='object')return null;const d=data as ResumeIntent;
  return d.version===1&&d.kind==='resume-reading'&&/^[A-Za-z0-9_-]{20,100}$/.test(d.notificationId)&&/^[A-Za-z0-9_-]{20,80}$/.test(d.accountScope)?{version:1,kind:'resume-reading',notificationId:d.notificationId,accountScope:d.accountScope}:null;
}
