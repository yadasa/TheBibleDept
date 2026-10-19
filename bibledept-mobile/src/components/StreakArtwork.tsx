import { memo, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BRAND_ORANGE, ORANGE_TONES } from '../themeColors';

/** A small vector illustration: its ember grows with the real current streak. */
export const StreakArtwork=memo(function StreakArtwork({days}:{days:number}) {
  const count=Number.isFinite(days)?Math.max(0,Math.floor(days)):0;
  const id=`streak${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const growth=Math.min(1,count/30),scale=count===0?.66:.8+growth*.2;
  return <View testID="reading-streak-artwork" accessible accessibilityRole="image"
    accessibilityLabel={count?`${count}-day reading streak`:'Start a reading streak'} style={s.frame}>
    <Svg width="100%" height="100%" viewBox="0 0 120 120" aria-hidden>
      <Defs>
        <LinearGradient id={`${id}paper`} x1={0} y1={0} x2={1} y2={1}>
          <Stop offset={0} stopColor="#302019"/><Stop offset={1} stopColor="#100F0E"/>
        </LinearGradient>
        <RadialGradient id={`${id}glow`} cx="50%" cy="48%" r="65%">
          <Stop offset={0} stopColor={BRAND_ORANGE} stopOpacity={.22+growth*.32}/>
          <Stop offset={1} stopColor={BRAND_ORANGE} stopOpacity={0}/>
        </RadialGradient>
        <LinearGradient id={`${id}fire`} x1={0} y1={0} x2={0} y2={1}>
          <Stop offset={0} stopColor={ORANGE_TONES.light}/><Stop offset={1} stopColor={BRAND_ORANGE}/>
        </LinearGradient>
      </Defs>
      <Rect width={120} height={120} rx={24} fill={`url(#${id}paper)`}/>
      <Rect width={120} height={120} rx={24} fill={`url(#${id}glow)`}/>
      <Circle cx={60} cy={51} r={36} fill="none" stroke={BRAND_ORANGE} strokeOpacity={.16+growth*.2}/>
      <Circle cx={60} cy={51} r={43} fill="none" stroke="white" strokeOpacity={.055}/>
      <G transform={`translate(60 52) scale(${scale}) translate(-60 -52)`}>
        <Path d="M62 16c5 17-8 23-3 34 7-3 11-10 10-18 13 13 20 24 18 37-2 17-14 26-28 26-17 0-28-12-28-27 0-17 15-28 18-41 0 10 2 15 6 18-2-11 8-18 7-29Z" fill="#000" opacity={.3} transform="translate(0 3)"/>
        <Path d="M62 13c5 17-8 23-3 34 7-3 11-10 10-18 13 13 20 24 18 37-2 17-14 26-28 26-17 0-28-12-28-27 0-17 15-28 18-41 0 10 2 15 6 18-2-11 8-18 7-29Z" fill={`url(#${id}fire)`}/>
        <Path d="M62 52c1 10-8 15-6 22 4-1 7-5 8-9 8 10 7 23-5 25-14-1-16-14-9-23 4-5 8-9 12-15Z" fill="#FFF2D5" opacity={.9}/>
        <Path d="M46 52c-7 10-11 20-5 29" fill="none" stroke="white" strokeOpacity={.28} strokeWidth={1.5} strokeLinecap="round"/>
      </G>
      {count>=7&&<Circle cx={91} cy={24} r={2} fill={ORANGE_TONES.light}/>}
      {count>=30&&<><Circle cx={27} cy={35} r={1.6} fill={ORANGE_TONES.light}/><Path d="M91 65h6m-3-3v6" stroke={ORANGE_TONES.light} strokeOpacity={.7} strokeLinecap="round"/></>}
      <Rect x={.5} y={.5} width={119} height={119} rx={23.5} fill="none" stroke="white" strokeOpacity={.13}/>
    </Svg>
    <View pointerEvents="none" style={s.caption}><Text accessible={false} maxFontSizeMultiplier={1.4} style={s.label}>{count?`${count} ${count===1?'DAY':'DAYS'}`:'START HERE'}</Text></View>
  </View>;
});
const s=StyleSheet.create({frame:{width:104,height:104,borderRadius:22,overflow:'hidden',flexShrink:0},caption:{position:'absolute',bottom:9,left:6,right:6,alignItems:'center'},label:{fontSize:11,lineHeight:15,fontWeight:'800',letterSpacing:1,color:'#FFF5EB',fontVariant:['tabular-nums']}});
