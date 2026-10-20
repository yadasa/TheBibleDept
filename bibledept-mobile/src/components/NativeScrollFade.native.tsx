import { memo, useId, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { tabOrder } from '../services/tabPaging';
import { PageBackdrop } from './PageBackdrop';
import type { NativeScrollFadeProps } from './NativeScrollFade.types';

/** Composite the exact backdrop over the scroll edge. Only this backdrop is
 * masked: live glass, inputs and scrolling retain their normal native layers. */
export function NativeScrollFade(props:NativeScrollFadeProps) { return <MemoizedScrollFade {...props}/>; }
const FADE_HEIGHT=140;
const MemoizedScrollFade=memo(function ScrollFadeStrip({page,panelWidth,contentTop,screenHeight}:NativeScrollFadeProps) {
  const id=`scrollFade${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const [viewportHeight,setViewportHeight]=useState(0);
  if(panelWidth<=0||screenHeight<=0)return null;
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}
    onLayout={event=>setViewportHeight(event.nativeEvent.layout.height)}>
    {viewportHeight>0&&<MaskedView testID="native-scroll-fade" pointerEvents="none" accessible={false}
    importantForAccessibility="no-hide-descendants" androidRenderingMode="hardware"
    style={{position:'absolute',left:0,right:0,bottom:0,height:FADE_HEIGHT,overflow:'hidden'}} maskElement={<View style={styles.mask}>
      <Svg width="100%" height={FADE_HEIGHT}>
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="white" stopOpacity={0}/>
          <Stop offset={1} stopColor="white" stopOpacity={1}/>
        </LinearGradient></Defs>
        <Rect width="100%" height={FADE_HEIGHT} fill={`url(#${id})`}/>
      </Svg>
    </View>}>
    <Animated.View style={{position:'absolute',left:0,top:-contentTop-Math.max(0,viewportHeight-FADE_HEIGHT),
      width:panelWidth*tabOrder.length,height:screenHeight,
      transform:[{translateX:page.interpolate({inputRange:[0,tabOrder.length-1],outputRange:[0,-(tabOrder.length-1)*panelWidth]})}]}}>
      <PageBackdrop/>
    </Animated.View>
  </MaskedView>}
  </View>;
});
const styles=StyleSheet.create({mask:{flex:1,justifyContent:'flex-end',backgroundColor:'transparent'}});
