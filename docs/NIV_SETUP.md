# NIV reading: access and implementation checklist

Status: **blocked on licensed API access; not enabled in the app.** The owner confirmed on October 18, 2026 that no API.Bible NIV access exists yet. The working reader offers WEB and KJV in a dropdown. Neither is presented as NIV.

The requested final behavior is NIV by default for new readers, with a remembered translation choice. Do not switch the default until a real NIV passage succeeds through the licensed integration.

## Obtain access

1. Create an API.Bible application and enable the NIV license for that application. Review the application's actual use against the provider's non-commercial/commercial terms. The app is free, but pricing alone does not establish its license category.
2. Confirm the app's key can access NIV by requesting `GET https://rest.api.bible/v1/bibles?abbreviation=NIV&include-full-details=true` with the private `api-key` header. Use the ID returned for the licensed edition; the documentation currently lists `78a9f6124f344018-01` as an NIV example.
3. Save the key in the server's secret store. Never use an `EXPO_PUBLIC_` variable, check it into Git, print it in logs, or ship it in the Expo bundle.
4. Confirm usage allowances, required copyright/promotion notices, view-tracking requirements, and caching/retention limits for that exact license before release.

## Connect the reader

1. Add a narrow, authenticated Firebase callable/HTTPS endpoint dedicated to Scripture retrieval. Accept only a known book ID, chapter and optional valid verse range, plus an allowlisted translation. Construct the upstream URL on the server; never accept an arbitrary upstream URL or user-supplied Bible ID.
2. Send requests in the provider's documented format:

   ```http
   GET https://rest.api.bible/v1/bibles/{licensedBibleId}/passages/JHN.3?content-type=json&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false
   api-key: <server secret>
   ```

   `JHN.3` is a chapter; `JHN.3.16` is one verse; `JHN.3.16-JHN.3.18` is a verse range. Confirm the current response structure against a real licensed response. Parse the provider's verse nodes into the existing `Passage` model; do not strip HTML with a regex or guess verse boundaries from visible numbers.
3. Preserve verse identifiers and the returned copyright information. Render only the notices actually required by the translation license; the removed developer/provider marketing footers must stay removed.
4. Add `niv` to the shared translation model, app-link parser, annotation validation/rules, and chapter-completion Functions allowlist. Update and deploy these together so an NIV reader can still save a highlight and complete a chapter. Existing WEB/KJV records must remain readable.
5. Make NIV the default for a new installation after the endpoint is configured and tested. Keep the reader's saved translation choice. Explain an unavailable NIV response plainly and offer the other translations; never silently display a different translation under the NIV label.
6. Keep the mapping of the 365 reading days bundled locally. Do not upload the plan or bulk-download the NIV text as part of this work.

## Acceptance checks

- A real licensed NIV response displays the correct text, verse numbers and attribution.
- Book/chapter/verse dropdowns reflect the available edition, including omitted verse numbers.
- NIV links, one-verse notes, multi-verse highlights, Notes reopening, chapter completion and reading progress work together.
- Missing/expired access, quota exhaustion, timeout, cancellation and sign-out produce clear recoverable behavior without leaking provider details or secrets.
- The app bundle and network responses never expose the upstream private key.
- Rules and backend tests pass; then verify the signed iPhone build before launch.

## Official references

- [Bibles and edition IDs](https://docs.api.bible/guides/bibles/)
- [Passage endpoint and content formats](https://docs.api.bible/guides/passages/)
- [Plan limits and adding translation licenses](https://care.api.bible/article/378-comparing-api-bible-plans)
- [API.Bible terms](https://api.bible/terms-and-conditions)

Provider details were checked on October 18, 2026. Recheck them when obtaining access rather than assuming a past plan or license still applies.
