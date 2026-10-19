import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../services/AuthProvider';
import { PodcastsCoverage, podcastListeningProgress } from '../services/podcastCoverage';
import { createPodcastCoverageStore, podcastPlayedSpan, PodcastPlaybackPoint } from '../services/podcastListening';

export type PodcastListeningState = {
  listenedDays: number[];
  listeningReady: boolean;
  listeningOwner: string;
  listeningError: string;
  listeningProgress: Record<number, { coveredSeconds: number; requiredSeconds: number }>;
};
export const PodcastListeningContext = createContext<PodcastListeningState | null>(null);
export function usePodcastListening(): PodcastListeningState {
  const value = useContext(PodcastListeningContext);
  if (!value) throw new Error('usePodcastListening must be used inside PodcastProvider.');
  return value;
}

type CoverageStore = ReturnType<typeof createPodcastCoverageStore>;
type ActiveStore = { owner: string; store: CoverageStore; loaded: boolean; dirty: boolean };
type Source = { day: number; generation: number } | null;

/** Record local listening separately from the waveform's frequent UI updates. */
export function usePodcastListeningEngine(player: AudioPlayer, source: () => Source) {
  const { user, ready } = useAuth();
  const owner = ready ? user?.uid || 'guest' : 'opening';
  const ownerRef = useRef(owner), sourceRef = useRef(source);
  ownerRef.current = owner; sourceRef.current = source;
  const stores = useRef(new Map<string, CoverageStore>()), active = useRef<ActiveStore | null>(null);
  const anchor = useRef<PodcastPlaybackPoint | null>(null), seekVersion = useRef(0), seeking = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), mounted = useRef(true);
  const [snapshot, setSnapshot] = useState<{ owner: string; ready: boolean; coverage: PodcastsCoverage; error: string }>({ owner: 'opening', ready: false, coverage: {}, error: '' });

  const publish = useCallback(() => {
    const current = active.current;
    if (mounted.current && current?.loaded && current.owner === ownerRef.current)
      setSnapshot({ owner: current.owner, ready: true, coverage: current.store.value, error: '' });
  }, []);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = active.current;
    if (!current?.loaded || !current.dirty) return;
    current.dirty = false;
    publish();
    void current.store.save().catch(() => {
      current.dirty = true;
      if (mounted.current && active.current === current)
        setSnapshot(value => ({ ...value, error: 'We couldn’t save your listening progress. Please try again.' }));
    });
  }, [publish]);
  const capture = useCallback((suppliedStatus?: AudioStatus) => {
    let status: AudioStatus;
    try { status = suppliedStatus || player.currentStatus; }
    catch { anchor.current = null; return; }
    const current = active.current, target = sourceRef.current();
    if (!current?.loaded || current.owner !== ownerRef.current || !target || seeking.current || !status.isLoaded || status.error) {
      anchor.current = null;
      return;
    }
    const next: PodcastPlaybackPoint = {
      ...target, position: status.currentTime, duration: status.duration,
      playing: status.playing, buffering: status.isBuffering, rate: status.playbackRate, time: Date.now(),
    };
    const span = podcastPlayedSpan(anchor.current, next);
    anchor.current = next;
    if (!span) return;
    const wasComplete = podcastListeningProgress(current.store.value[target.day]).complete;
    current.store.add(target.day, span);
    current.dirty = true;
    if (!wasComplete && podcastListeningProgress(current.store.value[target.day]).complete) flush();
    else if (!timer.current) timer.current = setTimeout(flush, 5000);
  }, [player, flush]);

  useEffect(() => {
    mounted.current = true;
    const statuses = player.addListener('playbackStatusUpdate', status => {
      capture(status);
      if (!status.playing || status.didJustFinish || status.error) flush();
    });
    const states = AppState.addEventListener('change', () => { capture(); flush(); });
    return () => {
      capture(); flush(); mounted.current = false;
      statuses.remove(); states.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [player, capture, flush]);

  useEffect(() => {
    flush(); anchor.current = null; seekVersion.current++; seeking.current = false;
    if (!ready) { active.current = null; return; }
    let store = stores.current.get(owner);
    if (!store) {
      store = createPodcastCoverageStore(AsyncStorage, `bibledept.podcast-coverage.v1:${owner}`);
      stores.current.set(owner, store);
    }
    const current: ActiveStore = { owner, store, loaded: false, dirty: false };
    active.current = current;
    void store.load().then(() => {
      if (!mounted.current || active.current !== current) return;
      current.loaded = true;
      anchor.current = null;
      publish();
    }).catch(() => {
      if (mounted.current && active.current === current)
        setSnapshot({ owner, ready: false, coverage: {}, error: 'We couldn’t open your saved listening progress. Please try again.' });
    });
    return () => { flush(); anchor.current = null; };
  }, [owner, ready, flush, publish]);

  const breakContinuity = useCallback(() => { capture(); anchor.current = null; flush(); }, [capture, flush]);
  const beginSeek = useCallback(() => {
    capture(); flush(); anchor.current = null; seeking.current = true;
    const version = ++seekVersion.current;
    return () => { if (seekVersion.current === version) { seeking.current = false; anchor.current = null; } };
  }, [capture, flush]);
  const value = useMemo<PodcastListeningState>(() => {
    const loaded = snapshot.owner === owner && snapshot.ready;
    const listeningProgress: PodcastListeningState['listeningProgress'] = {}, listenedDays: number[] = [];
    if (loaded) for (const [day, coverage] of Object.entries(snapshot.coverage)) {
      const progress = podcastListeningProgress(coverage);
      listeningProgress[Number(day)] = { coveredSeconds: progress.coveredSeconds, requiredSeconds: progress.requiredSeconds };
      if (progress.complete) listenedDays.push(Number(day));
    }
    return { listenedDays, listeningReady: loaded, listeningOwner: owner, listeningProgress, listeningError: snapshot.owner === owner ? snapshot.error : '' };
  }, [owner, snapshot]);
  return { value, breakContinuity, beginSeek };
}
