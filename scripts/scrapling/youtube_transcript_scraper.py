#!/usr/bin/env python3
"""
YouTube Transcript Scraper using Scrapling

High-performance replacement for cache-top-transcripts.js
Uses Scrapling's StealthyFetcher for anti-bot bypass and 774x faster extraction.

Usage:
    python youtube_transcript_scraper.py              # Scrape priority videos
    python youtube_transcript_scraper.py --video ID  # Scrape specific video
    python youtube_transcript_scraper.py --async     # Concurrent scraping

Requirements:
    pip install scrapling python-dotenv aiofiles
"""

import json
import re
import os
import sys
import asyncio
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from scrapling.fetchers import Fetcher, StealthyFetcher, AsyncStealthySession
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent.parent / '.env')

# Configuration
TRANSCRIPTS_DIR = Path(__file__).parent.parent.parent / 'context' / 'youtube-knowledge' / 'transcripts'

# Priority videos for pre-caching (same as Node.js version)
PRIORITY_VIDEOS = [
    # PDF/Document Processing
    {"id": "pXDgpYyEkeM", "topic": "pdf-extraction", "title": "Extract Text From ANYTHING Using AI + n8n"},
    # Beginner Courses
    {"id": "GIZzRGYpCbM", "topic": "beginner", "title": "freeCodeCamp 6-hour n8n Course"},
    {"id": "lK3veuZAg0c", "topic": "beginner-to-pro", "title": "Nick Saraev - Beginner to Pro"},
    # AI Agents
    {"id": "ZHH3sr234zY", "topic": "ai-agents", "title": "Nate Herk AI Agent Masterclass"},
    {"id": "4o0AJYBEiBo", "topic": "langchain", "title": "LangChain Code Node Tutorial"},
    # Error Handling
    {"id": "Zy4cVtHJNvc", "topic": "error-handling", "title": "5 Production Error Handling Techniques"},
    # Webhooks & APIs
    {"id": "lK3veuZAg0c", "topic": "webhooks", "title": "Webhook Tutorial"},
    # Common Integrations
    {"id": "Jm7kfWYPaVw", "topic": "whatsapp", "title": "WhatsApp + Google Sheets Agent"},
]


def is_cached(video_id: str) -> bool:
    """Check if transcript is already cached."""
    return (TRANSCRIPTS_DIR / f"{video_id}.json").exists()


def save_transcript(video_id: str, data: Dict[str, Any]) -> None:
    """Save transcript to cache."""
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = TRANSCRIPTS_DIR / f"{video_id}.json"
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Cached: {cache_path}")


def parse_caption_xml(xml_content: str) -> List[Dict[str, Any]]:
    """Parse YouTube caption XML into segments."""
    segments = []
    pattern = r'<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)</text>'
    
    for match in re.finditer(pattern, xml_content):
        text = match.group(3)
        # HTML entity decoding
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&#39;', "'")
        text = text.replace('&quot;', '"')
        
        segments.append({
            "start": float(match.group(1)),
            "duration": float(match.group(2)),
            "text": text
        })
    
    return segments


def fetch_transcript_sync(video_id: str) -> Dict[str, Any]:
    """
    Fetch transcript using Scrapling's StealthyFetcher.
    
    Uses anti-bot bypass features for reliable YouTube scraping.
    """
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    try:
        # Use StealthyFetcher for anti-bot bypass
        page = StealthyFetcher.fetch(
            video_url,
            headless=True,
            block_images=True,          # Speed optimization
            disable_resources=True,      # Disable fonts, media
            network_idle=True,           # Wait for page load
        )
        
        if page.status != 200:
            return {
                "status": "error",
                "videoId": video_id,
                "message": f"HTTP {page.status}"
            }
        
        # Extract caption track URL from page content
        html = page.body if isinstance(page.body, str) else page.body.decode('utf-8', errors='replace')
        caption_match = re.search(r'"captionTracks":\[.*?"baseUrl":"([^"]+)"', html)
        
        if not caption_match:
            return {
                "status": "no_captions",
                "videoId": video_id,
                "message": "No captions available"
            }
        
        # Clean up the URL
        caption_url = caption_match.group(1).replace('\\u0026', '&')
        
        # Fetch captions with basic Fetcher (XML, no anti-bot needed)
        caption_page = Fetcher.get(caption_url, stealthy_headers=True)
        caption_xml = caption_page.body if isinstance(caption_page.body, str) else caption_page.body.decode('utf-8', errors='replace')
        
        # Parse XML captions
        segments = parse_caption_xml(caption_xml)
        full_text = ' '.join(seg['text'] for seg in segments)
        
        return {
            "status": "success",
            "videoId": video_id,
            "fetchedAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "segments": segments,
            "fullText": full_text,
            "scraper": "scrapling-stealthy"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "videoId": video_id,
            "message": str(e)
        }


async def fetch_transcript_async(session: AsyncStealthySession, video_id: str) -> Dict[str, Any]:
    """
    Async version using browser tab pool for concurrent scraping.
    """
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    try:
        page = await session.fetch(video_url)
        
        if page.status != 200:
            return {
                "status": "error",
                "videoId": video_id,
                "message": f"HTTP {page.status}"
            }
        
        html = page.body if isinstance(page.body, str) else page.body.decode('utf-8', errors='replace')
        caption_match = re.search(r'"captionTracks":\[.*?"baseUrl":"([^"]+)"', html)

        if not caption_match:
            return {
                "status": "no_captions",
                "videoId": video_id,
                "message": "No captions available"
            }

        caption_url = caption_match.group(1).replace('\\u0026', '&')

        # Fetch captions (can use sync Fetcher here)
        caption_page = Fetcher.get(caption_url, stealthy_headers=True)
        caption_xml = caption_page.body if isinstance(caption_page.body, str) else caption_page.body.decode('utf-8', errors='replace')
        segments = parse_caption_xml(caption_xml)
        full_text = ' '.join(seg['text'] for seg in segments)
        
        return {
            "status": "success",
            "videoId": video_id,
            "fetchedAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "segments": segments,
            "fullText": full_text,
            "scraper": "scrapling-async-stealthy"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "videoId": video_id,
            "message": str(e)
        }


async def scrape_async(videos: List[Dict[str, str]], force: bool = False) -> Dict[str, int]:
    """
    Scrape multiple videos concurrently using browser tab pool.
    
    Args:
        videos: List of video dicts with 'id', 'topic', 'title'
        force: Re-scrape even if cached
    
    Returns:
        Stats dict with cached, skipped, failed counts
    """
    stats = {"cached": 0, "skipped": 0, "failed": 0}
    
    # Filter out already cached videos
    to_scrape = []
    for video in videos:
        if not force and is_cached(video['id']):
            print(f"\n[{video['topic']}] {video['title']}")
            print("  Already cached, skipping")
            stats["skipped"] += 1
        else:
            to_scrape.append(video)
    
    if not to_scrape:
        return stats
    
    print(f"\n🚀 Scraping {len(to_scrape)} videos concurrently...")
    
    # Use browser tab pool for concurrent scraping
    async with AsyncStealthySession(
        max_pages=3,              # Pool of 3 browser tabs
        headless=True,
        block_images=True,
        disable_resources=True,
    ) as session:
        
        # Create tasks for all videos
        tasks = []
        for video in to_scrape:
            print(f"\n[{video['topic']}] {video['title']}")
            print(f"  Queuing {video['id']}...")
            tasks.append(fetch_transcript_async(session, video['id']))
        
        # Execute concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for video, result in zip(to_scrape, results):
            if isinstance(result, Exception):
                print(f"  Error: {result}")
                stats["failed"] += 1
                continue
            
            if result["status"] == "success":
                save_transcript(video['id'], result)
                stats["cached"] += 1
            else:
                print(f"  Failed: {result.get('message', 'Unknown error')}")
                save_transcript(video['id'], result)  # Cache failure status
                stats["failed"] += 1
    
    return stats


def scrape_sync(videos: List[Dict[str, str]], force: bool = False) -> Dict[str, int]:
    """
    Scrape videos sequentially (safer, but slower).
    
    Args:
        videos: List of video dicts with 'id', 'topic', 'title'
        force: Re-scrape even if cached
    
    Returns:
        Stats dict with cached, skipped, failed counts
    """
    stats = {"cached": 0, "skipped": 0, "failed": 0}
    
    for video in videos:
        print(f"\n[{video['topic']}] {video['title']}")
        
        if not force and is_cached(video['id']):
            print("  Already cached, skipping")
            stats["skipped"] += 1
            continue
        
        print(f"  Fetching transcript for {video['id']}...")
        result = fetch_transcript_sync(video['id'])
        
        if result["status"] == "success":
            save_transcript(video['id'], result)
            stats["cached"] += 1
        else:
            print(f"  Failed: {result.get('message', 'Unknown error')}")
            save_transcript(video['id'], result)
            stats["failed"] += 1
    
    return stats


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="YouTube Transcript Scraper using Scrapling (774x faster)"
    )
    parser.add_argument(
        "--video", "-v",
        help="Specific video ID to scrape"
    )
    parser.add_argument(
        "--async", "-a",
        dest="use_async",
        action="store_true",
        help="Use concurrent async scraping (faster)"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Re-scrape even if cached"
    )
    
    args = parser.parse_args()
    
    print("🎬 YouTube Transcript Scraper (Scrapling Edition)")
    print("=" * 50)
    
    if args.video:
        # Single video mode
        videos = [{"id": args.video, "topic": "custom", "title": f"Video {args.video}"}]
    else:
        videos = PRIORITY_VIDEOS
    
    print(f"📋 Videos to process: {len(videos)}")
    
    start_time = datetime.now()
    
    if args.use_async:
        stats = asyncio.run(scrape_async(videos, force=args.force))
    else:
        stats = scrape_sync(videos, force=args.force)
    
    duration = (datetime.now() - start_time).total_seconds()
    
    print("\n" + "=" * 50)
    print("📊 Summary")
    print(f"  Cached: {stats['cached']}")
    print(f"  Skipped: {stats['skipped']}")
    print(f"  Failed: {stats['failed']}")
    print(f"  Duration: {duration:.1f}s")
    print(f"\n📁 Transcripts: {TRANSCRIPTS_DIR}")


if __name__ == "__main__":
    main()
