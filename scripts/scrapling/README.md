# Scrapling-Based Scrapers

High-performance web scraping using [Scrapling](https://github.com/D4Vinci/Scrapling) - 774x faster than BeautifulSoup with anti-bot bypass.

## Installation

```bash
cd scripts/scrapling
pip install -r requirements.txt
```

**Note**: Requires Python 3.10+

## YouTube Transcript Scraper

Replacement for `cache-top-transcripts.js` with:
- **StealthyFetcher**: Anti-bot bypass (Cloudflare, etc.)
- **AsyncStealthySession**: Concurrent scraping with browser tab pool
- **774x faster** text extraction

### Usage

```bash
# Scrape priority videos (sequential)
python youtube_transcript_scraper.py

# Scrape priority videos (concurrent - faster)
python youtube_transcript_scraper.py --async

# Scrape specific video
python youtube_transcript_scraper.py --video VIDEO_ID

# Force re-scrape cached videos
python youtube_transcript_scraper.py --force
```

### Performance Comparison

| Method | Speed | Anti-Bot | Notes |
|--------|-------|----------|-------|
| Node.js (original) | Baseline | ❌ Basic UA | May get blocked |
| Scrapling Sync | ~5x faster | ✅ Stealthy | One at a time |
| Scrapling Async | ~15x faster | ✅ Stealthy | 3 concurrent tabs |

### Output

Transcripts saved to: `context/youtube-knowledge/transcripts/{video_id}.json`

```json
{
  "status": "success",
  "videoId": "abc123",
  "fetchedAt": "2025-12-31T00:00:00Z",
  "segments": [
    {"start": 0.0, "duration": 2.5, "text": "Hello..."}
  ],
  "fullText": "Complete transcript...",
  "scraper": "scrapling-stealthy"
}
```

## Architecture

```
scripts/scrapling/
├── requirements.txt              # Dependencies
├── youtube_transcript_scraper.py # YouTube captions scraper
└── README.md                     # This file
```

## Migration Status

| Original Script | Status | Notes |
|-----------------|--------|-------|
| `cache-top-transcripts.js` | ✅ Migrated | → `youtube_transcript_scraper.py` |
| `youtube-indexer.js` | ❌ Not migrating | Uses YouTube API, not scraping |
| `discord-qa-processor.js` | ❌ Not migrating | CSV parsing, not web scraping |

---

## n8n UI Automation

For n8n features with no API (Data Tables, Evaluations), use Scrapling CLI automation.

### Running CLI Scripts

```bash
scrapling shell -c "exec(open('scripts/scrapling/cli_smart_data_table.py').read())"
```

### Core Pattern: Read First, Then Act

```python
from scrapling import DynamicFetcher

def smart_action(page):
    def read_page_state():
        """Always know what you're looking at"""
        print(f'URL: {page.url}')
        for btn in page.locator('button:visible').all()[:10]:
            print(f'  Button: {btn.inner_text().strip()[:40]}')
        return page.url

    def dismiss_overlays():
        """n8n has multiple dialogs that block interaction"""
        for _ in range(3):
            if page.locator('[role="dialog"]:visible').count() > 0:
                page.keyboard.press('Escape')
                page.wait_for_timeout(300)

    read_page_state()
    dismiss_overlays()
    # Then interact based on what you see

DynamicFetcher.fetch(URL, headless=False, page_action=smart_action)
```

### Playwright Best Practices (from official docs)

**Use semantic locators, NOT CSS selectors:**

| Bad (fragile) | Good (resilient) |
|---------------|------------------|
| `page.click('button[class*="_primary_"]')` | `page.get_by_role("button", name="Sign in").click()` |
| `page.locator('input[type="text"]').first` | `page.get_by_label("User Name").fill("value")` |
| `page.locator('[placeholder="email"]')` | `page.get_by_placeholder("Enter your email").fill("x")` |
| `page.locator('text="Submit"')` | `page.get_by_text("Submit").click()` |

**Form filling:**
```python
# By label (best for labeled inputs)
page.get_by_label("User Name").fill("John")
page.get_by_label("Password").fill("secret")

# By placeholder (when no label exists)
page.get_by_placeholder("Enter your email").fill("test@example.com")

# By role (for buttons)
page.get_by_role("button", name="Sign in").click()
```

**Filter and chain locators:**
```python
# Find a list item containing text, then click its button
page.get_by_role("listitem").filter(has_text="Product 2").get_by_role("button").click()
```

**Sources:**
- https://playwright.dev/python/docs/locators
- https://playwright.dev/python/docs/best-practices

### n8n-Specific Patterns

**Known Dialogs to Dismiss** (use Escape key):
- Version Updates Panel: `[data-test-id="version-updates-panel"]`
- NPS Survey Modal: `[data-test-id="nps-survey-modal"]`

**Fallback CSS for n8n's hashed classes** (only if semantic locators fail):
```python
page.click('button[class*="_primary_"]')  # Partial match for CSS modules
```

### Available CLI Scripts

| Script | Purpose |
|--------|---------|
| `cli_proper_data_table.py` | **RECOMMENDED** - Uses Playwright best practices |
| `cli_smart_data_table.py` | Dynamic approach with page state reading |
| `cli_login_test.py` | Simple login test |
| `cli_inspect_*.py` | Page inspection utilities |

### Current Data Table

| Field | Value |
|-------|-------|
| Name | `supersystem-evaluation-dataset` |
| ID | `5Z1aGKJFAcRk4j6n` |
| Project | `hzB82dv0gYRuNHKc` |
| URL | `https://n8n.wranngle.com/projects/hzB82dv0gYRuNHKc/datatables/5Z1aGKJFAcRk4j6n` |
