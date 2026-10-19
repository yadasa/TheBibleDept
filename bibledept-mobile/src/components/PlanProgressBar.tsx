import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme';
import { planProgressAppearance } from '../services/planProgressAppearance';
import { luminousPalettes } from '../themeColors';

export function PlanProgressBar({percent}:{percent:number}) {
  const {colors:c,mode}=useTheme(),id=`plan-progress-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`,palette=luminousPalettes[mode];
  const appearance=planProgressAppearance(percent),glow=appearance.glow;
  return <View testID="plan-progress-track" accessibilityRole="progressbar" accessibilityLabel="Reading plan progress"
    accessibilityValue={{min:0,max:100,now:Math.round(appearance.percent)}}
    style={{height:4,marginTop:10,borderRadius:2,backgroundColor:palette.track,boxShadow:palette.trackInset}}>
    {appearance.percent>0&&<View testID="plan-progress-fill" style={{width:`${appearance.percent}%`,height:4,borderRadius:2,
      boxShadow:glow>0?`0 0 ${3+glow*7}px ${glow}px rgba(${palette.progressGlow},${glow*.7}), 0 0 ${1+glow*3}px rgba(${palette.progressCore},${glow*.75})`:undefined}}>
      <Svg width="100%" height={4}>
        <Defs><LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={c.orange}/><Stop offset="100%" stopColor={appearance.tipColor}/>
        </LinearGradient></Defs>
        <Rect x={0} y={0} width="100%" height={4} rx={2} fill={`url(#${id})`}/>
      </Svg>
    </View>}
  </View>;
}
