import { memo, useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";
import { GrainBackground } from "./GrainBackground";
import { tabOrder } from "../services/tabPaging";

/** Broad reflected light gives frosted material something visible to transmit. */
export const PageBackdrop = memo(function PageBackdrop() {
  const { mode, colors: c } = useTheme(),
    dark = mode === "dark";
  const id = `paper${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [size,setSize]=useState({width:0,height:0});
  const pageWidth=size.width/tabOrder.length;
  // Real pixel coordinates keep the glow circular on both a phone and a wide
  // preview. A stretched fixed viewBox turned it into a page-sized wash.
  const radius=Math.min(210,pageWidth*.42);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize(current=>current.width===width&&current.height===height?current:{width,height});}}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]}
    >
      {size.width>0&&size.height>0&&tabOrder.map((tab,index)=><View key={tab} testID={`page-glow-${tab}`} style={{position:'absolute',left:index*pageWidth,top:0,width:pageWidth,height:size.height}}>
      <Svg width={pageWidth} height={size.height} viewBox={`0 0 ${pageWidth} ${size.height}`} aria-hidden>
        <Defs>
          {/* Each view owns one local paint server and circle. The shared
              track moves these page-sized viewports without stretching them. */}
            <RadialGradient key={`${tab}warm`} id={`${id}warm${index}`}
              gradientUnits="userSpaceOnUse" cx={pageWidth*.85} cy={Math.max(radius,size.height*.32)} r={radius}>
              <Stop offset={0} stopColor={c.orange} stopOpacity={dark ? .16 : .1}/>
              <Stop offset={1} stopColor={c.orange} stopOpacity={0}/>
            </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={pageWidth} height={size.height} fill={`url(#${id}warm${index})`} />
      </Svg></View>)}
      <GrainBackground />
    </View>
  );
});
