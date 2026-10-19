import { messageForUser, UserFacingError } from './userMessage';

export type Translation = 'web' | 'kjv';
export type Verse = { book_id: string; book_name: string; chapter: number; verse: number; text: string };
export type Passage = { reference: string; verses: Verse[]; text: string; translation_id: Translation; translation_name: string };
type Options = { fetcher?: typeof fetch; interval?: number; now?: () => number; sleep?: (ms: number, signal?: AbortSignal) => Promise<void> };

function canceled() { const error = new Error('Request canceled'); error.name = 'AbortError'; return error; }
function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(canceled()); return; }
    const abort = () => { clearTimeout(timer); reject(canceled()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function createBibleClient({ fetcher = fetch, interval = 2100, now = Date.now, sleep = pause }: Options = {}) {
  const cache = new Map<string, { passage: Passage; expires: number }>();
  let nextRequest = 0, startQueue: Promise<void> = Promise.resolve();
  function startWhenAllowed<T>(start: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const abort = () => reject(canceled());
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      const cleanup = () => signal?.removeEventListener('abort', abort);
      startQueue = startQueue.then(async () => {
        try {
          if (signal?.aborted) return;
          const wait = Math.max(0, nextRequest - now());
          if (wait > 0) await sleep(wait, signal);
          if (signal?.aborted) return;
          // Reserve only a real API start. Abandoned selections leave no holes
          // in the queue, and slow responses do not block the next allowed start.
          nextRequest = now() + interval;
          resolve(start());
        } catch (error) { reject(error); }
        finally { cleanup(); }
      });
    });
  }
  const request=async (input: string, translation: Translation = 'web', signal?: AbortSignal): Promise<Passage> => {
    const reference = input.trim().replace(/\s+/g, ' ');
    if (!reference || reference.length > 100) throw new UserFacingError('Enter a Bible reference, such as Luke 1 or John 3:16.');
    if (!['web', 'kjv'].includes(translation)) throw new UserFacingError('Choose WEB or KJV.');
    if (signal?.aborted) throw canceled();
    const key = `${translation}:${reference.toLowerCase()}`;
    const saved = cache.get(key);
    if (saved && saved.expires > now()) return saved.passage;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (signal?.aborted) throw canceled();
      const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}&single_chapter_book_matching=indifferent`;
      const response = await startWhenAllowed(() => {
        timeout = setTimeout(abort, 15000);
        return fetcher(url, { signal: controller.signal });
      }, signal);
      if (response.status === 429) throw new UserFacingError('Wait 30 seconds, then try opening this passage again.');
      if (response.status === 400) throw new UserFacingError('That reference could not be opened. Try one chapter or a verse range, such as Luke 1 or John 3:16.');
      if (!response.ok) throw new UserFacingError(response.status === 404 ? 'That passage was not found. Try a reference such as Luke 1.' : 'We couldn’t open this passage. Please try again.');
      const data = await response.json();
      if (typeof data.reference !== 'string' || !Array.isArray(data.verses) || !data.verses.length || data.verses.some((v: Verse) => typeof v.text !== 'string' || !Number.isInteger(v.chapter) || !Number.isInteger(v.verse))) {
        throw new UserFacingError('We couldn’t read this passage. Please try again.');
      }
      const passage: Passage = { ...data, translation_id: translation };
      if (cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(key, { passage, expires: now() + 300000 });
      return passage;
    } catch (error) {
      if (signal?.aborted) throw canceled();
      if (controller.signal.aborted) throw new UserFacingError('This passage took too long to open. Check your internet connection and try again.',error);
      if (error instanceof UserFacingError) throw error;
      throw new UserFacingError(messageForUser(error,'We couldn’t open this passage. Check your internet connection and try again.'),error);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
  type Pending={controller:AbortController;promise:Promise<Passage>;consumers:number;settled:boolean};
  const pending=new Map<string,Pending>();
  const keyFor=(input:string,translation:Translation)=>`${translation}:${input.trim().replace(/\s+/g,' ').toLowerCase()}`;
  const peek=(input:string,translation:Translation='web')=>{
    const saved=cache.get(keyFor(input,translation));
    return saved&&saved.expires>now()?saved.passage:undefined;
  };
  const read=async(input:string,translation:Translation='web',signal?:AbortSignal):Promise<Passage>=>{
    if(signal?.aborted)throw canceled();
    const saved=peek(input,translation);if(saved)return saved;
    const key=keyFor(input,translation);
    let shared=pending.get(key);
    if(!shared){
      const controller=new AbortController();
      const entry:Pending={controller,consumers:0,settled:false,promise:undefined as unknown as Promise<Passage>};
      entry.promise=request(input,translation,controller.signal).finally(()=>{entry.settled=true;if(pending.get(key)===entry)pending.delete(key);});
      pending.set(key,entry);shared=entry;
    }
    const entry=shared;
    return new Promise<Passage>((resolve,reject)=>{
      let finished=false;entry.consumers++;
      const cleanup=()=>{
        signal?.removeEventListener('abort',abort);entry.consumers--;
        if(!entry.consumers&&!entry.settled){entry.controller.abort();if(pending.get(key)===entry)pending.delete(key);}
      };
      const abort=()=>{if(finished)return;finished=true;cleanup();reject(canceled());};
      signal?.addEventListener('abort',abort,{once:true});
      entry.promise.then(value=>{if(!finished){finished=true;cleanup();resolve(value);}},error=>{if(!finished){finished=true;cleanup();reject(error);}});
      if(signal?.aborted)abort();
    });
  };
  return Object.assign(read,{peek});
}

export const fetchPassage = createBibleClient();
