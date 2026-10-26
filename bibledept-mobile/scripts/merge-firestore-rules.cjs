const fs = require('node:fs');
const namespace = 'match /bibledeptUsers/{uid}';
function namespaceBounds(source) {
  const start = source.indexOf(namespace);
  if (start < 0 || source.indexOf(namespace, start + namespace.length) >= 0) throw new Error('Expected exactly one BibleDept namespace.');
  const open = source.indexOf('{', start + namespace.length);
  let depth = 0, quote = '', line = false, block = false;
  for (let i = open; i < source.length; i++) {
    const char = source[i], next = source[i + 1];
    if (line) { if (char === '\n') line = false; continue; }
    if (block) { if (char === '*' && next === '/') { block = false; i++; } continue; }
    if (quote) { if (char === '\\') i++; else if (char === quote) quote = ''; continue; }
    if (char === '/' && next === '/') { line = true; i++; continue; }
    if (char === '/' && next === '*') { block = true; i++; continue; }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return { start, end: i + 1 };
  }
  throw new Error('Unbalanced BibleDept namespace.');
}
function mergeBibleDeptRules(existing, canonical) {
  const current = managedBounds(canonical);
  if(!current)throw new Error('Canonical rules must contain one marked BibleDept rule set.');
  namespaceBounds(canonical.slice(current.start,current.end));
  const marked = managedBounds(existing), old = marked || namespaceBounds(existing);
  if(!marked&&['bibledeptProfiles','bibledeptActivity','bibledeptCircles'].some(name=>existing.includes(`match /${name}/`)))throw new Error('Unmarked community namespaces need review before merging.');
  return existing.slice(0, old.start) + canonical.slice(current.start, current.end) + existing.slice(old.end);
}
function managedBounds(source) {
  const begin='// BEGIN BIBLEDEPT RULES',end='// END BIBLEDEPT RULES';
  const start=source.indexOf(begin),last=source.indexOf(end);
  if(start<0&&last<0)return null;
  if(start<0||last<start||source.indexOf(begin,start+begin.length)>=0||source.indexOf(end,last+end.length)>=0)throw new Error('Expected one complete marked BibleDept rule set.');
  return {start,end:last+end.length};
}
module.exports = { mergeBibleDeptRules, namespaceBounds, managedBounds };
if (require.main === module) {
  const [existing, canonical, output] = process.argv.slice(2);
  if (!existing || !canonical || !output) throw new Error('Usage: node scripts/merge-firestore-rules.cjs EXISTING CANONICAL OUTPUT');
  fs.writeFileSync(output, mergeBibleDeptRules(fs.readFileSync(existing, 'utf8'), fs.readFileSync(canonical, 'utf8')));
  console.log('Merged the BibleDept private and community rules; unrelated rules preserved byte-for-byte.');
}
