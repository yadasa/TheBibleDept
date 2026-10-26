import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAppLink, passageLink } from '../src/services/links';

test('passage links preserve reference and translation across supported routes', () => {
  assert.deepEqual(parseAppLink(passageLink('John 3:16–18', 'kjv')), {tab:'Bible',reference:'John 3:16–18',translation:'kjv'});
  assert.deepEqual(parseAppLink('bibledept://read?ref=Luke%201'), {tab:'Bible',reference:'Luke 1',translation:'web'});
  assert.deepEqual(parseAppLink('https://www.thebibledept.com/prayer'), {tab:'Prayer'});
  assert.deepEqual(parseAppLink('bibledept://community'), {tab:'Community'});
  assert.deepEqual(parseAppLink('bibledept://circles'), {tab:'Circles'});
  assert.deepEqual(parseAppLink('https://thebibledept.com/badges'), {tab:'Badges'});
  assert.deepEqual(parseAppLink('exp://10.0.0.35:8081/--/read?ref=John%203', true), {tab:'Bible',reference:'John 3',translation:'web'});
});

test('untrusted, malformed, and production Expo links are ignored', () => {
  for (const value of ['https://thebibledept.com.evil.example/read?ref=Luke1','http://thebibledept.com/read?ref=Luke1','https://user@thebibledept.com/read?ref=Luke1','bibledept://delete-account','bibledept://read?ref=%00','bibledept://read?ref=Luke1&translation=unknown','exp://10.0.0.35:8081/--/account','not a url']) assert.equal(parseAppLink(value), null, value);
});
