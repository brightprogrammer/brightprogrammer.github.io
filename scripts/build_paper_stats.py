#!/usr/bin/env python3
import json
import os
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from html import unescape

MAILTO = "hello@brightprogrammer.in"
REQUEST_DELAY = 0.35

START_YEAR = 2000
END_YEAR = 2026

SEARCH_QUERIES = [
    "browser extension",
    "browser extensions",
]

TITLE_MATCH = re.compile(r"\bbrowser\b.*\bextensions?\b|\bextensions?\b.*\bbrowser\b", re.I)

TOP_VENUE_PATTERNS = [
    re.compile(r"USENIX Security", re.I),
    re.compile(r"Network and Distributed System Security Symposium", re.I),
    re.compile(r"\bNDSS\b", re.I),
    re.compile(r"IEEE Symposium on Security and Privacy", re.I),
    re.compile(r"ACM (SIGSAC )?Conference on Computer and Communications Security", re.I),
    re.compile(r"\bCCS\b", re.I),
]

USENIX_SECURITY_URL_TEMPLATE = "https://www.usenix.org/conference/usenixsecurity{suffix}/technical-sessions"
USENIX_USER_AGENT = "Mozilla/5.0 (compatible; brightprogrammer-bot/1.0)"


def fetch_json(url, retries=8):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "brightprogrammer-bot"})
            with urllib.request.urlopen(req) as response:
                return json.load(response)
        except Exception as exc:
            if "429" in str(exc):
                time.sleep(2 + attempt * 3)
                continue
            raise
    raise RuntimeError(f"Crossref rate limit persisted for {url}")


def fetch_html(url):
    req = urllib.request.Request(url, headers={"User-Agent": USENIX_USER_AGENT})
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise


def normalize_year(item):
    issued = item.get("issued", {}).get("date-parts", [])
    if issued and issued[0]:
        return issued[0][0]
    created = item.get("created", {}).get("date-parts", [])
    if created and created[0]:
        return created[0][0]
    return None


def matches_top_venue(container_titles):
    for title in container_titles:
        for pattern in TOP_VENUE_PATTERNS:
            if pattern.search(title):
                return True
    return False


def normalize_title(title):
    cleaned = re.sub(r"[^a-z0-9 ]", " ", title.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def fetch_usenix_security_items():
    items = []
    years_found = []
    matched = 0
    for year in range(START_YEAR, END_YEAR + 1):
        suffix = str(year)[2:]
        url = USENIX_SECURITY_URL_TEMPLATE.format(suffix=suffix)
        html = fetch_html(url)
        if html is None:
            continue

        years_found.append(year)
        pattern = re.compile(
            rf'<a href="(/conference/usenixsecurity{suffix}/presentation/[^"]+)">([^<]+)</a>',
            re.I,
        )
        seen_links = set()
        for href, raw_title in pattern.findall(html):
            if href in seen_links:
                continue
            seen_links.add(href)
            title = unescape(raw_title).strip()
            if not title or not TITLE_MATCH.search(title):
                continue

            matched += 1
            items.append(
                {
                    "title": [title],
                    "URL": f"https://www.usenix.org{href}",
                    "container-title": ["USENIX Security"],
                    "issued": {"date-parts": [[year]]},
                    "is-referenced-by-count": 0,
                    "source": "usenix",
                }
            )

        time.sleep(REQUEST_DELAY)

    meta = {
        "years_with_pages": years_found,
        "matched_papers": matched,
        "url_template": USENIX_SECURITY_URL_TEMPLATE,
    }

    return items, meta


def build_all_items():
    items = []
    seen = set()
    raw_unique = 0
    matched_unique = 0

    for query in SEARCH_QUERIES:
        cursor = "*"
        while True:
            params = {
                "query.title": query,
                "filter": f"from-pub-date:{START_YEAR}-01-01,until-pub-date:{END_YEAR}-12-31",
                "rows": "500",
                "cursor": cursor,
                "mailto": MAILTO,
            }
            url = "https://api.crossref.org/works?" + urllib.parse.urlencode(params)
            data = fetch_json(url)
            message = data.get("message", {})
            results = message.get("items", [])
            if not results:
                break

            for item in results:
                doi = item.get("DOI")
                key = doi or item.get("URL") or "|".join(item.get("title", []))
                if key in seen:
                    continue
                seen.add(key)
                title = (item.get("title") or [""])[0]
                year = normalize_year(item)
                if title:
                    normalized = normalize_title(title)
                    if normalized:
                        seen.add(f"title:{normalized}:{year or 'na'}")
                raw_unique += 1
                if TITLE_MATCH.search(title):
                    items.append(item)
                    matched_unique += 1

            cursor = message.get("next-cursor")
            if not cursor:
                break
            time.sleep(REQUEST_DELAY)

    usenix_items, usenix_meta = fetch_usenix_security_items()
    usenix_added = 0
    for item in usenix_items:
        title = (item.get("title") or [""])[0]
        year = normalize_year(item)
        normalized = normalize_title(title)
        key = f"title:{normalized}:{year or 'na'}"
        if key in seen:
            continue
        seen.add(key)
        items.append(item)
        usenix_added += 1

    usenix_meta["added_items"] = usenix_added

    return items, raw_unique, matched_unique, usenix_meta


def to_dataset(items, filter_top_venues, source_meta):
    counts = {year: {"works": 0, "citations": 0, "papers": []} for year in range(START_YEAR, END_YEAR + 1)}
    total_works = 0
    total_citations = 0

    for item in items:
        year = normalize_year(item)
        if year is None or year < START_YEAR or year > END_YEAR:
            continue

        container_titles = item.get("container-title") or []
        if filter_top_venues and not matches_top_venue(container_titles):
            continue

        title = (item.get("title") or ["Untitled"])[0]
        citations = item.get("is-referenced-by-count") or 0
        url = item.get("URL")
        doi = item.get("DOI")
        url_out = f"https://doi.org/{doi}" if doi else url
        venue = container_titles[0] if container_titles else None

        counts[year]["works"] += 1
        counts[year]["citations"] += citations
        counts[year]["papers"].append(
            {
                "title": title,
                "url": url_out,
                "venue": venue,
                "citations": citations,
            }
        )
        total_works += 1
        total_citations += citations

    for year in counts:
        counts[year]["papers"].sort(key=lambda p: (-p.get("citations", 0), p.get("title", "")))

    return {
        "source": {
            "name": "Crossref REST API",
            "url": "https://api.crossref.org/",
            "query": f"query.title={SEARCH_QUERIES}; filter=from-pub-date:{START_YEAR}-01-01,until-pub-date:{END_YEAR}-12-31",
            "raw_unique_results": source_meta["raw_unique_results"],
            "matched_unique_results": source_meta["matched_unique_results"],
            "match_rule": "title contains both 'browser' and 'extension(s)' (any order, case-insensitive)",
        },
        "range": {"start_year": START_YEAR, "end_year": END_YEAR},
        "totals": {"works": total_works, "citations": total_citations},
        "years": [
            {
                "year": year,
                "works": counts[year]["works"],
                "citations": counts[year]["citations"],
                "papers": counts[year]["papers"],
            }
            for year in range(START_YEAR, END_YEAR + 1)
        ],
    }


def write_json(path, payload):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def main():
    items, raw_unique, matched_unique, usenix_meta = build_all_items()
    source_meta = {
        "raw_unique_results": raw_unique,
        "matched_unique_results": matched_unique,
    }
    all_data = to_dataset(items, filter_top_venues=False, source_meta=source_meta)
    top_data = to_dataset(items, filter_top_venues=True, source_meta=source_meta)

    for payload in (all_data, top_data):
        payload["supplemental_sources"] = {
            "usenix_security": usenix_meta,
        }

    write_json("data/paper_stats/browser_extension_security_all.json", all_data)
    write_json("data/paper_stats/browser_extension_security.json", top_data)

    print(
        "Wrote datasets:",
        all_data["totals"]["works"],
        "all works,",
        top_data["totals"]["works"],
        "top venue works",
    )


if __name__ == "__main__":
    main()
