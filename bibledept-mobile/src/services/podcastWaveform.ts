const RESTING_HEIGHT=.67,PAST_FALLOFF_PITCHES=4,FUTURE_FALLOFF_PITCHES=2;
const bounded=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;

/** Neutral luminance preserves the source brightness without any orange hue. */
export function desaturatedPodcastColor(hex:string):string {
  const channels=/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  const gray=channels?Math.round(parseInt(channels[1],16)*.2126+parseInt(channels[2],16)*.7152+parseInt(channels[3],16)*.0722):128;
  return `rgb(${gray},${gray},${gray})`;
}

/** Reduce the previous opacity by one third, including touch/drag feedback. */
export function podcastFutureOpacity(previous:number):number {
  'worklet';
  return Number.isFinite(previous)?Math.max(0,Math.min(1,previous))*.67:0;
}

/** Complementary clips keep translucent or blurred future bars off played bars. */
export function podcastWaveformSplit(progress:number,width:number):{playedWidth:number;futureX:number;futureWidth:number} {
  'worklet';
  const span=Number.isFinite(width)?Math.max(0,width):0;
  const fraction=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  const playedWidth=span*fraction;
  return {playedWidth,futureX:playedWidth,futureWidth:span-playedWidth};
}

/** Choose once from the complete reference, never from each live PCM update. */
export function podcastAmplitudePeak(reference:readonly number[]):number {
  let peak=0;
  for(const value of reference)peak=Math.max(peak,bounded(value));
  return peak||1;
}

/** Historical and live RMS share a fixed, linear episode scale. */
export function normalizePodcastAmplitude(value:number,referencePeak:number):number {
  const scale=bounded(referencePeak)||1;
  return bounded(value/scale);
}

/** Average the last few visible bars before the cursor, in rendered pixels. */
export function previousPodcastBarHeight(levels:readonly number[],progress:number,height:number,cap=1,minimum=0,lookback=4):number {
  'worklet';
  if(!levels.length||!Number.isFinite(progress)||!Number.isFinite(height)||height<=0)return 0;
  const fraction=Math.max(0,Math.min(1,progress));
  const end=Math.max(1,Math.min(levels.length,Math.floor(fraction*levels.length)));
  const count=Number.isFinite(lookback)?Math.max(1,Math.floor(lookback)):4;
  const start=Math.max(0,end-count);
  const scale=Number.isFinite(cap)?Math.max(0,Math.min(1,cap)):0;
  const floor=Number.isFinite(minimum)?Math.max(0,Math.min(height,minimum)):0;
  let sum=0;
  for(let index=start;index<end;index++) {
    const value=levels[index];
    const level=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
    sum+=Math.max(floor,level*height*scale);
  }
  return sum/(end-start);
}

/** Live influence falls off faster ahead of playback than behind it. */
export function podcastLiveBarWeight(index:number,count:number,progress:number):number {
  if(!Number.isInteger(index)||!Number.isInteger(count)||count<=0||index<0||index>=count||!Number.isFinite(progress))return 0;
  const current=Math.min(count-1,Math.floor(bounded(progress)*count));
  const radius=index>current?FUTURE_FALLOFF_PITCHES:PAST_FALLOFF_PITCHES;
  const proximity=Math.max(0,1-Math.abs(index-current)/radius);
  return proximity*proximity*(3-2*proximity);
}

/**
 * Keep the measured silhouette below 67% at rest, preserving relative heights.
 * Nearby bars respond to the real current PCM level with a smooth falloff;
 * only the current bar can reach 100%. Apply this after visual downsampling.
 */
export function renderedPodcastAmplitude(historical:number,live:number,playing:boolean,index:number,count:number,progress:number,referencePeak=1,recentRestAverage=0):number {
  const resting=bounded(historical)*RESTING_HEIGHT;
  const weight=playing?podcastLiveBarWeight(index,count,progress):0;
  const cap=RESTING_HEIGHT+(1-RESTING_HEIGHT)*weight;
  const actual=normalizePodcastAmplitude(live,referencePeak);
  // A 33% dip below the preceding measured average is 67% of that average,
  // never a negative height. The caller derives it from the unmodulated profile
  // so this lower bound cannot feed back through its own live response.
  const floor=bounded(recentRestAverage)*.67*weight;
  return Math.max(.035,floor,Math.min(cap,resting*(1-weight)+actual*cap*weight));
}
