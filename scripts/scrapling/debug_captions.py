#!/usr/bin/env python3
"""Debug YouTube caption fetching"""
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from scrapling.fetchers import Fetcher

video_id = "pXDgpYyEkeM"
url = f"https://www.youtube.com/watch?v={video_id}"

print(f"Fetching: {url}")
page = Fetcher.get(url, stealthy_headers=True)
print(f"Status: {page.status}")

body = page.body if isinstance(page.body, str) else page.body.decode('utf-8', errors='replace')

# Find caption tracks
caption_match = re.search(r'"captionTracks":\[.*?"baseUrl":"([^"]+)"', body)
if caption_match:
    caption_url = caption_match.group(1).replace('\\u0026', '&')
    print(f"\nCaption URL found:\n{caption_url[:300]}...")
    
    print("\n\nFetching captions...")
    cap_page = Fetcher.get(caption_url, stealthy_headers=True)
    cap_body = cap_page.body if isinstance(cap_page.body, str) else cap_page.body.decode('utf-8', errors='replace')
    
    print(f"\nCaption response (first 2000 chars):\n{cap_body[:2000]}")
    
    # Test the regex
    pattern = r'<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)</text>'
    matches = list(re.finditer(pattern, cap_body))
    print(f"\n\nRegex matches found: {len(matches)}")
    if matches:
        for m in matches[:3]:
            print(f"  {m.group(1)}: {m.group(3)[:50]}")
else:
    print("No caption tracks found in page!")
    # Debug: look for any caption-related content
    if '"captions"' in body:
        idx = body.find('"captions"')
        print(f"\nCaptions section found at {idx}:")
        print(body[idx:idx+500])
