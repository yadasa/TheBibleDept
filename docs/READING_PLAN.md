# The Bible Dept: 365-day passage map

Transcribed from the supplied five-page reading plan. Day numbers are relative plan days, not calendar dates.
Whole-book and combined readings retain the printed label. Structured references expand whole books into chapters.

## App lookup

The source data is in `bibledept-mobile/src/data/bibledept-365.json`.
It is bundled locally in the app, never fetched from or uploaded to Firebase.
The compact file contains a book table and numeric chapter tuples (5,099 bytes),
96% smaller than the original expanded mapping. The typed lookup reconstructs
labels and passage objects in memory.
Use `getReadingPlanDay(day)` from `src/services/readingPlan.ts` for a validated,
read-only lookup, or `READING_PLAN_BY_DAY` / `READING_PLAN_DAYS` for the full map.
Each day includes the printed label, source PDF page, chapter count, and an ordered
array of passages with book IDs, chapter boundaries, and API-ready references.

```ts
const day = getReadingPlanDay(54);
// day.label: "2 Peter 1-3 & Jude"
// day.passages.map(p => p.reference): ["2 Peter 1-3", "Jude 1"]
```

Request combined readings as separate passages through the existing Bible client.
For example, use `fetchPassage("Jude 1", "web")`; its existing
`single_chapter_book_matching=indifferent` option requests the whole chapter.
The mapping is not tied to January 1 or any other calendar start date.
This step adds the plan data and lookup; the Today screen is not yet connected to
plan-day selection or plan completion.

## Complete day-to-passage map

| Day | Reading | Chapters | PDF page |
| ---: | --- | ---: | ---: |
| 1 | Luke 1-3 | 3 | 1 |
| 2 | Luke 4-6 | 3 | 1 |
| 3 | Luke 7-9 | 3 | 1 |
| 4 | Luke 10-13 | 4 | 1 |
| 5 | Luke 14-16 | 3 | 1 |
| 6 | Luke 17-19 | 3 | 1 |
| 7 | Luke 20-22 | 3 | 1 |
| 8 | Luke 23-24 | 2 | 1 |
| 9 | Acts 1-3 | 3 | 1 |
| 10 | Acts 4-7 | 4 | 1 |
| 11 | Acts 8-10 | 3 | 1 |
| 12 | Acts 11-14 | 4 | 1 |
| 13 | Acts 15-18 | 4 | 1 |
| 14 | Acts 19-23 | 5 | 1 |
| 15 | Acts 24-28 | 5 | 1 |
| 16 | Galatians 1-3 | 3 | 1 |
| 17 | Galatians 4-6 | 3 | 1 |
| 18 | 1 Thessalonians 1-3 | 3 | 1 |
| 19 | 1 Thessalonians 4-5 | 2 | 1 |
| 20 | 2 Thessalonians 1-3 | 3 | 1 |
| 21 | 1 Corinthians 1-4 | 4 | 1 |
| 22 | 1 Corinthians 5-7 | 3 | 1 |
| 23 | 1 Corinthians 8-10 | 3 | 1 |
| 24 | 1 Corinthians 11-14 | 4 | 1 |
| 25 | 1 Corinthians 15-16 | 2 | 1 |
| 26 | 2 Corinthians 1-3 | 3 | 1 |
| 27 | 2 Corinthians 4-7 | 4 | 1 |
| 28 | 2 Corinthians 8-9 | 2 | 1 |
| 29 | 2 Corinthians 10-13 | 4 | 1 |
| 30 | Romans 1-2 | 2 | 1 |
| 31 | Romans 3-4 | 2 | 1 |
| 32 | Romans 5-8 | 4 | 1 |
| 33 | Romans 9-11 | 3 | 1 |
| 34 | Romans 12-13 | 2 | 1 |
| 35 | Romans 14-16 | 3 | 1 |
| 36 | Ephesians 1-3 | 3 | 1 |
| 37 | Ephesians 4-6 | 3 | 1 |
| 38 | Philippians 1-2 | 2 | 1 |
| 39 | Philippians 3-4 | 2 | 1 |
| 40 | Colossians 1-2 | 2 | 1 |
| 41 | Colossians 3-4 | 2 | 1 |
| 42 | Philemon | 1 | 1 |
| 43 | Titus | 3 | 1 |
| 44 | 1 Timothy 1-3 | 3 | 1 |
| 45 | 1 Timothy 4-6 | 3 | 1 |
| 46 | 2 Timothy 1-2 | 2 | 1 |
| 47 | 2 Timothy 3-4 | 2 | 1 |
| 48 | Mark 1-4 | 4 | 1 |
| 49 | Mark 5-8 | 4 | 1 |
| 50 | Mark 9-12 | 4 | 1 |
| 51 | Mark 13-16 | 4 | 1 |
| 52 | 1 Peter 1-3 | 3 | 1 |
| 53 | 1 Peter 4-5 | 2 | 1 |
| 54 | 2 Peter 1-3 & Jude | 4 | 1 |
| 55 | Matthew 1-4 | 4 | 2 |
| 56 | Matthew 5-8 | 4 | 2 |
| 57 | Matthew 9-12 | 4 | 2 |
| 58 | Matthew 13-16 | 4 | 2 |
| 59 | Matthew 17-20 | 4 | 2 |
| 60 | Matthew 21-24 | 4 | 2 |
| 61 | Matthew 25-28 | 4 | 2 |
| 62 | Hebrews 1-4 | 4 | 2 |
| 63 | Hebrews 5-10 | 6 | 2 |
| 64 | Hebrews 11-13 | 3 | 2 |
| 65 | James 1-2 | 2 | 2 |
| 66 | James 3-5 | 3 | 2 |
| 67 | John 1-3 | 3 | 2 |
| 68 | John 4-7 | 4 | 2 |
| 69 | John 8-10 | 3 | 2 |
| 70 | John 11-13 | 3 | 2 |
| 71 | John 14-17 | 4 | 2 |
| 72 | John 18-21 | 4 | 2 |
| 73 | 1 John 1-3 | 3 | 2 |
| 74 | 1 John 4-5 | 2 | 2 |
| 75 | 2 & 3 John | 2 | 2 |
| 76 | Revelation 1-3 | 3 | 2 |
| 77 | Revelation 4-5 | 2 | 2 |
| 78 | Revelation 6-11 | 6 | 2 |
| 79 | Revelation 12-16 | 5 | 2 |
| 80 | Revelation 17-20 | 4 | 2 |
| 81 | Revelation 21-22 | 2 | 2 |
| 82 | Genesis 1-3 | 3 | 2 |
| 83 | Genesis 4-7 | 4 | 2 |
| 84 | Genesis 8-10 | 3 | 2 |
| 85 | Genesis 11-14 | 4 | 2 |
| 86 | Genesis 15-17 | 3 | 2 |
| 87 | Genesis 18-20 | 3 | 2 |
| 88 | Genesis 21-23 | 3 | 2 |
| 89 | Genesis 24-27 | 4 | 2 |
| 90 | Genesis 28-30 | 3 | 2 |
| 91 | Genesis 31-33 | 3 | 2 |
| 92 | Genesis 34-36 | 3 | 2 |
| 93 | Genesis 37-40 | 4 | 2 |
| 94 | Genesis 41-43 | 3 | 2 |
| 95 | Genesis 44-46 | 3 | 2 |
| 96 | Genesis 47-50 | 4 | 2 |
| 97 | Exodus 1-4 | 4 | 2 |
| 98 | Exodus 5-8 | 4 | 2 |
| 99 | Exodus 9-11 | 3 | 2 |
| 100 | Exodus 12-15 | 4 | 2 |
| 101 | Exodus 16-18 | 3 | 2 |
| 102 | Exodus 19-22 | 4 | 2 |
| 103 | Exodus 23-25 | 3 | 2 |
| 104 | Exodus 26-29 | 4 | 2 |
| 105 | Exodus 30-34 | 5 | 2 |
| 106 | Exodus 35-38 | 4 | 2 |
| 107 | Exodus 39-40 | 2 | 2 |
| 108 | Leviticus 1-4 | 4 | 2 |
| 109 | Leviticus 5-7 | 3 | 2 |
| 110 | Leviticus 8-10 | 3 | 2 |
| 111 | Leviticus 11-15 | 5 | 2 |
| 112 | Leviticus 16-17 | 2 | 2 |
| 113 | Leviticus 18-20 | 3 | 2 |
| 114 | Leviticus 21-22 | 2 | 2 |
| 115 | Leviticus 23-27 | 5 | 2 |
| 116 | Numbers 1-4 | 4 | 2 |
| 117 | Numbers 5-8 | 4 | 2 |
| 118 | Numbers 9-12 | 4 | 2 |
| 119 | Numbers 13-15 | 3 | 2 |
| 120 | Numbers 16-19 | 4 | 2 |
| 121 | Numbers 20-21 | 2 | 2 |
| 122 | Numbers 22-25 | 4 | 2 |
| 123 | Numbers 26-30 | 5 | 2 |
| 124 | Numbers 31-33 | 3 | 2 |
| 125 | Numbers 34-36 | 3 | 2 |
| 126 | Deuteronomy 1-3 | 3 | 2 |
| 127 | Deuteronomy 4-6 | 3 | 2 |
| 128 | Deuteronomy 7-11 | 5 | 2 |
| 129 | Deuteronomy 12-14 | 3 | 2 |
| 130 | Deuteronomy 15-18 | 4 | 2 |
| 131 | Deuteronomy 19-21 | 3 | 2 |
| 132 | Deuteronomy 22-26 | 5 | 2 |
| 133 | Deuteronomy 27-30 | 4 | 2 |
| 134 | Deuteronomy 31-34 | 4 | 2 |
| 135 | Joshua 1-3 | 3 | 2 |
| 136 | Joshua 4-6 | 3 | 2 |
| 137 | Joshua 7-10 | 4 | 2 |
| 138 | Joshua 11-13 | 3 | 2 |
| 139 | Joshua 14-19 | 6 | 2 |
| 140 | Joshua 20-24 | 5 | 2 |
| 141 | Judges 1-2 | 2 | 2 |
| 142 | Judges 3-5 | 3 | 2 |
| 143 | Judges 6-8 | 3 | 2 |
| 144 | Judges 9-12 | 4 | 2 |
| 145 | Judges 13-16 | 4 | 2 |
| 146 | Judges 17-18 | 2 | 2 |
| 147 | Judges 19-21 | 3 | 2 |
| 148 | 1 Samuel 1-4 | 4 | 3 |
| 149 | 1 Samuel 5-7 | 3 | 3 |
| 150 | 1 Samuel 8-10 | 3 | 3 |
| 151 | 1 Samuel 11-12 | 2 | 3 |
| 152 | 1 Samuel 13-16 | 4 | 3 |
| 153 | 1 Samuel 17-20 | 4 | 3 |
| 154 | 1 Samuel 21-24 | 4 | 3 |
| 155 | 1 Samuel 25-28 | 4 | 3 |
| 156 | 1 Samuel 29-31 | 3 | 3 |
| 157 | 2 Samuel 1-3 | 3 | 3 |
| 158 | 2 Samuel 4-7 | 4 | 3 |
| 159 | 2 Samuel 8-10 | 3 | 3 |
| 160 | 2 Samuel 11-13 | 3 | 3 |
| 161 | 2 Samuel 14-17 | 4 | 3 |
| 162 | 2 Samuel 18-21 | 4 | 3 |
| 163 | 2 Samuel 22-24 | 3 | 3 |
| 164 | 1 Kings 1-4 | 4 | 3 |
| 165 | 1 Kings 5-8 | 4 | 3 |
| 166 | 1 Kings 9-11 | 3 | 3 |
| 167 | 1 Kings 12-14 | 3 | 3 |
| 168 | 1 Kings 15-16 | 2 | 3 |
| 169 | 1 Kings 17-19 | 3 | 3 |
| 170 | 1 Kings 20-22 | 3 | 3 |
| 171 | 2 Kings 1-2 | 2 | 3 |
| 172 | 2 Kings 3-5 | 3 | 3 |
| 173 | 2 Kings 6-8 | 3 | 3 |
| 174 | 2 Kings 9-11 | 3 | 3 |
| 175 | 2 Kings 12-14 | 3 | 3 |
| 176 | 2 Kings 15-17 | 3 | 3 |
| 177 | 2 Kings 18-21 | 4 | 3 |
| 178 | 2 Kings 22-23 | 2 | 3 |
| 179 | 2 Kings 24-25 | 2 | 3 |
| 180 | Joel 1-3 | 3 | 3 |
| 181 | Jonah 1-2 | 2 | 3 |
| 182 | Jonah 3-4 | 2 | 3 |
| 183 | Amos 1-2 | 2 | 3 |
| 184 | Amos 3-6 | 4 | 3 |
| 185 | Amos 7-9 | 3 | 3 |
| 186 | Hosea 1-3 | 3 | 3 |
| 187 | Hosea 4-8 | 5 | 3 |
| 188 | Hosea 9-11 | 3 | 3 |
| 189 | Hosea 12-14 | 3 | 3 |
| 190 | Micah 1-3 | 3 | 3 |
| 191 | Micah 4-7 | 4 | 3 |
| 192 | Isaiah 1-2 | 2 | 3 |
| 193 | Isaiah 3-6 | 4 | 3 |
| 194 | Isaiah 7-9 | 3 | 3 |
| 195 | Isaiah 10-12 | 3 | 3 |
| 196 | Isaiah 13-15 | 3 | 3 |
| 197 | Isaiah 16-19 | 4 | 3 |
| 198 | Isaiah 20-23 | 4 | 3 |
| 199 | Isaiah 24-27 | 4 | 3 |
| 200 | Isaiah 28-30 | 3 | 3 |
| 201 | Isaiah 31-35 | 5 | 3 |
| 202 | Isaiah 36-39 | 4 | 3 |
| 203 | Isaiah 40-43 | 4 | 3 |
| 204 | Isaiah 44-48 | 5 | 3 |
| 205 | Isaiah 49-51 | 3 | 3 |
| 206 | Isaiah 52-55 | 4 | 3 |
| 207 | Isaiah 56-59 | 4 | 3 |
| 208 | Isaiah 60-62 | 3 | 3 |
| 209 | Isaiah 63-66 | 4 | 3 |
| 210 | Nahum 1-3 | 3 | 3 |
| 211 | Zephaniah 1-3 | 3 | 3 |
| 212 | Habakkuk 1-3 | 3 | 3 |
| 213 | Jeremiah 1-4 | 4 | 3 |
| 214 | Jeremiah 5-8 | 4 | 3 |
| 215 | Jeremiah 9-11 | 3 | 3 |
| 216 | Jeremiah 12-14 | 3 | 3 |
| 217 | Jeremiah 15-18 | 4 | 3 |
| 218 | Jeremiah 19-21 | 3 | 3 |
| 219 | Jeremiah 22-25 | 4 | 3 |
| 220 | Jeremiah 26-29 | 4 | 3 |
| 221 | Jeremiah 30-33 | 4 | 3 |
| 222 | Jeremiah 34-37 | 4 | 3 |
| 223 | Jeremiah 38-41 | 4 | 3 |
| 224 | Jeremiah 42-45 | 4 | 3 |
| 225 | Jeremiah 46-49 | 4 | 3 |
| 226 | Jeremiah 50-52 | 3 | 3 |
| 227 | Ezekiel 1-3 | 3 | 3 |
| 228 | Ezekiel 4-7 | 4 | 3 |
| 229 | Ezekiel 8-11 | 4 | 3 |
| 230 | Ezekiel 12-16 | 5 | 3 |
| 231 | Ezekiel 17-20 | 4 | 3 |
| 232 | Ezekiel 21-24 | 4 | 3 |
| 233 | Ezekiel 25-28 | 4 | 3 |
| 234 | Ezekiel 29-32 | 4 | 3 |
| 235 | Ezekiel 33-36 | 4 | 3 |
| 236 | Ezekiel 37-39 | 3 | 3 |
| 237 | Ezekiel 40-46 | 7 | 3 |
| 238 | Ezekiel 47-48 | 2 | 3 |
| 239 | Daniel 1-3 | 3 | 3 |
| 240 | Daniel 4-6 | 3 | 3 |
| 241 | Daniel 7-9 | 3 | 4 |
| 242 | Daniel 10-12 | 3 | 4 |
| 243 | Obadiah | 1 | 4 |
| 244 | Haggai 1-2 | 2 | 4 |
| 245 | Zechariah 1-3 | 3 | 4 |
| 246 | Zechariah 4-6 | 3 | 4 |
| 247 | Zechariah 7-8 | 2 | 4 |
| 248 | Zechariah 9-11 | 3 | 4 |
| 249 | Zechariah 12-14 | 3 | 4 |
| 250 | Malachi 1-2 | 2 | 4 |
| 251 | Malachi 3-4 | 2 | 4 |
| 252 | Psalms 1-2 | 2 | 4 |
| 253 | Psalms 3-5 | 3 | 4 |
| 254 | Psalms 6-8 | 3 | 4 |
| 255 | Psalms 9-11 | 3 | 4 |
| 256 | Psalms 12-14 | 3 | 4 |
| 257 | Psalms 15-17 | 3 | 4 |
| 258 | Psalms 18-20 | 3 | 4 |
| 259 | Psalms 21-23 | 3 | 4 |
| 260 | Psalms 24-26 | 3 | 4 |
| 261 | Psalms 27-29 | 3 | 4 |
| 262 | Psalms 30-32 | 3 | 4 |
| 263 | Psalms 33-35 | 3 | 4 |
| 264 | Psalms 36-38 | 3 | 4 |
| 265 | Psalms 39-41 | 3 | 4 |
| 266 | Psalms 42-44 | 3 | 4 |
| 267 | Psalms 45-47 | 3 | 4 |
| 268 | Psalms 48-50 | 3 | 4 |
| 269 | Psalms 51-53 | 3 | 4 |
| 270 | Psalms 54-56 | 3 | 4 |
| 271 | Psalms 57-59 | 3 | 4 |
| 272 | Psalms 60-62 | 3 | 4 |
| 273 | Psalms 63-65 | 3 | 4 |
| 274 | Psalms 66-68 | 3 | 4 |
| 275 | Psalms 69-72 | 4 | 4 |
| 276 | Psalms 73-75 | 3 | 4 |
| 277 | Psalms 76-78 | 3 | 4 |
| 278 | Psalms 79-81 | 3 | 4 |
| 279 | Psalms 82-84 | 3 | 4 |
| 280 | Psalms 85-86 | 2 | 4 |
| 281 | Psalms 87-89 | 3 | 4 |
| 282 | Psalms 90-92 | 3 | 4 |
| 283 | Psalms 93-95 | 3 | 4 |
| 284 | Psalms 96-98 | 3 | 4 |
| 285 | Psalms 99-101 | 3 | 4 |
| 286 | Psalms 102-103 | 2 | 4 |
| 287 | Psalms 104-106 | 3 | 4 |
| 288 | Psalms 107-109 | 3 | 4 |
| 289 | Psalms 110-112 | 3 | 4 |
| 290 | Psalms 113-115 | 3 | 4 |
| 291 | Psalms 116-118 | 3 | 4 |
| 292 | Psalms 119 | 1 | 4 |
| 293 | Psalms 120-122 | 3 | 4 |
| 294 | Psalms 123-125 | 3 | 4 |
| 295 | Psalms 126-129 | 4 | 4 |
| 296 | Psalms 130-133 | 4 | 4 |
| 297 | Psalms 134-137 | 4 | 4 |
| 298 | Psalms 138-141 | 4 | 4 |
| 299 | Psalms 142-145 | 4 | 4 |
| 300 | Psalms 146-148 | 3 | 4 |
| 301 | Psalms 149-150 | 2 | 4 |
| 302 | Proverbs 1-3 | 3 | 4 |
| 303 | Proverbs 4-6 | 3 | 4 |
| 304 | Proverbs 7-9 | 3 | 4 |
| 305 | Proverbs 10-12 | 3 | 4 |
| 306 | Proverbs 13-15 | 3 | 4 |
| 307 | Proverbs 16-18 | 3 | 4 |
| 308 | Proverbs 19-21 | 3 | 4 |
| 309 | Proverbs 22-24 | 3 | 4 |
| 310 | Proverbs 25-27 | 3 | 4 |
| 311 | Proverbs 28-31 | 4 | 4 |
| 312 | Job 1-3 | 3 | 4 |
| 313 | Job 4-7 | 4 | 4 |
| 314 | Job 8-10 | 3 | 4 |
| 315 | Job 11-14 | 4 | 4 |
| 316 | Job 15-17 | 3 | 4 |
| 317 | Job 18-19 | 2 | 4 |
| 318 | Job 20-21 | 2 | 4 |
| 319 | Job 22-24 | 3 | 4 |
| 320 | Job 25-28 | 4 | 4 |
| 321 | Job 29-31 | 3 | 4 |
| 322 | Job 32-33 | 2 | 4 |
| 323 | Job 34-37 | 4 | 4 |
| 324 | Job 38-39 | 2 | 4 |
| 325 | Job 40-42 | 3 | 4 |
| 326 | Song of Songs 1-3 | 3 | 4 |
| 327 | Song of Songs 4-6 | 3 | 4 |
| 328 | Song of Songs 7-8 | 2 | 4 |
| 329 | Ruth 1-4 | 4 | 4 |
| 330 | Lamentations 1-2 | 2 | 4 |
| 331 | Lamentations 3-5 | 3 | 4 |
| 332 | Ecclesiastes 1-3 | 3 | 4 |
| 333 | Ecclesiastes 4-6 | 3 | 4 |
| 334 | Ecclesiastes 7-9 | 3 | 5 |
| 335 | Ecclesiastes 10-12 | 3 | 5 |
| 336 | Esther 1-3 | 3 | 5 |
| 337 | Esther 4-6 | 3 | 5 |
| 338 | Esther 7-10 | 4 | 5 |
| 339 | Ezra 1-3 | 3 | 5 |
| 340 | Ezra 4-6 | 3 | 5 |
| 341 | Ezra 7-10 | 4 | 5 |
| 342 | Nehemiah 1-3 | 3 | 5 |
| 343 | Nehemiah 4-7 | 4 | 5 |
| 344 | Nehemiah 8-10 | 3 | 5 |
| 345 | Nehemiah 11-13 | 3 | 5 |
| 346 | 1 Chronicles 1-3 | 3 | 5 |
| 347 | 1 Chronicles 4-6 | 3 | 5 |
| 348 | 1 Chronicles 7-9 | 3 | 5 |
| 349 | 1 Chronicles 10-12 | 3 | 5 |
| 350 | 1 Chronicles 13-15 | 3 | 5 |
| 351 | 1 Chronicles 16-18 | 3 | 5 |
| 352 | 1 Chronicles 19-21 | 3 | 5 |
| 353 | 1 Chronicles 22-24 | 3 | 5 |
| 354 | 1 Chronicles 25-27 | 3 | 5 |
| 355 | 1 Chronicles 28-29 | 2 | 5 |
| 356 | 2 Chronicles 1-4 | 4 | 5 |
| 357 | 2 Chronicles 5-8 | 4 | 5 |
| 358 | 2 Chronicles 9-12 | 4 | 5 |
| 359 | 2 Chronicles 13-16 | 4 | 5 |
| 360 | 2 Chronicles 17-20 | 4 | 5 |
| 361 | 2 Chronicles 21-24 | 4 | 5 |
| 362 | 2 Chronicles 25-27 | 3 | 5 |
| 363 | 2 Chronicles 28-30 | 3 | 5 |
| 364 | 2 Chronicles 31-33 | 3 | 5 |
| 365 | 2 Chronicles 34-36 | 3 | 5 |

Validation: 365 consecutive days; all 66 books and 1,189 chapters included exactly once.
Source SHA-256: `25ffeb04a418b1f6e04248e96bdbb7a3091237fc554ed9d0f18ec52cf4d3d42e`.
