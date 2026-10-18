export type Translation = 'web' | 'kjv';
export type Verse = { book_id: string; book_name: string; chapter: number; verse: number; text: string };
export type Passage = { reference: string; verses: Verse[]; text: string; translation_id: Translation; translation_name: string };
type Options = { fetcher?: typeof fetch; interval?: number; now?: () => number };

function canceled() { const error = new Error('Request canceled'); error.name = 'AbortError'; return error; }
function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(canceled()); return; }
    const abort = () => { clearTimeout(timer); reject(canceled()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function createBibleClient({ fetcher = fetch, interval = 2100, now = Date.now }: Options = {}) {
  const cache = new Map<string, { passage: Passage; expires: number }>();
  let nextRequest = 0;
  return async (input: string, translation: Translation = 'web', signal?: AbortSignal): Promise<Passage> => {
    const reference = input.trim().replace(/\s+/g, ' ');
    if (!reference || reference.length > 100) throw new Error('Enter a Bible reference, such as Luke 1 or John 3:16.');
    if (!['web', 'kjv'].includes(translation)) throw new Error('Choose WEB or KJV.');
    if (signal?.aborted) throw canceled();
    const key = `${translation}:${reference.toLowerCase()}`;
    const saved = cache.get(key);
    if (saved && saved.expires > now()) return saved.passage;
    const wait = Math.max(0, nextRequest - now());
    nextRequest = now() + wait + interval;
    await pause(wait, signal);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 15000);
    try {
      if (signal?.aborted) throw canceled();
      const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}&single_chapter_book_matching=indifferent`;
      const response = await fetcher(url, { signal: controller.signal });
      if (response.status === 429) throw new Error('The Bible service is busy. Wait 30 seconds, then try again.');
      if (response.status === 400) throw new Error('Choose one chapter or a verse range. The Bible service cannot open several whole chapters in one request.');
      if (!response.ok) throw new Error(response.status === 404 ? 'That passage was not found. Try a reference such as Luke 1.' : 'The Bible service is unavailable. Please try again.');
      const data = await response.json();
      if (typeof data.reference !== 'string' || !Array.isArray(data.verses) || !data.verses.length || data.verses.some((v: Verse) => typeof v.text !== 'string' || !Number.isInteger(v.chapter) || !Number.isInteger(v.verse))) {
        throw new Error('The Bible service returned an unreadable passage. Please try again.');
      }
      const passage: Passage = { ...data, translation_id: translation };
      if (cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(key, { passage, expires: now() + 300000 });
      return passage;
    } catch (error) {
      if (signal?.aborted) throw canceled();
      if (controller.signal.aborted) throw new Error('The passage took too long to load. Check your connection and retry.');
      if (error instanceof TypeError) throw new Error('You are offline or the Bible service could not be reached. Connect to the internet and retry.');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
}

export const fetchPassage = createBibleClient();
