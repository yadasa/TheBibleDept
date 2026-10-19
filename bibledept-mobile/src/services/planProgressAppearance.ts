import { BRAND_ORANGE } from '../themeColors';

/** Progress changes the gradient tip and bloom, independently of the fill width. */
export function planProgressAppearance(value:number) {
  const percent=Number.isFinite(value)?Math.max(0,Math.min(100,value)):0;
  const white=Math.pow(Math.max(0,Math.min(1,(percent-17)/(95-17))),1.2);
  const rgb=BRAND_ORANGE.slice(1).match(/../g)!.map(channel=>parseInt(channel,16));
  const tipColor=`rgb(${rgb.map(channel=>Math.round(channel+(255-channel)*white)).join(',')})`;
  const glow=percent<=17?0:percent<=33?.18*(percent-17)/(33-17):.18+.82*Math.pow(Math.min(1,(percent-33)/(80-33)),.8);
  return {percent,tipColor,glow};
}
