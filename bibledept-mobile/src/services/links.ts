import type { Translation } from './bible';

export type AppLink = { tab: 'Today' | 'Prayer' | 'Account' } | { tab: 'Bible'; reference: string; translation: Translation };
const domains = new Set(['thebibledept.com', 'www.thebibledept.com']);

export function passageLink(reference: string, translation: Translation): string {
  return `https://thebibledept.com/read?ref=${encodeURIComponent(reference)}&translation=${translation}`;
}

export function parseAppLink(value: string, allowDevelopment = false): AppLink | null {
  try {
    if (value.length > 2000) return null;
    const url = new URL(value);
    if (url.username || url.password || url.hash) return null;
    let path: string;
    if (url.protocol === 'https:' && domains.has(url.hostname) && !url.port) path = url.pathname;
    else if (allowDevelopment && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) path = url.pathname;
    else if (url.protocol === 'bibledept:' && !url.port) path = `/${url.hostname}${url.pathname}`;
    else if (allowDevelopment && ['exp:', 'exps:'].includes(url.protocol) && url.pathname.startsWith('/--/')) path = url.pathname.slice(3);
    else return null;
    path = path.replace(/\/$/, '') || '/';
    if (path === '/') return { tab: 'Today' };
    if (path === '/prayer') return { tab: 'Prayer' };
    if (path === '/account') return { tab: 'Account' };
    if (path !== '/read') return null;
    const reference = url.searchParams.get('ref')?.trim();
    const translation = url.searchParams.get('translation') || 'web';
    if (!reference || reference.length > 100 || /[\x00-\x1F\x7F]/.test(reference) || !['web', 'kjv'].includes(translation)) return null;
    return { tab: 'Bible', reference, translation: translation as Translation };
  } catch { return null; }
}
