import { collection, doc, documentId, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ACHIEVEMENTS, AchievementMetrics, Circle, circleHasUnread, CircleMessage, CommunityActivity, communityNameQuery, CommunityProfile, CommunitySettings, DEFAULT_COMMUNITY, EarnedAchievement, EMPTY_METRICS } from '../../shared/community';
import { useAuth } from './AuthProvider';
import { callBackend, getFirebase } from './firebase';
import { USER_COLLECTION } from './dataPaths';
import { communityErrorForUser } from './communityError';
import { UserFacingError } from './userMessage';

type CommunityState={settings:CommunitySettings;ready:boolean;achievementsReady:boolean;achievementError:string;retryCommunity:()=>void;metrics:AchievementMetrics;earned:EarnedAchievement[];newlyEarned:string[];dismissNewBadges:()=>void;circles:Circle[];error:string;perform:<T=unknown>(name:string,data:unknown)=>Promise<T>};
const Context=createContext<CommunityState|null>(null);
export function CommunityProvider({children}:{children:ReactNode}) {
  const {user}=useAuth();
  return <CommunitySession key={user?.uid||'guest'} owner={user?.uid}>{children}</CommunitySession>;
}
function CommunitySession({owner,children}:{owner?:string;children:ReactNode}) {
  const [settings,setSettings]=useState<CommunitySettings>(DEFAULT_COMMUNITY),[ready,setReady]=useState(!owner);
  const [metrics,setMetrics]=useState(EMPTY_METRICS),[earned,setEarned]=useState<EarnedAchievement[]>([]),[circles,setCircles]=useState<Circle[]>([]),[error,setError]=useState('');
  const [metricsReady,setMetricsReady]=useState(!owner),[awardsReady,setAwardsReady]=useState(!owner),[loadAttempt,setLoadAttempt]=useState(0);
  const [achievementErrors,setAchievementErrors]=useState<{metrics?:string;awards?:string}>({});
  const retryCommunity=useCallback(()=>setLoadAttempt(value=>value+1),[]);
  const [circleDetails,setCircleDetails]=useState<Circle[]>([]),[circleReads,setCircleReads]=useState(()=>new Map<string,string>());
  const [newlyEarned,setNewlyEarned]=useState<string[]>([]),knownAwards=useRef<Set<string>|null>(null);
  const dismissNewBadges=useCallback(()=>setNewlyEarned([]),[]);
  const perform=useCallback(async<T,>(name:string,data:unknown):Promise<T>=>{
    if(!owner)throw new UserFacingError('Sign in to continue.');
    if(!data||typeof data!=='object'||Array.isArray(data))throw new UserFacingError('Reopen this screen and try again.');
    try{return await callBackend<T>(name,{...data,expectedUid:owner},owner);}
    catch(e){throw communityErrorForUser(e);}
  },[owner]);
  useEffect(()=>{
    if(!owner)return;
    const db=getFirebase().db,root=doc(db,USER_COLLECTION,owner);
    const failed=()=>{setReady(true);setError('Your community details couldn’t load. Check your connection.');};
    const stops=[
      onSnapshot(doc(root,'settings','community'),snapshot=>{setSettings({...DEFAULT_COMMUNITY,...snapshot.data()});setReady(true);setError('');},failed),
      onSnapshot(doc(root,'stats','achievements'),{includeMetadataChanges:true},snapshot=>{
        setMetrics({...EMPTY_METRICS,...snapshot.data()});
        if(!snapshot.metadata.fromCache){setMetricsReady(true);setAchievementErrors(previous=>({...previous,metrics:''}));}
      },()=>setAchievementErrors(previous=>({...previous,metrics:'Your achievement progress couldn’t load. Check your connection and refresh.'}))),
      onSnapshot(collection(root,'achievements'),{includeMetadataChanges:true},snapshot=>{
        const awards=snapshot.docs.map(d=>({id:d.id,...d.data()} as EarnedAchievement));
        // A partial local cache must not turn existing server awards into new ones.
        if(snapshot.metadata.fromCache){setEarned(awards);return;}
        if(knownAwards.current) {
          const additions=awards.filter(award=>!knownAwards.current!.has(award.id)&&ACHIEVEMENTS.some(item=>item.id===award.id)).map(award=>award.id);
          if(additions.length)setNewlyEarned(previous=>[...new Set([...previous,...additions])]);
        }
        knownAwards.current=new Set(awards.map(award=>award.id));setEarned(awards);setAwardsReady(true);setAchievementErrors(previous=>({...previous,awards:''}));
      },()=>setAchievementErrors(previous=>({...previous,awards:'Your saved badges couldn’t load. Check your connection and refresh.'}))),
      onSnapshot(collection(root,'circles'),snapshot=>setCircles(snapshot.docs.map(d=>({id:d.id,...d.data()} as Circle))),failed),
    ];
    return()=>stops.forEach(stop=>stop());
  },[owner,perform,loadAttempt]);
  // Also covers existing accounts whose progress predates achievement triggers.
  useEffect(()=>{if(owner)void perform('refreshAchievements',{}).catch(()=>{});},[owner,perform]);
  const circleIds=circles.map(circle=>circle.id),circleKey=circleIds.join(',');
  useEffect(()=>{
    if(!owner||!settings.joined){setCircleDetails([]);setCircleReads(new Map());return;}
    const db=getFirebase().db;
    const stops=[onSnapshot(query(collection(db,'bibledeptCircles'),where('memberIds','array-contains',owner),limit(20)),snapshot=>setCircleDetails(snapshot.docs.map(d=>({id:d.id,...d.data()} as Circle))),()=>setCircleDetails([]))];
    if(circleIds.length)stops.push(onSnapshot(query(collection(db,USER_COLLECTION,owner,'circleReads'),where(documentId(),'in',circleIds)),snapshot=>setCircleReads(new Map(snapshot.docs.map(d=>[d.id,d.data().lastReadMessageId as string]))),()=>setCircleReads(new Map())));
    else setCircleReads(new Map());
    return()=>stops.forEach(stop=>stop());
  },[owner,settings.joined,circleKey]);
  const visibleCircles=useMemo(()=>circles.map(circle=>{
    const latest={...circle,...circleDetails.find(detail=>detail.id===circle.id)};
    return {...latest,unread:!!owner&&settings.joined&&circleHasUnread(latest,circleReads.get(circle.id),owner,settings.blockedUids)};
  }).sort((a,b)=>(b.lastMessageAt?.toMillis()||0)-(a.lastMessageAt?.toMillis()||0)||a.name.localeCompare(b.name)),[circles,circleDetails,circleReads,owner,settings.joined,settings.blockedUids]);
  const achievementsReady=metricsReady&&awardsReady,achievementError=achievementErrors.metrics||achievementErrors.awards||'';
  const value=useMemo(()=>({settings,ready,achievementsReady,achievementError,retryCommunity,metrics,earned,newlyEarned,dismissNewBadges,circles:visibleCircles,error,perform}),[settings,ready,achievementsReady,achievementError,retryCommunity,metrics,earned,newlyEarned,dismissNewBadges,visibleCircles,error,perform]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCommunity(){const value=useContext(Context);if(!value)throw new Error('CommunityProvider is missing.');return value;}

export function useCommunityDirectory(active:boolean,count=40,readerSearch='',includeActivity=true) {
  const {settings}=useCommunity(),{user}=useAuth();
  const [profiles,setProfiles]=useState<CommunityProfile[]>([]),[events,setEvents]=useState<CommunityActivity[]>([]);
  const [profileError,setProfileError]=useState(''),[activityError,setActivityError]=useState(''),[profilesLoading,setProfilesLoading]=useState(true),[activityLoading,setActivityLoading]=useState(true);
  const nameQuery=communityNameQuery(readerSearch);
  useEffect(()=>{
    if(!user||!settings.joined){setProfiles([]);setProfileError('');setProfilesLoading(false);return;}
    if(!active)return; // Keep retained pages stable while the pager travels past them.
    setProfilesLoading(true);setProfiles([]);setProfileError('');const ref=collection(getFirebase().db,'bibledeptProfiles');
    const request=nameQuery?query(ref,where('namePrefixes','array-contains',nameQuery),limit(count)):query(ref,orderBy('displayName'),limit(count));
    return onSnapshot(request,snapshot=>{
      setProfiles(snapshot.docs.map(d=>({id:d.id,...d.data()} as CommunityProfile)).sort((a,b)=>a.displayName.localeCompare(b.displayName)));
      setProfilesLoading(false);setProfileError('');
    },()=>{setProfileError('Readers couldn’t load. Check your connection and try again.');setProfilesLoading(false);});
  },[active,settings.joined,user?.uid,count,nameQuery]);
  useEffect(()=>{
    if(!user||!settings.joined){setEvents([]);setActivityError('');setActivityLoading(false);return;}
    if(!active||!includeActivity)return;
    setActivityLoading(true);setActivityError('');
    return onSnapshot(query(collection(getFirebase().db,'bibledeptActivity'),orderBy('createdAt','desc'),limit(count)),snapshot=>{
      setEvents(snapshot.docs.map(d=>({id:d.id,...d.data()} as CommunityActivity)));setActivityLoading(false);setActivityError('');
    },()=>{setActivityError('Community activity couldn’t load. Check your connection and try again.');setActivityLoading(false);});
  },[active,includeActivity,settings.joined,user?.uid,count]);
  const missing=useMemo(()=>[...new Set(events.map(event=>event.uid))].filter(id=>!profiles.some(profile=>profile.id===id)),[events,profiles]);
  const extraProfiles=useCommunityProfiles(missing,active&&includeActivity&&settings.joined);
  const cheers=useVisibleEncouragements(events.map(event=>event.id),active&&includeActivity&&settings.joined);
  const hidden=settings.blockedUids;
  return {profiles:profiles.filter(profile=>!hidden.includes(profile.id)),profileCount:profiles.length,profileMap:new Map([...extraProfiles.values(),...profiles].filter(profile=>!hidden.includes(profile.id)).map(profile=>[profile.id,profile])),events:events.filter(event=>!hidden.includes(event.uid)),eventCount:events.length,error:includeActivity?activityError||cheers.error:profileError,loading:includeActivity?activityLoading:profilesLoading,cheeredIds:cheers.ids,encouragementReady:cheers.ready};
}

/** Scope reaction state to visible events, regardless of lifetime reaction count. */
function useVisibleEncouragements(ids:string[],active:boolean) {
  const {user}=useAuth(),key=ids.join(',');
  const [state,setState]=useState<{ids:string[];ready:boolean;error:string}>({ids:[],ready:false,error:''});
  useEffect(()=>{
    if(!ids.length||!user){setState({ids:[],ready:true,error:''});return;}
    if(!active)return;
    setState({ids:[],ready:false,error:''});
    const groups=new Map<number,string[]>(),stops:Array<()=>void>=[];
    const total=Math.ceil(ids.length/30),root=collection(getFirebase().db,USER_COLLECTION,user.uid,'cheeredMilestones');
    for(let start=0;start<ids.length;start+=30) {
      const index=start;
      stops.push(onSnapshot(query(root,where(documentId(),'in',ids.slice(start,start+30))),snapshot=>{
        groups.set(index,snapshot.docs.map(d=>d.id));
        setState({ids:[...groups.values()].flat(),ready:groups.size===total,error:''});
      },()=>setState(previous=>({...previous,ready:false,error:'Your encouragements couldn’t load. Check your connection before trying again.'}))));
    }
    return()=>stops.forEach(stop=>stop());
  },[key,active,user?.uid]);
  return state;
}

export function useCircleMessages(circleId:string|null,active:boolean,count=50) {
  const {settings}=useCommunity();
  const [messages,setMessages]=useState<CircleMessage[]>([]),[circle,setCircle]=useState<(Circle&{memberIds:string[]})|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const lastCircle=useRef<string|null>(null);
  useEffect(()=>{
    if(lastCircle.current!==circleId){setMessages([]);setCircle(null);lastCircle.current=circleId;}
    if(!circleId||!settings.joined){setMessages([]);setCircle(null);setError('');setLoading(false);return;}
    if(!active)return;
    const ref=doc(getFirebase().db,'bibledeptCircles',circleId);setLoading(true);
    setError('');
    const failed=()=>{setMessages([]);setCircle(null);setLoading(false);setError('This circle couldn’t load. It may no longer be available to you.');};
    const stops=[onSnapshot(ref,snapshot=>{setCircle(snapshot.exists()?{id:snapshot.id,...snapshot.data()} as Circle&{memberIds:string[]}:null);if(!snapshot.exists())failed();},failed),
      onSnapshot(query(collection(ref,'bibledeptMessages'),orderBy('createdAt','desc'),limit(count)),snapshot=>{setMessages(snapshot.docs.map(d=>({id:d.id,...d.data()} as CircleMessage)).reverse());setLoading(false);},failed)];
    return()=>stops.forEach(stop=>stop());
  },[circleId,active,settings.joined,count]);
  return {circle,messages:messages.filter(message=>!settings.blockedUids.includes(message.uid)),loading,error};
}

export function useCommunityProfiles(ids:string[],active:boolean) {
  const [profiles,setProfiles]=useState(()=>new Map<string,CommunityProfile>()),key=ids.join(',');
  useEffect(()=>{
    if(!ids.length){setProfiles(new Map());return;}
    if(!active)return;
    const groups=new Map<number,CommunityProfile[]>(),stops:Array<()=>void>=[];
    for(let start=0;start<ids.length;start+=30) {
      const index=start;
      stops.push(onSnapshot(query(collection(getFirebase().db,'bibledeptProfiles'),where(documentId(),'in',ids.slice(start,start+30))),snapshot=>{
        groups.set(index,snapshot.docs.map(d=>({id:d.id,...d.data()} as CommunityProfile)));
        setProfiles(new Map([...groups.values()].flat().map(profile=>[profile.id,profile])));
      },()=>setProfiles(new Map())));
    }
    return()=>stops.forEach(stop=>stop());
  },[key,active]);
  return profiles;
}
