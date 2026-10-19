import { createContext, memo, useContext, useEffect, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlayerWaveform, RendererProps } from 'react-native-waveforms';
import Animated, { Easing, SharedValue, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, FeGaussianBlur, Filter, G, LinearGradient, Rect, Stop } from 'react-native-svg';

const INPUT_RANGE:[number,number]=[0,1];
const AnimatedRect=Animated.createAnimatedComponent(Rect),AnimatedG=Animated.createAnimatedComponent(G);
const AnimatedGradient=Animated.createAnimatedComponent(LinearGradient);
type RenderConfig={id:string;expansion:SharedValue<number>;contact:SharedValue<number>;clock:SharedValue<number>};
const RenderContext=createContext<RenderConfig|null>(null);

const MiniBar=memo(function MiniBar({level,index,pitch,height,fill,expansion}:{
  level:number;index:number;pitch:number;height:number;fill:string;expansion:SharedValue<number>;
}) {
  const shape=useAnimatedProps(()=>{
    const barHeight=Math.max(1,Math.min(1,level)*height*(.33+.34*expansion.value));
    return {height:barHeight,y:height-barHeight-2};
  });
  return <AnimatedRect x={index*pitch} width={Math.max(1,pitch-2)} rx={1} fill={fill} animatedProps={shape}/>;
});

// Static samples/config mean clock ticks do not rebuild these bar trees.
const MiniBars=memo(function MiniBars({samples:bars,width,height,color}:RendererProps) {
  const {id,expansion,contact,clock}=useContext(RenderContext)!;
  const filled=color==='#FF914D',pitch=(width+2)/Math.max(1,bars.length);
  const fillId=`${id}${filled?'played':'rest'}`,blurId=`${fillId}blur`;
  const clip=useAnimatedProps(()=>({width:Math.max(0,Math.min(width,clock.value*width))}));
  const gradient=useAnimatedProps(()=>({x1:Math.max(0,clock.value*width-4.5*pitch),x2:Math.max(.001,clock.value*width)}));
  const overall=useAnimatedProps(()=>({opacity:Math.min(1,(filled?.55:.32)+(1-(filled?.55:.32))*expansion.value+.08*contact.value)}));
  const blurred=useAnimatedProps(()=>({opacity:1-expansion.value}));
  const sharp=useAnimatedProps(()=>({opacity:expansion.value}));
  const elements=bars.map((level,index)=><MiniBar key={index} level={level} index={index} pitch={pitch} height={height} fill={`url(#${fillId})`} expansion={expansion}/>);
  return <G>
    <Defs>
      {filled&&<ClipPath id={`${id}clip`}><AnimatedRect x={0} y={0} height={height} animatedProps={clip}/></ClipPath>}
      {filled?<AnimatedGradient id={fillId} gradientUnits="userSpaceOnUse" y1={0} y2={0} animatedProps={gradient}>
        <Stop offset={0} stopColor="#FF914D"/><Stop offset={.55} stopColor="#FFD08E"/><Stop offset={1} stopColor="#FFF3C4"/>
      </AnimatedGradient>:<LinearGradient id={fillId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={width} y2={0}>
        <Stop offset={0} stopColor="#C45D29"/><Stop offset={1} stopColor="#E78D51"/>
      </LinearGradient>}
      <Filter id={blurId} x="-10%" y="-30%" width="120%" height="160%"><FeGaussianBlur stdDeviation={1.1}/></Filter>
    </Defs>
    <G clipPath={filled?`url(#${id}clip)`:undefined}>
      <AnimatedG animatedProps={overall}>
        <AnimatedG filter={`url(#${blurId})`} animatedProps={blurred}>{elements}</AnimatedG>
        <AnimatedG animatedProps={sharp}>{elements}</AnimatedG>
      </AnimatedG>
    </G>
  </G>;
});

function renderMiniBars(props:RendererProps) { return <MiniBars {...props}/>; }

/** A complete measured silhouette; playback changes color, never its shape. */
export const MiniPodcastWaveform=memo(function MiniPodcastWaveform({samples,width,height,progress,scrubbing,touching=false}:{
  samples:readonly number[];width:number;height:number;progress:number;scrubbing:boolean;touching?:boolean;
}) {
  const id=`mini${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const amplitudes=useMemo(()=>{
    const peak=Math.max(0,...samples);
    return samples.map(value=>peak>0?Math.max(0,Math.min(1,value/peak)):0);
  },[samples]);
  const expansion=useSharedValue(0),contact=useSharedValue(0),clock=useSharedValue(progress);
  useEffect(()=>{expansion.value=withTiming(scrubbing?1:0,{duration:scrubbing?180:240,easing:Easing.out(Easing.cubic)});},[scrubbing,expansion]);
  useEffect(()=>{contact.value=withTiming(touching||scrubbing?1:0,{duration:touching||scrubbing?140:220,easing:Easing.out(Easing.cubic)});},[touching,scrubbing,contact]);
  useEffect(()=>{clock.value=withTiming(Math.max(0,Math.min(1,progress)),{duration:scrubbing?70:160,easing:Easing.out(Easing.cubic)});},[progress,scrubbing,clock]);
  const config=useMemo(()=>({id,expansion,contact,clock}),[id,expansion,contact,clock]);
  const edge=useAnimatedProps(()=>{
    const maximumHeight=height*(.33+.34*expansion.value);
    return {x:Math.max(0,clock.value*width-2.5),width:Math.min(2.5,Math.max(0,clock.value*width)),y:height-maximumHeight-2,height:maximumHeight,opacity:clock.value>0?.55+.45*contact.value:0};
  });
  if(width<=0||height<=0)return null;
  return <View pointerEvents="none">
    <RenderContext.Provider value={config}><PlayerWaveform samples={amplitudes} inputRange={INPUT_RANGE} width={width} height={height}
      barWidth={2} gap={2} baseline="bottom" rounded renderer={renderMiniBars} color="#C45D29" progressColor="#FF914D" progress={1} isPlaying={false} animationDuration={0}/></RenderContext.Provider>
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <AnimatedRect fill="#FFF3C4" animatedProps={edge}/>
    </Svg>
  </View>;
});
