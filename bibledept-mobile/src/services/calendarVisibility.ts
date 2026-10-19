export type CalendarWindow={firstRow:number;lastRow:number;firstColumn:number;lastColumn:number};
type Metrics={active:boolean;chartTop:number|null;scrollTop:number;viewportHeight:number;horizontalOffset:number;viewportWidth:number;cellSize:number;gap:number;padding:number;halo:number;obscuredBottom?:number};

/** Include partially visible halos, but exclude squares hidden behind navigation. */
export function visibleCalendarWindow({active,chartTop,scrollTop,viewportHeight,horizontalOffset,viewportWidth,cellSize,gap,padding,halo,obscuredBottom=96}:Metrics):CalendarWindow|null {
  if(!active||chartTop===null||viewportWidth<=0||viewportHeight<=obscuredBottom||cellSize<=0)return null;
  const pitch=cellSize+gap;
  const range=(count:number,origin:number,start:number,end:number)=>({
    first:Math.max(0,Math.floor((start-origin-cellSize-halo)/pitch)+1),
    last:Math.min(count-1,Math.ceil((end-origin+halo)/pitch)-1),
  });
  const rows=range(7,chartTop+padding,scrollTop,scrollTop+viewportHeight-obscuredBottom);
  const columns=range(26,padding,horizontalOffset,horizontalOffset+viewportWidth);
  return rows.first>rows.last||columns.first>columns.last?null:{firstRow:rows.first,lastRow:rows.last,firstColumn:columns.first,lastColumn:columns.last};
}

export function sameCalendarWindow(a:CalendarWindow|null,b:CalendarWindow|null) {
  return a===b||!!a&&!!b&&a.firstRow===b.firstRow&&a.lastRow===b.lastRow&&a.firstColumn===b.firstColumn&&a.lastColumn===b.lastColumn;
}
