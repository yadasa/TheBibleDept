import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameCalendarWindow, visibleCalendarWindow } from '../src/services/calendarVisibility';
const metrics={active:true,chartTop:500,scrollTop:400,viewportHeight:600,horizontalOffset:0,viewportWidth:350,cellSize:20,gap:8,padding:6,halo:3.5};

test('calendar animation stops above/below the viewport, behind navigation or on another page',()=>{
  assert.equal(visibleCalendarWindow({...metrics,active:false}),null);
  assert.equal(visibleCalendarWindow({...metrics,scrollTop:800}),null);
  assert.equal(visibleCalendarWindow({...metrics,scrollTop:0,viewportHeight:590}),null);
  assert.equal(visibleCalendarWindow({...metrics,chartTop:null}),null);
});

test('only visible rows and horizontally scrolled weeks receive animation work',()=>{
  assert.deepEqual(visibleCalendarWindow(metrics),{firstRow:0,lastRow:6,firstColumn:0,lastColumn:12});
  assert.deepEqual(visibleCalendarWindow({...metrics,scrollTop:600,horizontalOffset:364}),{firstRow:3,lastRow:6,firstColumn:12,lastColumn:25});
  assert.deepEqual(visibleCalendarWindow({...metrics,scrollTop:400,viewportHeight:220}),{firstRow:0,lastRow:0,firstColumn:0,lastColumn:12});
});

test('subpixel scrolling keeps the same visibility window and avoids React updates',()=>{
  const a=visibleCalendarWindow(metrics),b=visibleCalendarWindow({...metrics,scrollTop:400.1,horizontalOffset:.1});
  assert.ok(sameCalendarWindow(a,b));assert.ok(sameCalendarWindow(null,null));
  assert.ok(!sameCalendarWindow(a,null));
  assert.ok(!sameCalendarWindow(a,visibleCalendarWindow({...metrics,horizontalOffset:30})));
});
