import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotationForSelection, selectPassageVerse, selectedPassageText, selectedVerse, selectionReference } from '../src/services/passageSelection';
import type { Passage, Verse } from '../src/services/bible';
import { validAnnotation } from '../shared/annotations';

const verse = (chapter:number, number:number, text=`Verse ${chapter}:${number}.`):Verse =>
  ({book_id:'LUK',book_name:'Luke',chapter,verse:number,text});
const passage:Passage = {
  reference:'Luke 1:1–3; 2:1',translation_id:'web',translation_name:'World English Bible',text:'',
  verses:[verse(1,1),verse(1,2),verse(1,3),verse(2,1)],
};

test('backward selection saves an ordered range and the same Scripture text in Notes',()=>{
  const selection=selectPassageVerse(selectPassageVerse(null,verse(1,3)),verse(1,1));
  assert.equal(selectionReference(selection),'Luke 1:1–3');
  const annotation=annotationForSelection(passage,selection);
  assert.ok(annotation&&validAnnotation(annotation));
  assert.equal(annotation.verseStart,1);
  assert.equal(annotation.verseEnd,3);
  assert.equal(annotation.excerpt,'Verse 1:1. Verse 1:2. Verse 1:3.');
  assert.equal(annotation.comment,'');
  assert.equal(annotation.translation,'web');
});

test('crossing a chapter or holding a new verse starts a fresh selection',()=>{
  const original=selectPassageVerse(null,verse(1,3));
  const next=selectPassageVerse(original,verse(2,1));
  assert.equal(selectionReference(next),'Luke 2:1');
  assert.equal(selectedVerse(next,verse(1,1)),false);
  assert.equal(selectedVerse(next,verse(2,1)),true);
  const held=selectPassageVerse(original,verse(1,2),true);
  assert.equal(selectionReference(held),'Luke 1:2');
});

test('copy keeps the complete selected text while a saved excerpt respects the existing limit',()=>{
  const longPassage={...passage,verses:[verse(1,1,'A'.repeat(900)),verse(1,2,'B'.repeat(900))]};
  const selection=selectPassageVerse(selectPassageVerse(null,verse(1,1)),verse(1,2));
  assert.equal(selectedPassageText(longPassage,selection).length,1801);
  assert.equal(annotationForSelection(longPassage,selection)?.excerpt.length,1200);
  assert.equal(annotationForSelection(passage,selectPassageVerse(null,verse(3,1))),null);
});
