const RESTING_HEIGHT=.67,FALLOFF_PITCHES=4;
const bounded=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;

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

/** Symmetric smoothstep influence around the native playback bar. */
export function podcastLiveBarWeight(index:number,count:number,progress:number):number {
  if(!Number.isInteger(index)||!Number.isInteger(count)||count<=0||index<0||index>=count||!Number.isFinite(progress))return 0;
  const current=Math.min(count-1,Math.floor(bounded(progress)*count));
  const proximity=Math.max(0,1-Math.abs(index-current)/FALLOFF_PITCHES);
  return proximity*proximity*(3-2*proximity);
}

/**
 * Keep the measured silhouette below 67% at rest, preserving relative heights.
 * Nearby bars respond to the real current PCM level with a smooth falloff;
 * only the current bar can reach 100%. Apply this after visual downsampling.
 */
export function renderedPodcastAmplitude(historical:number,live:number,playing:boolean,index:number,count:number,progress:number,referencePeak=1):number {
  const resting=bounded(historical)*RESTING_HEIGHT;
  const weight=playing?podcastLiveBarWeight(index,count,progress):0;
  const cap=RESTING_HEIGHT+(1-RESTING_HEIGHT)*weight;
  const actual=normalizePodcastAmplitude(live,referencePeak);
  return Math.max(.035,Math.min(cap,resting*(1-weight)+actual*cap*weight));
}
