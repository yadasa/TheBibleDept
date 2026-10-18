import { existsSync } from 'node:fs';
import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({config}:ConfigContext):ExpoConfig => {
  const nativePhoneAuth=process.env.BIBLEDEPT_NATIVE_PHONE==='1';
  const plugins=[...(config.plugins||[])];
  if(nativePhoneAuth){
    const iosFile=process.env.BIBLEDEPT_FIREBASE_IOS_CONFIG;
    if(!iosFile||!existsSync(iosFile))throw new Error('Set BIBLEDEPT_FIREBASE_IOS_CONFIG to the local GoogleService-Info.plist file before enabling native phone authentication.');
    const buildIndex=plugins.findIndex(p=>(Array.isArray(p)?p[0]:p)==='expo-build-properties');
    if(buildIndex>=0)plugins.splice(buildIndex,1);
    plugins.push(['expo-build-properties',{ios:{useFrameworks:'static'}}],'@react-native-firebase/app','@react-native-firebase/auth');
    config.ios={...config.ios,googleServicesFile:iosFile};
  }
  return {...config,name:'BibleDept',slug:'bibledept',plugins,extra:{...config.extra,nativePhoneAuth}};
};
