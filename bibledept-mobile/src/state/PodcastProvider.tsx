import {
  AudioPlayer, AudioSample, AudioStatus, setAudioModeAsync,
  useAudioPlayer, useAudioPlayerStatus, useAudioSampleListener,
} from 'expo-audio';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getDayPodcast } from '../services/podcasts';
import {
  clampPodcastPosition, emptyPodcastSamples, PLAYBACK_RATES,
  podcastDuration, recordPodcastSample,
} from '../services/podcastAudio';

export { PLAYBACK_RATES } from '../services/podcastAudio';
export type Episode = NonNullable<ReturnType<typeof getDayPodcast>>;
export type PodcastState = {
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
  samplingSupported: boolean;
  play: (day: number) => void;
  toggle: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setRate: (rate: number) => void;
  dismiss: () => void;
};

const Context = createContext<PodcastState | null>(null);
const streamError = 'We couldn’t play this episode. Check your connection and try again.';
const audioMode = { playsInSilentMode: true, shouldPlayInBackground: true, allowsRecording: false, interruptionMode: 'doNotMix' } as const;

// This bridge keeps the native hook unconditional while leaving Android's
// microphone-dependent sampling disabled. Listening never requests a mic.
function SampleListener({ player, listener }: { player: AudioPlayer; listener: (sample: AudioSample) => void }) {
  useAudioSampleListener(player, listener);
  return null;
}

export function PodcastProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, {
    updateInterval: 200, downloadFirst: false, preferredForwardBufferDuration: 15,
    ...(Platform.OS === 'web' ? { crossOrigin: 'anonymous' as const } : {}),
  });
  const status = useAudioPlayerStatus(player);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [error, setError] = useState(''), [starting, setStarting] = useState(false);
  const [sourceReady, setSourceReady] = useState(false), [playbackRate, setPlaybackRate] = useState(1);
  const [samples, setSamples] = useState(emptyPodcastSamples), [liveLevel, setLiveLevel] = useState(0);
  const [hasSamples, setHasSamples] = useState(false);
  const [samplingSupported, setSamplingSupported] = useState(Platform.OS !== 'android' && player.isAudioSamplingSupported);
  const episodeRef = useRef<Episode | null>(null), generation = useRef(0), command = useRef(0);
  const alive = useRef(true), wantsPlayback = useRef(false), readyRef = useRef(false);
  const rateRef = useRef(1), lastPosition = useRef(0), lastDuration = useRef(0);
  const bins = useRef(emptyPodcastSamples()), sampleLevel = useRef(0), sampled = useRef(false);
  const publishedAt = useRef(0), publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resume = useRef<{ position: number; generation: number; command: number } | null>(null);
  const loadedGeneration = useRef(-1);
  const modePreparation = useRef<Promise<void> | null>(null);
  const rawStatus = useRef(status);
  rawStatus.current = status;

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
  function publish() {
    stopPublishing();
    if (!alive.current) return;
    publishedAt.current = Date.now();
    setSamples([...bins.current]);
    setHasSamples(sampled.current);
    setLiveLevel(wantsPlayback.current ? sampleLevel.current : 0);
  }
  function fail(message = streamError) {
    if (!alive.current) return;
    wantsPlayback.current = false;
    resume.current = null;
    try { player.pause(); } catch {}
    setStarting(false);
    setLiveLevel(0);
    setError(message);
  }
  const onSample = useCallback((sample: AudioSample) => {
    if (!alive.current || !episodeRef.current || !readyRef.current || !wantsPlayback.current || !rawStatus.current.playing) return;
    const activeDuration = podcastDuration(player.duration, lastDuration.current || episodeRef.current.durationSeconds);
    // A queued packet from before a seek/source change must not draw peaks at
    // another point in the episode. Native PCM timestamps use the media clock.
    if (Math.abs(sample.timestamp - player.currentTime) > 2) return;
    const recorded = recordPodcastSample(bins.current, sample, activeDuration);
    if (!recorded) return;
    bins.current = recorded.samples;
    sampleLevel.current = recorded.liveLevel;
    sampled.current = true;
    const wait = Math.max(0, 100 - (Date.now() - publishedAt.current));
    if (!wait) publish();
    else if (!publishTimer.current) publishTimer.current = setTimeout(publish, wait);
  }, [player]);

  useEffect(() => {
    alive.current = true;
    modePreparation.current = setAudioModeAsync(audioMode);
    modePreparation.current.catch(() => {
      if (alive.current) setError('Audio isn’t available yet. Try playing the episode again.');
    });
    return () => {
      alive.current = false;
      generation.current++;
      command.current++;
      stopPublishing();
      try { player.pause(); player.clearLockScreenControls(); player.setAudioSamplingEnabled(false); } catch {}
    };
  }, [player]);

  useEffect(() => {
    if (!episodeRef.current) return;
    if (status.error) { fail(); return; }
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
    if (status.playing) wantsPlayback.current = true;
    else if (status.isLoaded && !starting) wantsPlayback.current = false;
    if (status.didJustFinish || (!status.playing && status.isLoaded && !starting)) {
      sampleLevel.current = 0;
      setLiveLevel(0);
    }
    if (status.didJustFinish) wantsPlayback.current = false;
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
    if (Platform.OS === 'android') return;
    try {
      // Web reports unsupported until its analyser is enabled by a user gesture.
      if (Platform.OS === 'web') player.setAudioSamplingEnabled(true);
      setSamplingSupported(player.isAudioSamplingSupported);
    } catch { setSamplingSupported(false); }
  }
  function pause() {
    command.current++;
    wantsPlayback.current = false;
    resume.current = null;
    sampleLevel.current = 0;
    try { player.pause(); } catch { fail(); }
    setStarting(false);
    publish();
  }
  function start(value: Episode, replace: boolean) {
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
        setSourceReady(false);
        setStarting(true);
        stopPublishing();
        if (!same) {
          bins.current = emptyPodcastSamples();
          sampled.current = false;
          sampleLevel.current = 0;
          setSamples([...bins.current]);
          setHasSamples(false);
          setLiveLevel(0);
        }
        lastPosition.current = savedPosition;
        lastDuration.current = same ? lastDuration.current : value.durationSeconds;
        episodeRef.current = value;
        setEpisode(value);
        player.pause();
        player.replace({ uri: value.audioUrl });
        player.shouldCorrectPitch = true;
        player.setPlaybackRate(rateRef.current, 'high');
        if (savedPosition > 0 && savedPosition < lastDuration.current - .1) {
          resume.current = { position: savedPosition, generation: generation.current, command: currentCommand };
        } else resume.current = null;
      }
      configureMetadata(value);
      enableSampling();
      const state = rawStatus.current;
      if (!replace && (state.didJustFinish || lastPosition.current >= lastDuration.current - .1)) {
        const currentGeneration = generation.current;
        setStarting(true);
        lastPosition.current = 0;
        player.seekTo(0).then(() => {
          if (alive.current && command.current === currentCommand && generation.current === currentGeneration && wantsPlayback.current) player.play();
        }).catch(() => { if (command.current === currentCommand) fail(); });
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
      if (problem || !modePreparation.current) modePreparation.current = setAudioModeAsync(audioMode);
      Promise.resolve(modePreparation.current).then(() => {
        if (alive.current && command.current === requestedCommand) start(value, replace);
      }).catch(() => fail('Audio isn’t available yet. Try playing the episode again.'));
    }
  }
  function toggle() { if (episodeRef.current) play(episodeRef.current.day); }
  function seek(seconds: number) {
    if (!episodeRef.current || !readyRef.current || problem || !Number.isFinite(seconds)) return;
    const target = clampPodcastPosition(seconds, podcastDuration(player.duration, lastDuration.current));
    lastPosition.current = target;
    sampleLevel.current = 0;
    setLiveLevel(0);
    const currentGeneration = generation.current;
    try {
      player.seekTo(target).catch(() => { if (generation.current === currentGeneration) fail('We couldn’t skip to that point. Try again.'); });
    } catch { fail('We couldn’t skip to that point. Try again.'); }
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
    sampled.current = false;
    setEpisode(null);
    setSourceReady(false);
    setError('');
    setSamples([...bins.current]);
    setHasSamples(false);
    try { player.clearLockScreenControls(); player.setAudioSamplingEnabled(false); player.replace(null); } catch {}
  }

  return <Context.Provider value={{ episode, status, error: problem, loading, duration, position, playbackRate,
    samples, liveLevel, hasSamples, samplingSupported, play, toggle, pause, seek, setRate, dismiss }}>
    {episode && samplingSupported && Platform.OS !== 'android' && <SampleListener player={player} listener={onSample}/>}
    {children}
  </Context.Provider>;
}

export function usePodcast(): PodcastState {
  const value = useContext(Context);
  if (!value) throw new Error('usePodcast must be used inside PodcastProvider.');
  return value;
}
