import Svg, { Path } from 'react-native-svg';
import { Platform, View } from 'react-native';
import { useTheme } from '../theme';

// A single 24-unit stroke system. Decorative icons inherit the control's label.
const paths = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  book: 'M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  arrowRight: 'M4 12h16m-6-6 6 6-6 6',
  chevronLeft: 'm15 5-7 7 7 7',
  chevronRight: 'm9 5 7 7-7 7',
  chevronDown: 'm5 9 7 7 7-7',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  calendar: 'M8 2v4m8-4v4M3 10h18M4 4h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  headphones: 'M3 14v-3a9 9 0 0 1 18 0v3M3 13h3v8H4a1 1 0 0 1-1-1Zm18 0h-3v8h2a1 1 0 0 0 1-1Z',
  speed: 'M4 19a9 9 0 1 1 16 0M4 19h16M12 15l4-6M7 8l1 1M17 8l-1 1M12 5v2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v12H5Zm7 5v3',
  mail: 'M3 5h18v14H3Zm0 0 9 8 9-8',
  phone: 'M7 2H4a2 2 0 0 0-2 2c0 10 8 18 18 18a2 2 0 0 0 2-2v-3l-5-2-2 2a15 15 0 0 1-8-8l2-2Z',
  logout: 'M9 3H3v18h6m6-14 5 5-5 5m-8-5h13',
  refresh: 'M20 7a9 9 0 1 0 1 9M20 2v6h-6',
  checkCircle: 'm8 12 3 3 5-6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  play: 'm8 4 12 8-12 8Z',
  pause: 'M8 4v16M16 4v16',
  external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
  flame: 'M13 2c1 5-4 6-3 10 2-1 3-3 3-3 4 3 6 5 6 8a7 7 0 0 1-14 0c0-4 3-7 8-15Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9 21h6',
  notes: 'M5 3h14v18H5ZM8 7h8M8 11h8M8 15h5',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const {colors}=useTheme();
  const nativeAccessibility=Platform.OS==='web'?{}:{accessible:false};
  return <View pointerEvents="none" accessible={false} aria-hidden
    style={{width:size,height:size,minWidth:size,minHeight:size,flexShrink:0,position:'relative',zIndex:1,overflow:'visible'}}>
    <Svg {...nativeAccessibility} focusable={false} style={{overflow:'visible'}} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||colors.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><Path d={paths[name]} /></Svg>
  </View>;
}
