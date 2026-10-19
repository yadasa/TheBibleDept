/** Apply live speech after downsampling so an older peak cannot mask it. */
export function renderedPodcastAmplitude(historical:number,live:number,playing:boolean,index:number,count:number,progress:number):number {
  const current=Math.min(count-1,Math.max(0,Math.floor(progress*count)));
  if(!playing||index!==current)return historical;
  return Math.max(.035,Math.sqrt(Number.isFinite(live)?Math.max(0,Math.min(1,live)):0));
}
