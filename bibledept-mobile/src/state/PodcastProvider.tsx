import {
  AudioPlayer, AudioSample, AudioStatus, setAudioModeAsync, setIsAudioActiveAsync,
  useAudioPlayer, useAudioPlayerStatus, useAudioSampleListener,
} from 'expo-audio';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getDayPodcast } from '../services/podcasts';
import { getPodcastReferenceWaveform } from '../services/podcastReferenceWaveforms';
import { PodcastListeningContext, PodcastListeningState, usePodcastListeningEngine } from './usePodcastListening';
import { createPodcastSamplingDemand } from '../services/podcastSamplingDemand';
import {
  canSamplePodcast, clampPodcastPosition, createPodcastSessionQueue, emptyPodcastSamples, PLAYBACK_RATES,
  needsPodcastSessionActivation, podcastDuration, podcastSampleTime, recordPodcastSample,
} from '../services/podcastAudio';

export { PLAYBACK_RATES } from '../services/podcastAudio';
export { usePodcastListening } from './usePodcastListening';
export type Episode = NonNullable<ReturnType<typeof getDayPodcast>>;
export type PodcastState = PodcastListeningState & {
  episode: Episode | null;
  status: AudioStatus;
  error: string;
  loading: boolean;
  duration: number;
  position: number;
  playbackRate: number;
  samples: number[];
  liveLevel: number;
  hasSamples: boolean;
  hasLiveSamples: boolean;
  hasReferenceWaveform: boolean;
  samplingSupported: boolean;
  play: (day: number) => void;
  toggle: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setRate: (rate: number) => void;
  dismiss: () => void;
};

const Context = createContext<PodcastState | null>(null);
const SamplingContext=createContext<ReturnType<typeof createPodcastSamplingDemand>|null>(null);

export function usePodcastSamplingDemand(visible:boolean) {
  const demand=useContext(SamplingContext),[consumer]=useState(()=>Symbol('full-player'));
  useEffect(()=>{
    demand?.set(consumer,visible);
    return()=>demand?.set(consumer,false);
  },[demand,consumer,visible]);
}
const streamError = 'We couldn’t play this episode. Check your connection and try again.';
const audioMode = { playsInSilentMode: true, shouldPlayInBackground: true, allowsRecording: false, interruptionMode: 'doNotMix' } as const;
// Development isolation only: a fresh run with this flag never installs a PCM
// tap, so phone playback can be compared against the same stream without it.
const disableSamplingForPlaybackCheck = __DEV__ && process.env.EXPO_PUBLIC_PODCAST_DISABLE_SAMPLING === '1';

// This bridge keeps the native hook unconditional while leaving Android's
// microphone-dependent sampling disabled. Listening never requests a mic.
function SampleListener({ player, listener }: { player: AudioPlayer; listener: (sample: AudioSample) => void }) {
  useAudioSampleListener(player, listener);
  useEffect(() => () => {
    // On iOS the SDK hook removes its subscription but leaves the native PCM
    // processing tap enabled. Remove that tap while the UI is backgrounded.
    try { player.setAudioSamplingEnabled(false); } catch {}
  }, [player]);
  return null;
}

export function PodcastProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, {
    updateInterval: 200, downloadFirst: false, preferredForwardBufferDuration: 15,
    // SDK57's automatic 100ms deactivation sees a buffering player as idle.
    // Own session release explicitly instead of racing that delayed task.
    keepAudioSessionActive: true,
    ...(Platform.OS === 'web' ? { crossOrigin: 'anonymous' as const } : {}),
  });
  const status = useAudioPlayerStatus(player);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [error, setError] = useState(''), [starting, setStarting] = useState(false);
  const [sourceReady, setSourceReady] = useState(false), [playbackRate, setPlaybackRate] = useState(1);
  const [samples, setSamples] = useState(emptyPodcastSamples), [liveLevel, setLiveLevel] = useState(0);
  const [hasSamples, setHasSamples] = useState(false);
  const [hasLiveSamples, setHasLiveSamples] = useState(false);
  const [needsLiveSamples,setNeedsLiveSamples]=useState(false);
  const [samplingDemand]=useState(()=>createPodcastSamplingDemand(setNeedsLiveSamples));
  const [appState, setAppState] = useState(AppState.currentState);
  const appActive = useRef(AppState.currentState === 'active');
  const [sessionQueue] = useState(createPodcastSessionQueue);
  const [samplingSupported, setSamplingSupported] = useState(!disableSamplingForPlaybackCheck && Platform.OS !== 'android' && player.isAudioSamplingSupported);
  const episodeRef = useRef<Episode | null>(null), generation = useRef(0), command = useRef(0);
  const alive = useRef(true), wantsPlayback = useRef(false), readyRef = useRef(false);
  const rateRef = useRef(1), lastPosition = useRef(0), lastDuration = useRef(0);
  const bins = useRef(emptyPodcastSamples()), sampleLevel = useRef(0), sampled = useRef(false);
  const heardBins = useRef(emptyPodcastSamples());
  const publishedAt = useRef(0), publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resume = useRef<{ position: number; generation: number; command: number } | null>(null);
  const loadedGeneration = useRef(-1);
  const lockScreenGeneration = useRef(-1);
  const sessionReleased = useRef(false), sessionActivation = useRef<number | null>(null);
  const rawStatus = useRef(status);
  const previousPlaying = useRef(false), previousError = useRef<string | null>(null);
  rawStatus.current = status;
  const listening = usePodcastListeningEngine(player, () =>
    readyRef.current && episodeRef.current ? { day: episodeRef.current.day, generation: generation.current } : null);

  const hasLoadedStatus = sourceReady && status.isLoaded && !status.error;
  const duration = episode ? podcastDuration(hasLoadedStatus ? status.duration : 0, lastDuration.current || episode.durationSeconds) : 0;
  const position = episode ? clampPodcastPosition(hasLoadedStatus ? status.currentTime : lastPosition.current, duration) : 0;
  if (hasLoadedStatus) {
    lastDuration.current = duration;
    lastPosition.current = position;
  }
  const problem = error || (episode && status.error ? streamError : '');
  const loading = !!episode && !problem && (starting || (status.isBuffering && wantsPlayback.current));

  function stopPublishing() {
    if (publishTimer.current) clearTimeout(publishTimer.current);
    publishTimer.current = null;
  }
  function diagnostic(event: string, state = rawStatus.current, nativePosition = state.currentTime) {
    if (!__DEV__ || !episodeRef.current) return;
    console.info('[BibleDept audio]', new Date().toISOString(), event, {
      playing: state.playing, buffering: state.isBuffering, loaded: state.isLoaded,
      position: Number.isFinite(nativePosition) ? Math.round(nativePosition * 1000) / 1000 : 0,
      control: state.timeControlStatus, hasError: !!state.error, samplingDisabled: disableSamplingForPlaybackCheck,
    });
  }
  function publish() {
    stopPublishing();
    if (!alive.current) return;
    publishedAt.current = Date.now();
    setSamples([...bins.current]);
    setHasSamples(sampled.current || !!(episodeRef.current && getPodcastReferenceWaveform(episodeRef.current.day)));
    setHasLiveSamples(sampled.current);
    setLiveLevel(wantsPlayback.current ? sampleLevel.current : 0);
  }
  function fail(message = streamError) {
    if (!alive.current) return;
    listening.breakContinuity();
    command.current++;
    wantsPlayback.current = false;
    resume.current = null;
    try { player.pause(); } catch {}
    setStarting(false);
    setLiveLevel(0);
    setError(message);
    releaseSession(command.current);
  }
  const onSample = useCallback((sample: AudioSample) => {
    if (disableSamplingForPlaybackCheck || !alive.current || !appActive.current || !episodeRef.current || !readyRef.current || !wantsPlayback.current || !rawStatus.current.playing) return;
    const activeDuration = podcastDuration(player.duration, lastDuration.current || episodeRef.current.durationSeconds);
    const timestamp = podcastSampleTime(sample.timestamp, player.currentTime, Platform.OS);
    if (timestamp === null) return;
    const recorded = recordPodcastSample(heardBins.current, { ...sample, timestamp }, activeDuration);
    if (!recorded) return;
    heardBins.current = recorded.samples;
    // Keep genuine future bars from the reference stream, but replace heard
    // bins (including real silence) with this playback's PCM. Dynamic ads may
    // differ from the reference request; live data must take precedence.
    const index = Math.min(bins.current.length - 1, Math.floor(timestamp / activeDuration * bins.current.length));
    bins.current[index] = heardBins.current[index];
    sampleLevel.current = recorded.liveLevel;
    sampled.current = true;
    const wait = Math.max(0, 100 - (Date.now() - publishedAt.current));
    if (!wait) publish();
    else if (!publishTimer.current) publishTimer.current = setTimeout(publish, wait);
  }, [player]);

  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', next => {
      try { diagnostic(next, player.currentStatus, player.currentTime); } catch {}
      appActive.current = next === 'active';
      setAppState(next);
      if (next !== 'active') {
        stopPublishing();
        sampleLevel.current = 0;
        setLiveLevel(0);
        try { player.setAudioSamplingEnabled(false); } catch {}
      } else if (episodeRef.current && canSamplePodcast(next, Platform.OS, player.isAudioSamplingSupported, disableSamplingForPlaybackCheck)) {
        // React may defer the bridge's unmount while iOS suspends JS. Restore
        // the native tap explicitly even if both visibility renders coalesced.
        try { player.setAudioSamplingEnabled(true); } catch {}
      }
    });
    return () => {
      alive.current = false;
      generation.current++;
      command.current++;
      subscription.remove();
      stopPublishing();
      try { player.pause(); player.clearLockScreenControls(); player.setAudioSamplingEnabled(false); } catch {}
      if (Platform.OS !== 'web') void sessionQueue(() => !alive.current, () => setIsAudioActiveAsync(false)).catch(() => {});
    };
  }, [player]);

  useEffect(() => {
    const unexpectedStop = previousPlaying.current && !status.playing &&
      !appActive.current && wantsPlayback.current && !status.didJustFinish;
    if (unexpectedStop) diagnostic('background playback stopped');
    if (status.error && status.error !== previousError.current) diagnostic('playback error');
    previousPlaying.current = status.playing;
    previousError.current = status.error;
  }, [status.playing, status.error, status.didJustFinish]);

  useEffect(() => {
    if (!episodeRef.current) return;
    if (status.error) { fail(); return; }
    // Native lock-screen Play bypasses AudioModule.play(), whose wrapper
    // activates AVAudioSession. Restore a deliberately released session only
    // when the current native player actually requests playback, never for a
    // paused status or just because the app returned to the foreground.
    if (Platform.OS !== 'web' && sessionActivation.current === null) {
      try {
        if (needsPodcastSessionActivation(sessionReleased.current, readyRef.current, player.currentStatus)) {
          wantsPlayback.current = true;
          const token = ++command.current;
          void activateSession(token).catch(() => {
            if (alive.current && command.current === token) fail();
          });
        }
      } catch { /* A released native object is handled by provider cleanup. */ }
    }
    if (status.isLoaded && player.isLoaded) {
      const currentGeneration = generation.current;
      if (loadedGeneration.current !== currentGeneration) {
        loadedGeneration.current = currentGeneration;
        try {
          player.shouldCorrectPitch = true;
          player.setPlaybackRate(rateRef.current, 'high');
        } catch { fail(); return; }
      }
      const pending = resume.current;
      if (pending && pending.generation === currentGeneration) {
        resume.current = null;
        const target = clampPodcastPosition(pending.position, podcastDuration(status.duration, lastDuration.current));
        try {
          player.seekTo(target).then(() => {
            if (!alive.current || generation.current !== pending.generation || command.current !== pending.command) return;
            readyRef.current = true;
            setSourceReady(true);
            setStarting(false);
            if (wantsPlayback.current) player.play();
          }).catch(() => { if (generation.current === pending.generation) fail(); });
        } catch { fail(); return; }
      } else if (!pending) {
        readyRef.current = true;
        setSourceReady(true);
        setStarting(false);
      }
    }
    // Remote lock-screen commands also update intent; they bypass our buttons.
    if (status.playing) {
      wantsPlayback.current = true;
      if (lockScreenGeneration.current !== generation.current) {
        configureMetadata(episodeRef.current);
        lockScreenGeneration.current = generation.current;
      }
    }
    else if (status.isLoaded && !starting) wantsPlayback.current = false;
    if (status.didJustFinish || (!status.playing && status.isLoaded && !starting)) {
      sampleLevel.current = 0;
      setLiveLevel(0);
    }
    if (status.didJustFinish) {
      wantsPlayback.current = false;
      releaseSession(command.current);
    }
  }, [status, player]);

  useEffect(() => {
    if (!loading) return;
    const currentGeneration = generation.current;
    const timer = setTimeout(() => {
      if (generation.current === currentGeneration) fail('This episode is taking too long to load. Check your connection and try again.');
    }, 20000);
    return () => clearTimeout(timer);
  }, [loading, episode?.day, player]);

  function configureMetadata(value: Episode) {
    try {
      player.setActiveForLockScreen(true, {
        title: value.title, artist: 'Dr. Manny Arango', albumTitle: 'The Bible Dept.',
      }, { showSeekForward: true, showSeekBackward: true });
    } catch { /* The audio can still play when system media controls are unavailable. */ }
  }
  function enableSampling() {
    if (disableSamplingForPlaybackCheck || Platform.OS === 'android') return;
    try {
      // Web reports unsupported until its analyser is enabled by a user gesture.
      if (Platform.OS === 'web') player.setAudioSamplingEnabled(true);
      setSamplingSupported(player.isAudioSamplingSupported);
    } catch { setSamplingSupported(false); }
  }
  function releaseSession(token: number) {
    if (Platform.OS === 'web') return;
    void sessionQueue(
      () => alive.current && command.current === token && !wantsPlayback.current,
      async () => { await setIsAudioActiveAsync(false); sessionReleased.current = true; },
    ).catch(() => {});
  }
  function activateSession(token: number) {
    sessionActivation.current = token;
    return sessionQueue(
      () => alive.current && command.current === token,
      async () => {
        await setAudioModeAsync(audioMode);
        if (alive.current && command.current === token) {
          await setIsAudioActiveAsync(true);
          sessionReleased.current = false;
        }
      },
    ).finally(() => { if (sessionActivation.current === token) sessionActivation.current = null; });
  }
  function pause() {
    listening.breakContinuity();
    command.current++;
    wantsPlayback.current = false;
    resume.current = null;
    sampleLevel.current = 0;
    try { player.pause(); } catch { fail(); }
    setStarting(false);
    publish();
    releaseSession(command.current);
  }
  function start(value: Episode, replace: boolean) {
    listening.breakContinuity();
    const currentCommand = ++command.current;
    wantsPlayback.current = true;
    setError('');
    try {
      if (replace) {
        const same = episodeRef.current?.day === value.day;
        const savedPosition = same ? lastPosition.current : 0;
        generation.current++;
        readyRef.current = false;
        loadedGeneration.current = -1;
        lockScreenGeneration.current = -1;
        setSourceReady(false);
        setStarting(true);
        stopPublishing();
        if (!same) {
          const reference = getPodcastReferenceWaveform(value.day);
          bins.current = reference ? [...reference.samples] : emptyPodcastSamples();
          heardBins.current = emptyPodcastSamples();
          sampled.current = false;
          sampleLevel.current = 0;
          setSamples([...bins.current]);
          setHasSamples(!!reference);
          setHasLiveSamples(false);
          setLiveLevel(0);
        }
        lastPosition.current = savedPosition;
        lastDuration.current = same ? lastDuration.current : value.durationSeconds;
        episodeRef.current = value;
        setEpisode(value);
        // replace() already pauses the old AVPlayer; an explicit pause here
        // used to queue native session deactivation during the new buffer.
        player.replace({ uri: value.audioUrl });
        player.shouldCorrectPitch = true;
        player.setPlaybackRate(rateRef.current, 'high');
        if (savedPosition > 0 && savedPosition < lastDuration.current - .1) {
          resume.current = { position: savedPosition, generation: generation.current, command: currentCommand };
        } else resume.current = null;
      }
      enableSampling();
      const state = rawStatus.current;
      if (!replace && (state.didJustFinish || lastPosition.current >= lastDuration.current - .1)) {
        const finishSeek = listening.beginSeek();
        const currentGeneration = generation.current;
        setStarting(true);
        lastPosition.current = 0;
        player.seekTo(0).then(() => {
          if (alive.current && command.current === currentCommand && generation.current === currentGeneration && wantsPlayback.current) player.play();
        }).catch(() => { if (command.current === currentCommand) fail(); }).finally(finishSeek);
      } else if (!resume.current) player.play();
    } catch { fail(); }
  }
  function play(day: number) {
    const value = getDayPodcast(day);
    if (!value) return;
    if (episodeRef.current?.day === day && (player.playing || starting) && !problem) { pause(); return; }
    const replace = episodeRef.current?.day !== day || !!problem || !readyRef.current;
    // Native needs the background session configured before playback. Keeping
    // the web branch synchronous preserves the browser's user activation.
    if (Platform.OS === 'web') start(value, replace);
    else {
      const requestedCommand = ++command.current;
      activateSession(requestedCommand).then(() => {
        if (alive.current && command.current === requestedCommand) start(value, replace);
      }).catch(() => {
        if (alive.current && command.current === requestedCommand) fail('Audio isn’t available yet. Try playing the episode again.');
      });
    }
  }
  function toggle() { if (episodeRef.current) play(episodeRef.current.day); }
  function seek(seconds: number) {
    if (!episodeRef.current || !readyRef.current || problem || !Number.isFinite(seconds)) return;
    const target = clampPodcastPosition(seconds, podcastDuration(player.duration, lastDuration.current));
    const finishSeek = listening.beginSeek();
    lastPosition.current = target;
    sampleLevel.current = 0;
    setLiveLevel(0);
    const currentGeneration = generation.current;
    try {
      player.seekTo(target).catch(() => { if (generation.current === currentGeneration) fail('We couldn’t skip to that point. Try again.'); }).finally(finishSeek);
    } catch { finishSeek(); fail('We couldn’t skip to that point. Try again.'); }
  }
  function setRate(rate: number) {
    if (!(PLAYBACK_RATES as readonly number[]).includes(rate)) return;
    try {
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(rate, 'high');
      rateRef.current = rate;
      setPlaybackRate(rate);
    } catch { setError('We couldn’t change the playback speed. Try again.'); }
  }
  function dismiss() {
    pause();
    generation.current++;
    readyRef.current = false;
    episodeRef.current = null;
    lastPosition.current = 0;
    lastDuration.current = 0;
    bins.current = emptyPodcastSamples();
    heardBins.current = emptyPodcastSamples();
    sampled.current = false;
    setEpisode(null);
    setSourceReady(false);
    setError('');
    setSamples([...bins.current]);
    setHasSamples(false);
    setHasLiveSamples(false);
    try { player.clearLockScreenControls(); player.setAudioSamplingEnabled(false); player.replace(null); } catch {}
  }

  return <SamplingContext.Provider value={samplingDemand}><PodcastListeningContext.Provider value={listening.value}><Context.Provider value={{ ...listening.value, episode, status, error: problem, loading, duration, position, playbackRate,
    samples, liveLevel, hasSamples, hasLiveSamples,
    hasReferenceWaveform: !!episode && !!getPodcastReferenceWaveform(episode.day),
    samplingSupported, play, toggle, pause, seek, setRate, dismiss }}>
    {episode && needsLiveSamples && status.playing && canSamplePodcast(appState, Platform.OS, samplingSupported, disableSamplingForPlaybackCheck) && <SampleListener player={player} listener={onSample}/>}
    {children}
  </Context.Provider></PodcastListeningContext.Provider></SamplingContext.Provider>;
}

export function usePodcast(): PodcastState {
  const value = useContext(Context);
  if (!value) throw new Error('usePodcast must be used inside PodcastProvider.');
  return value;
}
