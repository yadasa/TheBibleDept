"""Refresh compact, bundled podcast metadata from the publisher's public RSS feed."""
import argparse
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

FEED = 'https://feeds.redcircle.com/64849f8b-c8f4-4999-8ce6-d9d3450e0cf1'
ROOT = Path(__file__).resolve().parents[1]
PRINTED_LABELS = {42:'Philemon',43:'Titus',54:'2 Peter 1-3 & Jude',75:'2 & 3 John',243:'Obadiah'}
REVIEWED_DIFFERENCES = {131:'Deuteronomy 19-22',166:'1 Kings 9-10',167:'1 Kings 11-14',237:'Ezekiel 40-44',238:'Ezekiel 45-48',320:'Job 24-28'}
INTRO_GUID = '61b3e9e0-ceea-415c-b7ff-67ca617ca0e9'

def normalize(value):
    return re.sub(r'[^a-z0-9]', '', value.lower().replace('psalms','psalm'))

def media_metadata(item, label):
    guid = item.findtext('guid','')
    enclosure = item.find('enclosure')
    audio = re.fullmatch(r'https://audio3\.redcircle\.com/episodes/([0-9a-f-]{36})/stream\.mp3',enclosure.get('url','') if enclosure is not None else '')
    if not re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',guid) or not audio:
        raise ValueError(f'Unexpected episode IDs or media URL: {label}')
    duration = int(item.findtext('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration','0'))
    if duration <= 0 or enclosure.get('type') != 'audio/mpeg':
        raise ValueError(f'Invalid media metadata: {label}')
    return [guid.replace('-',''), audio[1].replace('-',''), duration]

def build(raw, plan):
    channel = ET.fromstring(raw).find('channel')
    if channel is None or channel.findtext('title') != 'The Bible Dept.':
        raise ValueError('Unexpected podcast feed')
    days = {}
    readings = {}
    intro = None
    for item in channel.findall('item'):
        if item.findtext('guid') == INTRO_GUID:
            if intro is not None:
                raise ValueError('Duplicate introduction')
            intro = {'title':item.findtext('title'), 'episode':media_metadata(item,'introduction')}
            continue
        match = re.match(r'^Day\s*(\d+)\s*[:\-–—]?\s*(.*)$',item.findtext('title',''),re.I)
        if not match:
            continue  # Trailers and announcements are not numbered plan days.
        day, actual = int(match[1]), match[2].strip()
        if day in days or not 1 <= day <= 365:
            raise ValueError(f'Duplicate or out-of-range day: {day}')
        entry = plan['days'][day-1]
        parts = [entry] if isinstance(entry[0],int) else entry
        expected = PRINTED_LABELS.get(day) or ' & '.join(
            f'{plan["books"][p[0]][0]} {p[1]}' + (f'-{p[2]}' if len(p)>2 else '') for p in parts)
        if normalize(actual) != normalize(expected):
            if normalize(actual) != normalize(REVIEWED_DIFFERENCES.get(day,'')):
                raise ValueError(f'Day {day} needs review: plan={expected!r}, podcast={actual!r}')
            readings[str(day)] = actual
        days[day] = media_metadata(item,f'day {day}')
    if set(days) != set(range(1,366)):
        raise ValueError(f'Missing numbered days: {sorted(set(range(1,366))-set(days))}')
    if intro is None:
        raise ValueError('Missing official Day 000 introduction')
    return {'episodes':[days[day] for day in range(1,366)], 'readings':dict(sorted(readings.items(),key=lambda pair:int(pair[0]))), 'intro':intro}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed-file',type=Path,help='Use a saved RSS file for offline verification')
    parser.add_argument('--check',action='store_true',help='Compare with the bundled map without writing')
    args = parser.parse_args()
    raw = args.feed_file.read_bytes() if args.feed_file else urllib.request.urlopen(FEED,timeout=30).read()
    plan = json.loads((ROOT/'src/data/bibledept-365.json').read_text(encoding='utf-8'))
    result = build(raw,plan)
    encoded = json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n'
    target = ROOT/'src/data/bibledept-podcasts.json'
    if args.check:
        if target.read_text(encoding='utf-8') != encoded:
            raise SystemExit('Podcast metadata changed; review before updating.')
    else:
        target.write_text(encoded,encoding='utf-8')
    print(f'365 verified daily episodes plus optional introduction; {len(result["readings"])} reviewed range differences; {len(encoded.encode("utf-8")):,} bytes. No audio files downloaded.')
