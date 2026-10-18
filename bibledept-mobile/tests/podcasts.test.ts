import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/bibledept-podcasts.json';
import { audioTime, getDayPodcast } from '../src/services/podcasts';

test('every plan day has its own publisher episode and HTTPS audio stream',()=>{
  assert.equal(data.episodes.length,365);
  const pages=new Set<string>(),audio=new Set<string>();
  for(let day=1;day<=365;day++){
    const episode=getDayPodcast(day)!;
    assert.equal(episode.day,day);
    assert.ok(episode.title.startsWith(`Day ${day}: `));
    assert.match(episode.audioUrl,/^https:\/\/audio3\.redcircle\.com\/episodes\/[0-9a-f-]{36}\/stream\.mp3$/);
    assert.match(episode.episodeUrl,/^https:\/\/redcircle\.com\/shows\/the-bible-dept\/ep\/[0-9a-f-]{36}$/);
    assert.ok(Number.isInteger(episode.durationSeconds)&&episode.durationSeconds>0);
    pages.add(episode.episodeUrl);audio.add(episode.audioUrl);
  }
  assert.equal(pages.size,365);assert.equal(audio.size,365);
  assert.equal(getDayPodcast(1)?.title,'Day 1: Luke 1-3');
  assert.equal(getDayPodcast(365)?.title,'Day 365: 2 Chronicles 34-36');
  for(const day of [0,366,1.5,NaN])assert.equal(getDayPodcast(day),undefined);
});

test('reviewed title differences are visible without changing the reading plan',()=>{
  assert.deepEqual(Object.keys(data.readings).map(Number),[131,166,167,237,238,320]);
  assert.equal(getDayPodcast(54)?.rangeNote,undefined);
  assert.match(getDayPodcast(131)!.rangeNote!,/Deuteronomy 19-22.*Deuteronomy 19-21/);
  assert.match(getDayPodcast(237)!.rangeNote!,/Ezekiel 40-44.*Ezekiel 40-46/);
});

test('audio timestamps handle loading values and invalid durations',()=>{
  assert.equal(audioTime(0),'0:00');assert.equal(audioTime(943),'15:43');
  assert.equal(audioTime(65.8),'1:05');assert.equal(audioTime(NaN),'0:00');assert.equal(audioTime(-1),'0:00');
});
