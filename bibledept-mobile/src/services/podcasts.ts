import data from '../data/bibledept-podcasts.json';
import { getReadingPlanDay } from './readingPlan';

export const PODCAST_LINKS = Object.freeze({
  publisher:'https://www.thebibledept.com/listen',
  feed:'https://feeds.redcircle.com/64849f8b-c8f4-4999-8ce6-d9d3450e0cf1',
  apple:'https://podcasts.apple.com/us/podcast/the-bible-dept/id1785301806',
  spotify:'https://open.spotify.com/show/7fbgOgSXnWxwnwp57k32FM',
});

function uuid(value:string):string {
  return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20)}`;
}

export function getDayPodcast(day:number) {
  const plan=getReadingPlanDay(day);
  if(!plan)return undefined;
  const [guid,audioId,seconds]=data.episodes[day-1] as [string,string,number];
  const reading=(data.readings as Record<string,string>)[String(day)]||plan.label;
  return Object.freeze({day,title:`Day ${day}: ${reading}`,reading,durationSeconds:seconds,
    audioUrl:`https://audio3.redcircle.com/episodes/${uuid(audioId)}/stream.mp3`,
    episodeUrl:`https://redcircle.com/shows/the-bible-dept/ep/${uuid(guid)}`,
    rangeNote:reading!==plan.label?`Episode reading: ${reading}. Printed plan: ${plan.label}.`:undefined,
  });
}

export function audioTime(seconds:number):string {
  const value=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
  return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
}
