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
