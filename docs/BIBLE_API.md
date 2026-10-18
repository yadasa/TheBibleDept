# Online Bible API

The legacy adapter (`bibledept-app/src/shared/BibleApis.ts`) already requests books, chapters, verses, passages, and search results from a configurable, keyed Bible service. Its server/key values are empty, so it does not currently provide working online reading.

The Expo client will use [bible-api.com](https://bible-api.com/), which is free, needs no API key, and supports browser requests. Start with World English Bible (`web`) and King James Version (`kjv`). Translation availability is listed in the provider's documentation.

## Request format

```http
GET https://bible-api.com/{URL_ENCODED_REFERENCE}?translation={web|kjv}
```

Examples:

- `https://bible-api.com/john%203:16?translation=web`
- `https://bible-api.com/luke%201?translation=kjv`
- `https://bible-api.com/psalm%2023?translation=web`

For a whole single-chapter book, append `&single_chapter_book_matching=indifferent`.

## Response shape

```json
{
  "reference": "John 3:16",
  "verses": [
    {
      "book_id": "JHN",
      "book_name": "John",
      "chapter": 3,
      "verse": 16,
      "text": "..."
    }
  ],
  "text": "...",
  "translation_id": "web",
  "translation_name": "World English Bible",
  "translation_note": "Public Domain"
}
```

The identifier-based chapter endpoint is `GET https://bible-api.com/data/web/JHN/3`; its response has `translation` metadata and a `verses` array. Its verse objects use `book` instead of `book_name`.

## Client behavior

Fetch a passage on demand, reuse recent results in memory, cancel stale requests, and show retryable errors. The provider documents a limit of 15 requests per 30 seconds per IP and gives no uptime guarantee. Do not bulk-download a Bible through this endpoint. Offline Bible support is deferred.

Both example response shapes were checked against the live API on 2026-10-18. See the [provider documentation and terms](https://bible-api.com/) for current limits.
