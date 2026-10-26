const PREFIX='data:image/jpeg;base64,';
const MAX_DATA_LENGTH=60000;

/** Decode untrusted uploads and publish only bounded pixels with metadata stripped. */
export async function normalizeProfilePhoto(photo:string|null):Promise<string|null> {
  if(photo===null)return null;
  if(photo.length>MAX_DATA_LENGTH||!photo.startsWith(PREFIX))throw new Error('Choose a smaller profile photo.');
  const encoded=photo.slice(PREFIX.length),input=Buffer.from(encoded,'base64');
  if(input.toString('base64')!==encoded)throw new Error('That photo couldn’t be processed. Choose another image.');
  try {
    // Load the native decoder only for photo changes, not for reading or chat calls.
    const {default:sharp}=await import('sharp');
    const image=sharp(input,{limitInputPixels:256*256,failOn:'warning'});
    const metadata=await image.metadata();
    if(metadata.format!=='jpeg'||!metadata.width||!metadata.height||metadata.width>256||metadata.height>256||(metadata.pages||1)!==1)throw new Error('Invalid profile image.');
    const result=await image.autoOrient().resize(192,192,{fit:'cover',withoutEnlargement:true}).toColourspace('srgb').jpeg({quality:80}).toBuffer();
    const data=PREFIX+result.toString('base64');
    if(data.length>MAX_DATA_LENGTH)throw new Error('Profile image is too large.');
    return data;
  }catch {
    throw new Error('That photo couldn’t be processed. Choose another image.');
  }
}
