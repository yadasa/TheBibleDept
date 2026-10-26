import { currentStreak, localDate, validZone } from './habits';
export type AchievementMetric = 'readingDays' | 'longestStreak' | 'planDays' | 'highlights' | 'reflections' | 'circles' | 'encouragements';
export type Achievement = { id:string; name:string; description:string; metric:AchievementMetric; target:number; family:'Reading'|'Journey'|'Reflection'|'Community'; symbol:'book'|'flame'|'leaf'|'sun'|'pen'|'people'|'heart'|'club' };
export const ACHIEVEMENTS:readonly Achievement[] = [
  {id:'first-light',name:'First light',description:'Save your first completed reading day.',metric:'readingDays',target:1,family:'Reading',symbol:'sun'},
  {id:'steady-week',name:'A steady week',description:'Read on 7 consecutive days.',metric:'longestStreak',target:7,family:'Reading',symbol:'flame'},
  {id:'taking-root',name:'Taking root',description:'Read on 30 consecutive days.',metric:'longestStreak',target:30,family:'Reading',symbol:'leaf'},
  {id:'deep-roots',name:'Deep roots',description:'Read on 100 consecutive days.',metric:'longestStreak',target:100,family:'Reading',symbol:'leaf'},
  {id:'keep-coming-back',name:'Keep coming back',description:'Save 100 reading days in total. They don’t need to be consecutive.',metric:'readingDays',target:100,family:'Reading',symbol:'book'},
  {id:'first-step',name:'The first step',description:'Complete 1 day of the reading journey.',metric:'planDays',target:1,family:'Journey',symbol:'book'},
  {id:'journey-week',name:'Finding your feet',description:'Complete 7 days of the reading journey.',metric:'planDays',target:7,family:'Journey',symbol:'book'},
  {id:'turning-pages',name:'Turning pages',description:'Complete 90 days of the reading journey.',metric:'planDays',target:90,family:'Journey',symbol:'book'},
  {id:'halfway-there',name:'Halfway there',description:'Complete 183 days of the reading journey.',metric:'planDays',target:183,family:'Journey',symbol:'sun'},
  {id:'six-percent-club',name:'6% Club',description:'Complete all 365 days of the reading journey. Every day counts; a perfect streak isn’t required.',metric:'planDays',target:365,family:'Journey',symbol:'club'},
  {id:'a-word-to-keep',name:'A word to keep',description:'Save your first verse highlight.',metric:'highlights',target:1,family:'Reflection',symbol:'pen'},
  {id:'well-marked',name:'Well marked',description:'Keep 20 verse highlights in your notes.',metric:'highlights',target:20,family:'Reflection',symbol:'pen'},
  {id:'make-it-personal',name:'Make it personal',description:'Save your first reflection on a passage.',metric:'reflections',target:1,family:'Reflection',symbol:'pen'},
  {id:'thoughtful-reader',name:'Thoughtful reader',description:'Keep 10 passage reflections in your notes.',metric:'reflections',target:10,family:'Reflection',symbol:'pen'},
  {id:'in-good-company',name:'In good company',description:'Join or create a reading circle.',metric:'circles',target:1,family:'Community',symbol:'people'},
  {id:'lift-another',name:'Lift another',description:'Encourage another reader’s community milestone.',metric:'encouragements',target:1,family:'Community',symbol:'heart'},
  {id:'encourager',name:'Encourager',description:'Encourage milestones from 5 different readers.',metric:'encouragements',target:5,family:'Community',symbol:'heart'},
];
export type AchievementMetrics = Record<AchievementMetric,number>;
export const EMPTY_METRICS:AchievementMetrics = {readingDays:0,longestStreak:0,planDays:0,highlights:0,reflections:0,circles:0,encouragements:0};
export type EarnedAchievement = {id:string;earnedAt:{toMillis:()=>number}|null};
export type CommunitySettings = {displayName:string;photoData:string|null;joined:boolean;shareStreak:boolean;shareBadges:boolean;blockedUids:string[];revision:string|null};
export const DEFAULT_COMMUNITY:CommunitySettings = {displayName:'',photoData:null,joined:false,shareStreak:true,shareBadges:true,blockedUids:[],revision:null};
export type CommunityProfile = {id:string;displayName:string;photoData:string|null;profileVersion?:string;streak:number|null;lastReadingDate:string|null;timeZone:string|null;badgeIds:string[];planDays:number|null};
export type CommunityActivity = {id:string;uid:string;kind:'joined'|'achievement';badgeId:string|null;cheerCount:number;createdAt:{toMillis:()=>number}|null};
export type Circle = {id:string;name:string;code:string;memberCount:number;createdBy:string;lastMessageId?:string|null;lastSenderUid?:string|null;lastMessageAt?:{toMillis:()=>number}|null;unread?:boolean};
export type CircleMessage = {id:string;uid:string;text:string;createdAt:{toMillis:()=>number}|null};
export function circleHasUnread(circle:Circle,lastReadId:string|undefined,viewer:string,hidden:string[]) {
  return !!circle.lastMessageId&&circle.lastMessageId!==lastReadId&&circle.lastSenderUid!==viewer&&!hidden.includes(circle.lastSenderUid||'');
}
export function visibleCommunityStreak(profile:CommunityProfile,now:number) {
  if(profile.streak===null)return null;
  if(!validZone(profile.timeZone))return 0;
  return currentStreak({current:profile.streak,longest:0,totalReadingDays:0,lastQualifiedDate:profile.lastReadingDate},localDate(now,profile.timeZone));
}
export function achievementProgress(achievement:Achievement,metrics:AchievementMetrics) {
  const raw=metrics[achievement.metric];
  return Math.min(achievement.target,Math.max(0,Number.isFinite(raw)?Math.floor(raw):0));
}
export function achievedIds(metrics:AchievementMetrics) {
  return ACHIEVEMENTS.filter(a=>achievementProgress(a,metrics)>=a.target).map(a=>a.id);
}
export function completedPlanDays(value:unknown):number {
  if(!value||typeof value!=='object')return 0;
  const days=(value as {completedDays?:unknown}).completedDays;
  // Completion awards require actual saved day IDs, never just a day-picker position.
  return Array.isArray(days)?new Set(days.filter(day=>Number.isInteger(day)&&day>=1&&day<=365)).size:0;
}
/** Shared, bounded search keys keep names searchable without a third-party index. */
export function communityNameQuery(value:string):string {
  return Array.from(value.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu,' ')).slice(0,80).join('');
}
export function communityNamePrefixes(value:string):string[] {
  const name=communityNameQuery(value),prefixes=new Set<string>();
  for(const part of [name,...name.split(' ')]) {
    let prefix='';
    for(const letter of part){prefix+=letter;prefixes.add(prefix);}
  }
  return [...prefixes];
}
export function validateCommunityProfile(value:unknown):Pick<CommunitySettings,'displayName'|'photoData'|'joined'|'shareStreak'|'shareBadges'> {
  const data=value as CommunitySettings;
  if(!data||typeof data.displayName!=='string'||!data.displayName.trim()||data.displayName.trim().length>80||/[\x00-\x1f\x7f]/.test(data.displayName))throw new Error('Choose a name with 1–80 characters.');
  if(typeof data.joined!=='boolean'||typeof data.shareStreak!=='boolean'||typeof data.shareBadges!=='boolean')throw new Error('Choose your community sharing preferences.');
  if(data.photoData!==null&&(typeof data.photoData!=='string'||data.photoData.length>60000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(data.photoData)))throw new Error('Choose a smaller profile photo.');
  return {displayName:data.displayName.trim(),photoData:data.photoData,joined:data.joined,shareStreak:data.shareStreak,shareBadges:data.shareBadges};
}
export function cleanMessage(value:unknown):string {
  if(typeof value!=='string'||!value.trim()||value.trim().length>2000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))throw new Error('Write a message with 1–2,000 characters.');
  return value.trim();
}
export function cleanCircleName(value:unknown):string {
  if(typeof value!=='string'||!value.trim()||value.trim().length>60||/[\x00-\x1f\x7f]/.test(value))throw new Error('Give your circle a name with 1–60 characters.');
  return value.trim();
}
export function validDocumentId(value:unknown):value is string {return typeof value==='string'&&/^[A-Za-z0-9_-]{1,150}$/.test(value);}
