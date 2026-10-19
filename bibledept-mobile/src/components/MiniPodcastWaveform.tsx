import { useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlayerWaveform, RendererProps } from 'react-native-waveforms';
import Svg, { Defs, FeGaussianBlur, Filter, G, LinearGradient, Rect, Stop } from 'react-native-svg';

/** The same measured audio as the full player, behind the episode label. */
export function MiniPodcastWaveform({ samples, width, height, progress, scrubbing }: {
  samples: readonly number[]; width: number; height: number; progress: number; scrubbing: boolean;
}) {
  const id = `mini${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const amplitudes = useMemo(() => {
    const peak=Math.max(0,...samples);
    return samples.map(value => peak>0?Math.max(0,Math.min(1,value/peak)):0);
  }, [samples]);
  const maximumHeight = height * (scrubbing ? .67 : .33);
  function render({ samples: bars, width: w, height: h, color }: RendererProps) {
    const filled = color === '#FF914D', pitch = (w + 2) / bars.length;
    const fillId = `${id}${filled ? 'played' : 'rest'}`;
    const blurId = `${fillId}blur`;
    return <G>
      <Defs>
        <LinearGradient id={fillId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={w} y2={0}>
          <Stop offset={0} stopColor={filled ? '#FF914D' : '#C45D29'} />
          <Stop offset={1} stopColor={filled ? '#FFD08E' : '#E78D51'} />
        </LinearGradient>
        {!scrubbing && <Filter id={blurId} x="-10%" y="-30%" width="120%" height="160%"><FeGaussianBlur stdDeviation={1.1} /></Filter>}
      </Defs>
      <G filter={scrubbing ? undefined : `url(#${blurId})`} opacity={scrubbing ? 1 : filled ? .55 : .32}>
        {bars.map((level, index) => {
          const barHeight = Math.max(1, Math.min(1, level) * maximumHeight);
          return <Rect key={index} x={index * pitch} y={h - barHeight - 2} width={Math.max(1, pitch - 2)} height={barHeight} rx={1} fill={`url(#${fillId})`} />;
        })}
      </G>
    </G>;
  }
  if (width <= 0 || height <= 0) return null;
  const tip = Math.max(0, Math.min(width, progress * width)), trail = Math.min(6, tip);
  return <View pointerEvents="none">
    <PlayerWaveform samples={amplitudes} inputRange={[0, 1]} width={width} height={height} barWidth={2} gap={2} baseline="bottom" rounded
      renderer={render} color="#C45D29" progressColor="#FF914D" progress={progress} isPlaying={false} animationDuration={scrubbing ? 0 : 120} />
    {tip > 0 && <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs><LinearGradient id={`${id}tip`} gradientUnits="userSpaceOnUse" x1={tip - trail} x2={tip} y1={0} y2={0}>
        <Stop offset={0} stopColor="#FFD08E" stopOpacity={0}/><Stop offset={1} stopColor="#FFF3C4" stopOpacity={scrubbing ? .95 : .5}/>
      </LinearGradient></Defs>
      <Rect x={tip - trail} y={height - maximumHeight - 2} width={trail} height={maximumHeight} fill={`url(#${id}tip)`}/>
      <Rect x={Math.max(0, tip - 1)} y={height - maximumHeight - 2} width={1} height={maximumHeight} fill="#FFF3C4" opacity={scrubbing ? 1 : .55}/>
    </Svg>}
  </View>;
}
