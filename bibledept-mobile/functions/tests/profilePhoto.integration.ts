import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeProfilePhoto } from '../src/profilePhoto';

const photo=(data:Buffer)=>`data:image/jpeg;base64,${data.toString('base64')}`;
test('profile photos are decoded, cropped, bounded, and stripped of embedded metadata',async()=>{
  const source=await sharp({create:{width:240,height:200,channels:3,background:'#c56d3a'}}).jpeg()
    .withMetadata({orientation:6}).withExif({IFD0:{ImageDescription:'Private fixture metadata',Artist:'Local test'}}).toBuffer();
  assert.ok((await sharp(source).metadata()).exif);
  const result=await normalizeProfilePhoto(photo(source));
  assert.ok(result&&result.length<60000);
  const metadata=await sharp(Buffer.from(result.split(',')[1],'base64')).metadata();
  assert.equal(metadata.format,'jpeg');
  assert.equal(metadata.width,192);assert.equal(metadata.height,192);
  assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);assert.equal(metadata.xmp,undefined);assert.equal(metadata.orientation,undefined);
  assert.equal(await normalizeProfilePhoto(null),null);
});

test('malformed, disguised, truncated, and oversized pixel uploads cannot become profile photos',async()=>{
  const pixel=(width:number,height:number)=>sharp({create:{width,height,channels:3,background:'#123456'}}).jpeg().toBuffer();
  const png=await sharp({create:{width:1,height:1,channels:3,background:'#123456'}}).png().toBuffer();
  const valid=await pixel(192,192);
  for(const input of [photo(Buffer.from([0xff,0xd8,0xff])),photo(png),photo(valid.subarray(0,valid.length/2)),photo(await pixel(257,256)),photo(await pixel(257,1)),photo(valid)+'=',`data:image/jpeg;base64,${'a'.repeat(60000)}`]) {
    await assert.rejects(normalizeProfilePhoto(input),/Choose (another image|a smaller profile photo)/);
  }
});
