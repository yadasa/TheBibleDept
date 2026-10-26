import { Image, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useTheme } from '../../theme';
import { BadgeArt } from './BadgeArt';
export function ProfileAvatar({name,photoData,size=56,club=false}:{name:string;photoData?:string|null;size?:number;club?:boolean}) {
  const {colors:c}=useTheme();
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[photoData]);
  const initials=name.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]||'').join('').toUpperCase()||'BD';
  const badgeSize=Math.max(18,size*.43);
  return <View accessible accessibilityRole="image" accessibilityLabel={`${name}${club?', 6% Club member':''}`} style={{width:size,height:size,flexShrink:0}}>
    <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:c.tint,overflow:'hidden',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.border}}>
      {photoData&&!failed?<Image source={{uri:photoData}} style={{width:size,height:size}} resizeMode="cover" onError={()=>setFailed(true)}/>:<Text style={{color:c.ink,fontSize:size*.31,fontWeight:'700'}}>{initials}</Text>}
    </View>
    {club&&<View testID="six-percent-profile-badge" style={{position:'absolute',bottom:-3,right:-4,width:badgeSize,height:badgeSize,borderRadius:badgeSize/2,backgroundColor:c.background,padding:2}}><BadgeArt size={badgeSize-4} compact={badgeSize<28}/></View>}
  </View>;
}
