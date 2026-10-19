import { ReactNode, useLayoutEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useReducedMotion } from '../LiquidBottomNav';

/** Short route feedback without moving or retaining a second interactive page. */
export function AccountTransition({pageKey,children}:{pageKey:string;children:ReactNode}) {
  const reduced=useReducedMotion(),progress=useRef(new Animated.Value(1)).current,previous=useRef(pageKey);
  useLayoutEffect(()=>{
    progress.stopAnimation();
    if(previous.current===pageKey||reduced){previous.current=pageKey;progress.setValue(1);return;}
    previous.current=pageKey;progress.setValue(0);
    const animation=Animated.timing(progress,{toValue:1,duration:180,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'});
    animation.start();return()=>animation.stop();
  },[pageKey,progress,reduced]);
  return <Animated.View style={{opacity:progress.interpolate({inputRange:[0,1],outputRange:[.82,1]}),transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}}>{children}</Animated.View>;
}
