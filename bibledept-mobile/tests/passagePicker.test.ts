import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceSelection, selectPassageVerses, verseChoices } from '../src/services/passagePicker';
import type { Passage } from '../src/services/bible';

const chapter:Passage={reference:'John 3',translation_id:'web',translation_name:'World English Bible',text:'',verses:[15,16,18].map(verse=>({book_id:'JHN',book_name:'John',chapter:3,verse,text:`Verse ${verse}. `}))};
test('book selection respects chapter limits and single-chapter books',()=>{
  assert.deepEqual(referenceSelection('John 3:16-18'),{bookId:'JHN',chapter:3,verse:'16-18'});
  assert.equal(referenceSelection('Jude 8').chapter,1);
  assert.equal(referenceSelection('Psalm 151').chapter,150);
});
test('verse menu uses the actual returned verse numbers',()=>{
  assert.deepEqual(verseChoices(chapter).map(option=>option.value),['all','15','16','18']);
  assert.deepEqual(verseChoices(null),[{value:'all',label:'Whole chapter'}]);
});
test('filtering keeps verse text, correct links and range boundaries without a new request',()=>{
  const selected=selectPassageVerses(chapter,'16-18');
  assert.equal(selected.reference,'John 3:16-18');
  assert.deepEqual(selected.verses.map(verse=>verse.verse),[16,18]);
  assert.equal(selectPassageVerses(chapter,'17'),chapter);
  assert.equal(selectPassageVerses(chapter,'all'),chapter);
  assert.equal(selectPassageVerses(chapter,'18-15'),chapter);
});
