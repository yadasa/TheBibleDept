import { useId } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { tabOrder } from '../services/tabPaging';
import { PageBackdrop } from './PageBackdrop';
import type { NativeScrollFadeProps } from './NativeScrollFade.types';

/** Composite the exact backdrop over the scroll edge. Only this backdrop is
 * masked: live glass, inputs and scrolling retain their normal native layers. */
export function NativeScrollFade({page,panelWidth,contentTop,screenHeight}:NativeScrollFadeProps) {
  const id=`scrollFade${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  if(panelWidth<=0||screenHeight<=0)return null;
  return <MaskedView testID="native-scroll-fade" pointerEvents="none" accessible={false}
    importantForAccessibility="no-hide-descendants" androidRenderingMode="hardware"
    style={StyleSheet.absoluteFill} maskElement={<View style={styles.mask}>
      <Svg width="100%" height={140}>
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="white" stopOpacity={0}/>
          <Stop offset={1} stopColor="white" stopOpacity={1}/>
        </LinearGradient></Defs>
        <Rect width="100%" height={140} fill={`url(#${id})`}/>
      </Svg>
    </View>}>
    <Animated.View style={{position:'absolute',left:0,top:-contentTop,
      width:panelWidth*tabOrder.length,height:screenHeight,
      transform:[{translateX:page.interpolate({inputRange:[0,tabOrder.length-1],outputRange:[0,-(tabOrder.length-1)*panelWidth]})}]}}>
      <PageBackdrop/>
    </Animated.View>
  </MaskedView>;
}
const styles=StyleSheet.create({mask:{flex:1,justifyContent:'flex-end',backgroundColor:'transparent'}});
