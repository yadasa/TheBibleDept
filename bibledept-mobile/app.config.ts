import { existsSync } from 'node:fs';
import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({config}:ConfigContext):ExpoConfig => {
  const nativePhoneAuth=process.env.BIBLEDEPT_NATIVE_PHONE==='1';
  const plugins=[...(config.plugins||[])];
  plugins.push('expo-asset','expo-image',['expo-notifications',{defaultChannel:'reading-reminders'}],['expo-audio',{microphonePermission:false,recordAudioAndroid:false,enableBackgroundRecording:false,enableBackgroundPlayback:false}]);
  if(nativePhoneAuth){
    const iosFile=process.env.BIBLEDEPT_FIREBASE_IOS_CONFIG;
    const androidFile=process.env.BIBLEDEPT_FIREBASE_ANDROID_CONFIG;
    if(!iosFile&&!androidFile)throw new Error('Set BIBLEDEPT_FIREBASE_IOS_CONFIG or BIBLEDEPT_FIREBASE_ANDROID_CONFIG for your target native platform.');
    for(const file of [iosFile,androidFile])if(file&&!existsSync(file))throw new Error('A native Firebase configuration file does not exist. Check the configured build environment.');
    const buildIndex=plugins.findIndex(p=>(Array.isArray(p)?p[0]:p)==='expo-build-properties');
    if(buildIndex>=0)plugins.splice(buildIndex,1);
    plugins.push(['expo-build-properties',{ios:{useFrameworks:'static'}}],'@react-native-firebase/app','@react-native-firebase/auth');
    if(iosFile)config.ios={...config.ios,googleServicesFile:iosFile};
    if(androidFile)config.android={...config.android,googleServicesFile:androidFile};
  }
  const easProjectId=process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return {...config,name:'BibleDept',slug:'bibledept',plugins,ios:{...config.ios,associatedDomains:['applinks:thebibledept.com','applinks:www.thebibledept.com']},extra:{...config.extra,nativePhoneAuth,...(easProjectId?{eas:{projectId:easProjectId}}:{})}};
};
