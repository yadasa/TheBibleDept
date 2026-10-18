const fs = require('node:fs');
const path = require('node:path');
const [teamId, output] = process.argv.slice(2);
if (!/^[A-Z0-9]{10}$/.test(teamId || '') || !output) {
  console.error('Usage: node scripts/generate-apple-association.cjs APPLE_TEAM_ID OUTPUT_FILE');
  process.exit(1);
}
const config = require('../app.json').expo;
const association = {
  applinks: {
    apps: [],
    details: [{ appID: `${teamId}.${config.ios.bundleIdentifier}`, paths: ['/read', '/prayer', '/account'] }],
  },
};
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, JSON.stringify(association, null, 2) + '\n', { flag: 'wx' });
console.log(`Created ${path.resolve(output)}`);
