"""Build small reference waveforms from the real public RedCircle streams.

This is a development-time tool, never shipped or run by the app. FFmpeg streams
and decodes each episode in memory; only 96 quantized RMS values are saved. No
audio files are retained. RedCircle may insert different ads on a later request,
so each entry records its decoded duration and the app uses live PCM where heard.
Requires FFmpeg on PATH and Python 3.12 (audioop).
"""
from __future__ import annotations

import argparse
import audioop
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "bibledept-mobile/src/data/bibledept-podcasts.json"
OUTPUT = ROOT / "bibledept-mobile/src/data/bibledept-podcast-waveforms.json"
BINS = 96
SAMPLE_RATE = 8000


def build(day: int, audio_id: str) -> tuple[int, list]:
    url = f"https://audio3.redcircle.com/episodes/{uuid.UUID(audio_id)}/stream.mp3"
    for attempt in range(3):
        try:
            decoded = subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
                "-rw_timeout", "30000000", "-i", url, "-vn", "-ac", "1",
                "-ar", str(SAMPLE_RATE), "-f", "s16le", "pipe:1",
            ], check=True, capture_output=True, timeout=180)
            pcm = decoded.stdout
            frames = len(pcm) // 2
            if frames < SAMPLE_RATE * 120:
                raise ValueError("Decoded less than two minutes; refusing an incomplete episode")
            values = bytearray()
            for index in range(BINS):
                start, end = frames * index // BINS, frames * (index + 1) // BINS
                rms = audioop.rms(pcm[start * 2:end * 2], 2) / 32768
                values.append(min(255, round(rms * 255)))
            return day, [audio_id, round(frames / SAMPLE_RATE * 1000), base64.b64encode(values).decode("ascii")]
        except (subprocess.SubprocessError, ValueError) as error:
            if attempt == 2:
                raise RuntimeError(f"Day {day}: {error}") from error
            time.sleep(attempt + 1)
    raise AssertionError("unreachable")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=365)
    parser.add_argument("--workers", type=int, default=3, help="Bound concurrent stream requests (1–4)")
    parser.add_argument("--refresh", action="store_true", help="Rebuild already-matching entries")
    args = parser.parse_args()
    if not 1 <= args.start <= args.end <= 365 or not 1 <= args.workers <= 4:
        parser.error("Choose days 1–365 and 1–4 workers")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))["episodes"]
    data = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {
        "version": 1, "bins": BINS, "sampleRate": SAMPLE_RATE, "encoding": "rms-u8-base64", "episodes": {},
    }
    jobs = [(day, catalog[day - 1][1]) for day in range(args.start, args.end + 1)
            if args.refresh or data["episodes"].get(str(day), [None])[0] != catalog[day - 1][1]]
    started = time.monotonic()
    print(f"Decoding {len(jobs)} real streams with {args.workers} workers", flush=True)
    failures = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(build, day, audio_id): day for day, audio_id in jobs}
        for count, future in enumerate(as_completed(futures), 1):
            try:
                day, value = future.result()
                data["episodes"][str(day)] = value
                data["episodes"] = dict(sorted(data["episodes"].items(), key=lambda pair: int(pair[0])))
                temporary = OUTPUT.with_suffix('.json.tmp')
                temporary.write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
                temporary.replace(OUTPUT)
                print(f"{count}/{len(jobs)} Day {day}: {value[1] / 1000:.1f}s, {time.monotonic() - started:.1f}s elapsed", flush=True)
            except Exception as error:
                failures.append(str(error))
                print(f"FAILED: {error}", flush=True)
    print(f"Saved {len(data['episodes'])} waveforms; {OUTPUT.stat().st_size} bytes", flush=True)
    if failures:
        raise SystemExit("\n".join(failures))


if __name__ == "__main__":
    main()
