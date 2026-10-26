import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url),root=dirname(dirname(fileURLToPath(import.meta.url)));
const cli=join(dirname(require.resolve('expo/package.json')),'bin','cli');
const result=spawnSync(process.execPath,[cli,'config','--type','introspect','--json'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:180000});
assert.equal(result.status,0,'Expo native configuration introspection must succeed.');
const configuration=JSON.parse(result.stdout),mods=configuration._internal?.modResults;
const plist=mods?.ios?.infoPlist,manifest=mods?.android?.manifest?.manifest;
assert.ok(plist&&manifest,'Both native permission manifests must be available.');
assert.match(plist.NSPhotoLibraryUsageDescription,/profile/i,'The photo permission must explain its profile purpose.');
assert.equal(plist.NSCameraUsageDescription,undefined,'Profile photos use the library picker, without camera access.');
assert.equal(plist.NSMicrophoneUsageDescription,undefined,'Listening to teaching must not request a microphone.');
assert.ok(plist.UIBackgroundModes?.includes('audio'),'Keep background teaching playback enabled.');
const permissions=(manifest['uses-permission']||[]).map(item=>item.$);
const named=name=>permissions.filter(item=>item['android:name']===`android.permission.${name}`);
for(const name of ['CAMERA','RECORD_AUDIO']) {
  const entries=named(name);
  assert.ok(entries.length&&entries.every(item=>item['tools:node']==='remove'),`${name} must be explicitly blocked during manifest merging.`);
}
for(const name of ['READ_MEDIA_IMAGES','READ_MEDIA_VIDEO'])assert.ok(named(name).every(item=>item['tools:node']==='remove'),`${name} must not add broad modern media-library access.`);
for(const name of ['READ_EXTERNAL_STORAGE','WRITE_EXTERNAL_STORAGE'])assert.ok(named(name).every(item=>item['tools:node']==='remove'||Number(item['android:maxSdkVersion'])<=32),`${name} must be restricted to legacy Android versions.`);
assert.ok(named('FOREGROUND_SERVICE_MEDIA_PLAYBACK').some(item=>item['tools:node']!=='remove'),'Keep the Android media-playback service available.');
console.log('Native permissions verified: profile-library purpose; camera/microphone blocked; modern media-library access excluded; background playback retained.');
