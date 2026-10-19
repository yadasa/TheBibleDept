/** Fade a verse by its own visible extent, independently of the page-edge mask. */
export function verseVisibilityOpacity(top:number,height:number,viewport:number,obscuredBottom=96) {
  'worklet';
  if(!Number.isFinite(top)||height<=0||viewport<=obscuredBottom)return 1;
  const visible=Math.max(0,Math.min(top+height,viewport-obscuredBottom)-Math.max(top,0));
  const distance=Math.max(24,Math.min(72,height*.7));
  const fraction=Math.min(1,visible/Math.min(height,distance));
  return fraction*fraction*(3-2*fraction);
}
