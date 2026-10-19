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
  const radius=Math.min(150,pageWidth*.38);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize(current=>current.width===width&&current.height===height?current:{width,height});}}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]}
    >
      {size.width>0&&size.height>0&&<Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.width} ${size.height}`}
        style={StyleSheet.absoluteFill}
        aria-hidden
      >
        <Defs>
          {/* Native SVG keeps paint servers in their owning root. Light
              sources share this viewport and paint across the whole track,
              so neighboring pages never expose a clipped gradient edge. */}
          {tabOrder.map((tab, index) => (
            <RadialGradient key={`${tab}warm`} id={`${id}warm${index}`}
              gradientUnits="userSpaceOnUse" cx={index * pageWidth + pageWidth*.86} cy={size.height*.84} rx={radius} ry={radius}>
              <Stop offset={0} stopColor="#F05A00" stopOpacity={dark ? .16 : .1}/>
              <Stop offset={1} stopColor="#F05A00" stopOpacity={0}/>
            </RadialGradient>
          ))}
        </Defs>
        {tabOrder.map((tab, index) => (
          <Rect key={tab} x={0} y={0} width={size.width} height={size.height} fill={`url(#${id}warm${index})`} />
        ))}
      </Svg>}
      <GrainBackground />
    </View>
  );
});
