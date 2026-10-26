import { useId } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Achievement } from '../../../shared/community';

/** A book illuminated by a rising star, held by laurel branches. No numeral motif. */
export function BadgeArt({symbol='club',size=72,locked=false,compact=false}:{symbol?:Achievement['symbol'];size?:number;locked?:boolean;compact?:boolean}) {
  const id=useId().replace(/:/g,''),gold=locked?'#9A8C7E':'#E7BB69',light=locked?'#C9BEB1':'#FFF0CB';
  const paths:Record<Exclude<Achievement['symbol'],'club'>,string>={
    book:'M50 36v35M50 38c-9-6-18-6-25-3v31c9-3 17-2 25 5 8-7 16-8 25-5V35c-7-3-16-3-25 3Z',
    flame:'M53 25c3 14-12 18-9 29 6-3 10-11 10-11 12 9 17 17 17 25a21 21 0 0 1-42 0c0-13 9-24 24-43Z',
    leaf:'M28 72c28 0 45-15 44-45-30-1-45 16-44 45Zm0 0 32-32',
    sun:'M50 25v-8m0 66v-8M25 50h-8m66 0h-8M32 32l-6-6m48 48-6-6m0-36 6-6M26 74l6-6M67 50a17 17 0 1 1-34 0 17 17 0 0 1 34 0Z',
    pen:'m29 64-4 13 14-4 37-37-10-10-37 38Zm29-30 10 10M27 76l10-10',
    people:'M23 72v-7c0-10 7-16 17-16h4c10 0 17 6 17 16v7M52 29a11 11 0 1 1-22 0 11 11 0 0 1 22 0Zm9 13a9 9 0 1 0 1-17m4 25c9 1 13 6 13 14v8',
    heart:'M73 34a15 15 0 0 0-21 0l-2 2-2-2a15 15 0 0 0-21 21l23 22 23-22a15 15 0 0 0 0-21Z',
  };
  const nativeAccessibility=Platform.OS==='web'?{}:{accessible:false};
  return <Svg {...nativeAccessibility} focusable={false} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
    <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={light}/><Stop offset=".48" stopColor={gold}/><Stop offset="1" stopColor={locked?'#72685D':'#A86722'}/></LinearGradient></Defs>
    <Circle cx="50" cy="50" r="47" fill={locked?'#27231F':'#241A12'} stroke={`url(#${id})`} strokeWidth="2.4"/>
    {!compact&&<Circle cx="50" cy="50" r="40.5" fill="none" stroke={gold} strokeWidth=".7" opacity=".5"/>}
    {symbol==='club'&&compact?<>
      <Path d="M50 44v31m0-29c-8-5-17-6-26-3v28c10-2 18 0 26 5 8-5 16-7 26-5V43c-9-3-18-2-26 3Z" fill="none" stroke={light} strokeWidth="5" strokeLinejoin="round"/>
      <Path d="m50 16 3.5 10.5L64 30l-10.5 3.5L50 44l-3.5-10.5L36 30l10.5-3.5Z" fill={gold}/>
    </>:symbol==='club'?<>
      <Path d="M49 79C30 76 20 63 23 45M51 79c19-3 29-16 26-34" fill="none" stroke={gold} strokeWidth="1.8" strokeLinecap="round"/>
      <Path d="M24 57c-8-1-10-7-9-12 7 1 10 6 9 12Zm2 10c-9 1-13-3-14-9 8-1 13 2 14 9Zm7 8c-9 3-14 0-17-5 7-3 14-1 17 5Zm43-18c8-1 10-7 9-12-7 1-10 6-9 12Zm-2 10c9 1 13-3 14-9-8-1-13 2-14 9Zm-7 8c9 3 14 0 17-5-7-3-14-1-17 5Z" fill={gold}/>
      <Path d="M50 43v26m0-24c-6-4-12-5-19-3v22c7-1 13 0 19 5 6-5 12-6 19-5V42c-7-2-13-1-19 3Z" fill="none" stroke={light} strokeWidth="2.2" strokeLinejoin="round"/>
      <Path d="m50 18 2.7 8.3L61 29l-8.3 2.7L50 40l-2.7-8.3L39 29l8.3-2.7Z" fill={`url(#${id})`}/>
      <Path d="M37 48l7 2m-7 5 7 2m12-7 7-2m-7 9 7-2" stroke={gold} strokeWidth="1.4" strokeLinecap="round"/>
    </>:<Path d={paths[symbol]} fill="none" stroke={`url(#${id})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
  </Svg>;
}
