import { collection, doc, documentId, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ACHIEVEMENTS, AchievementMetrics, Circle, circleHasUnread, CircleMessage, CommunityActivity, CommunityProfile, CommunitySettings, DEFAULT_COMMUNITY, EarnedAchievement, EMPTY_METRICS } from '../../shared/community';
import { useAuth } from './AuthProvider';
import { callBackend, getFirebase } from './firebase';
import { USER_COLLECTION } from './dataPaths';
import { communityErrorForUser } from './communityError';

type CommunityState={settings:CommunitySettings;ready:boolean;metrics:AchievementMetrics;earned:EarnedAchievement[];newlyEarned:string[];dismissNewBadges:()=>void;circles:Circle[];error:string;perform:<T=unknown>(name:string,data:unknown)=>Promise<T>};
const Context=createContext<CommunityState|null>(null);
export function CommunityProvider({children}:{children:ReactNode}) {
  const {user}=useAuth();
  return <CommunitySession owner={user?.uid}>{children}</CommunitySession>;
}
function CommunitySession({owner,children}:{owner?:string;children:ReactNode}) {
  const [settings,setSettings]=useState<CommunitySettings>(DEFAULT_COMMUNITY),[ready,setReady]=useState(!owner);
  const [metrics,setMetrics]=useState(EMPTY_METRICS),[earned,setEarned]=useState<EarnedAchievement[]>([]),[circles,setCircles]=useState<Circle[]>([]),[error,setError]=useState('');
  const [circleDetails,setCircleDetails]=useState<Circle[]>([]),[circleReads,setCircleReads]=useState(()=>new Map<string,string>());
  const [newlyEarned,setNewlyEarned]=useState<string[]>([]),knownAwards=useRef<Set<string>|null>(null);
  const dismissNewBadges=useCallback(()=>setNewlyEarned([]),[]);
  const [sessionOwner,setSessionOwner]=useState(owner);
  // Reset before rendering children for another account, while preserving the
  // app shell's navigation without introducing another sign-in/sign-out reset.
  if(sessionOwner!==owner) {
    setSessionOwner(owner);setSettings(DEFAULT_COMMUNITY);setReady(!owner);
    setMetrics(EMPTY_METRICS);setEarned([]);setCircles([]);setCircleDetails([]);setCircleReads(new Map());setError('');
    setNewlyEarned([]);knownAwards.current=null;
  }
  const perform=useCallback(async<T,>(name:string,data:unknown):Promise<T>=>{
    try{return await callBackend<T>(name,data,owner);}
    catch(e){throw communityErrorForUser(e);}
  },[owner]);
  useEffect(()=>{
    if(!owner)return;
    const db=getFirebase().db,root=doc(db,USER_COLLECTION,owner);
    const failed=()=>{setReady(true);setError('Your community details couldn’t load. Check your connection.');};
    const stops=[
      onSnapshot(doc(root,'settings','community'),snapshot=>{setSettings({...DEFAULT_COMMUNITY,...snapshot.data()});setReady(true);setError('');},failed),
      onSnapshot(doc(root,'stats','achievements'),snapshot=>setMetrics({...EMPTY_METRICS,...snapshot.data()}),failed),
      onSnapshot(collection(root,'achievements'),{includeMetadataChanges:true},snapshot=>{
        const awards=snapshot.docs.map(d=>({id:d.id,...d.data()} as EarnedAchievement));
        // A partial local cache must not turn existing server awards into new ones.
        if(snapshot.metadata.fromCache){setEarned(awards);return;}
        if(knownAwards.current) {
          const additions=awards.filter(award=>!knownAwards.current!.has(award.id)&&ACHIEVEMENTS.some(item=>item.id===award.id)).map(award=>award.id);
          if(additions.length)setNewlyEarned(previous=>[...new Set([...previous,...additions])]);
        }
        knownAwards.current=new Set(awards.map(award=>award.id));setEarned(awards);
      },failed),
      onSnapshot(collection(root,'circles'),snapshot=>setCircles(snapshot.docs.map(d=>({id:d.id,...d.data()} as Circle))),failed),
    ];
    // Also covers existing accounts whose progress predates achievement triggers.
    void perform('refreshAchievements',{}).catch(()=>{});
    return()=>stops.forEach(stop=>stop());
  },[owner,perform]);
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
  const value=useMemo(()=>({settings,ready,metrics,earned,newlyEarned,dismissNewBadges,circles:visibleCircles,error,perform}),[settings,ready,metrics,earned,newlyEarned,dismissNewBadges,visibleCircles,error,perform]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCommunity(){const value=useContext(Context);if(!value)throw new Error('CommunityProvider is missing.');return value;}

export function useCommunityDirectory(active:boolean,count=40) {
  const {settings}=useCommunity(),{user}=useAuth();
  const [profiles,setProfiles]=useState<CommunityProfile[]>([]),[events,setEvents]=useState<CommunityActivity[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!user||!settings.joined){setProfiles([]);setEvents([]);setError('');setLoading(false);return;}
    if(!active)return; // Keep retained pages stable while the pager travels past them.
    setLoading(true);const db=getFirebase().db;
    const failed=()=>{setError('The community couldn’t load. Check your connection and try again.');setLoading(false);};
    const stops=[
      onSnapshot(query(collection(db,'bibledeptProfiles'),orderBy('displayName'),limit(count)),snapshot=>{setProfiles(snapshot.docs.map(d=>({id:d.id,...d.data()} as CommunityProfile)));setLoading(false);setError('');},failed),
      onSnapshot(query(collection(db,'bibledeptActivity'),orderBy('createdAt','desc'),limit(count)),snapshot=>setEvents(snapshot.docs.map(d=>({id:d.id,...d.data()} as CommunityActivity))),failed),
    ];return()=>stops.forEach(stop=>stop());
  },[active,settings.joined,user?.uid,count]);
  const missing=useMemo(()=>[...new Set(events.map(event=>event.uid))].filter(id=>!profiles.some(profile=>profile.id===id)),[events,profiles]);
  const extraProfiles=useCommunityProfiles(missing,active&&settings.joined);
  const cheers=useVisibleEncouragements(events.map(event=>event.id),active&&settings.joined);
  const hidden=settings.blockedUids;
  return {profiles:profiles.filter(profile=>!hidden.includes(profile.id)),profileMap:new Map([...extraProfiles.values(),...profiles].filter(profile=>!hidden.includes(profile.id)).map(profile=>[profile.id,profile])),events:events.filter(event=>!hidden.includes(event.uid)),error:error||cheers.error,loading,cheeredIds:cheers.ids,encouragementReady:cheers.ready};
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
