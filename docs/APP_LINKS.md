# BibleDept app links

Supported routes:

- `https://thebibledept.com/read?ref=John%203%3A16&translation=web`
- `https://www.thebibledept.com/prayer`
- `https://thebibledept.com/account`
- `https://thebibledept.com/community`
- `https://thebibledept.com/circles`
- `https://thebibledept.com/badges`
- `bibledept://read?ref=John%203%3A16&translation=kjv`

Links only navigate. Saving data and viewing journals still require Firebase sign-in.
Community routes require opting into community; `/prayer` opens the private journal inside Account.
The parser ignores unrelated domains, unsupported translations, invalid references, and unknown actions.

## Local testing

Expo Go cannot claim your website's universal links. Its **Copy passage link** button
copies the current Expo development-server URL, for example:
`exp://YOUR_PC_IP:8081/--/read?ref=John%203%3A16&translation=web`.
The same Expo account must be signed in on the CLI and iPhone. A local browser test
can open `http://127.0.0.1:8081/read?ref=John%203%3A16&translation=kjv`.

## Activating website links in a signed iPhone app

The app declares associated domains for `thebibledept.com` and `www.thebibledept.com`.
Website activation still requires an Apple Team ID, a signed development/production
build, and the association file hosted by **both** domains.

From `bibledept-mobile`, generate the file with your actual Apple Team ID:

```sh
node scripts/generate-apple-association.cjs YOURTEAMID .expo/website/.well-known/apple-app-site-association
```

The ID must contain exactly ten uppercase letters/digits. The generator reads the
bundle identifier from `app.json` and refuses to overwrite an existing file.
Serve the result at `https://<domain>/.well-known/apple-app-site-association`, with
`Content-Type: application/json`, valid HTTPS, and no redirect. Add website fallback
pages for `/read`, `/prayer`, and `/account` for visitors without the installed app.
Then rebuild/reinstall the app and test links from Notes or another app on an iPhone.

The website association and fallback pages have **not** been deployed by this repository.
Universal links are prepared in source, not yet activated on the public website.
The development build uses the custom `bibledept` scheme; installed builds copy canonical website links.

References: [Apple associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains),
[Expo linking](https://docs.expo.dev/linking/overview/).
