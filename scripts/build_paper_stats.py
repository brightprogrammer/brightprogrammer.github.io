#!/usr/bin/env python3
import json
import os
import re
import time
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

MAILTO = "hello@brightprogrammer.in"

START_YEAR = 2000
END_YEAR = 2026

SEARCH_QUERIES = [
    "browser extension",
    "browser extensions",
]

TITLE_MATCH = re.compile(r"\bbrowsers?\b.*\bextensions?\b|\bextensions?\b.*\bbrowsers?\b", re.I)

TOP_VENUE_PATTERNS = [
    re.compile(r"USENIX Security", re.I),
    re.compile(r"USENIX Security Symposium", re.I),
    re.compile(r"Network and Distributed System Security Symposium", re.I),
    re.compile(r"\bNDSS\b", re.I),
    re.compile(r"IEEE Symposium on Security and Privacy", re.I),
    re.compile(r"\bS&P\b", re.I),
    re.compile(r"ACM (SIGSAC )?Conference on Computer and Communications Security", re.I),
    re.compile(r"\bCCS\b", re.I),
]

DBLP_ENDPOINT = "https://dblp.org/search/publ/api"
DBLP_DELAY = 0.4

ARXIV_ENDPOINT = "http://export.arxiv.org/api/query"
ARXIV_DELAY = 0.5

OPENCITATIONS_ENDPOINT = "https://opencitations.net/index/coci/api/v1/citation-count/"
OPENCITATIONS_DELAY = 0.25

USER_AGENT = "brightprogrammer-bot"


def fetch_json(url, headers=None, retries=6, timeout=20):
    headers = headers or {"User-Agent": USER_AGENT}
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.load(response)
        except Exception as exc:
            if "429" in str(exc):
                time.sleep(2 + attempt * 3)
                continue
            raise
    raise RuntimeError(f"Rate limit persisted for {url}")


def fetch_text(url, headers=None, retries=8):
    headers = headers or {"User-Agent": USER_AGENT}
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as response:
                return response.read().decode("utf-8", "ignore")
        except Exception as exc:
            if "429" in str(exc):
                time.sleep(2 + attempt * 3)
                continue
            raise
    raise RuntimeError(f"Rate limit persisted for {url}")


def normalize_title(title):
    cleaned = re.sub(r"[^a-z0-9 ]", " ", title.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def normalize_year(year):
    try:
        year = int(year)
    except (TypeError, ValueError):
        return None
    if START_YEAR <= year <= END_YEAR:
        return year
    return None


def matches_top_venue(venue):
    if not venue:
        return False
    for pattern in TOP_VENUE_PATTERNS:
        if pattern.search(venue):
            return True
    return False


def parse_dblp_hit(hit):
    info = hit.get("info", {})
    title = info.get("title") or ""
    if title.endswith("."):
        title = title[:-1]
    year = normalize_year(info.get("year"))
    venue = info.get("venue") or info.get("booktitle") or info.get("journal")
    doi = info.get("doi")

    ee = info.get("ee")
    url = None
    if isinstance(ee, list) and ee:
        url = ee[0]
    elif isinstance(ee, str):
        url = ee
    else:
        url = info.get("url")

    return {
        "title": title,
        "year": year,
        "venue": venue,
        "doi": doi,
        "url": url,
        "source": "dblp",
    }


def fetch_dblp_results(query):
    results = []
    total = None
    offset = 0
    page_size = 1000

    while True:
        params = {
            "q": query,
            "format": "json",
            "h": str(page_size),
            "f": str(offset),
        }
        url = DBLP_ENDPOINT + "?" + urllib.parse.urlencode(params)
        data = fetch_json(url)
        hits = data.get("result", {}).get("hits", {})
        total = int(hits.get("@total", 0))
        hit_items = hits.get("hit", [])
        if isinstance(hit_items, dict):
            hit_items = [hit_items]

        for hit in hit_items:
            results.append(parse_dblp_hit(hit))

        offset += len(hit_items)
        if offset >= total or not hit_items:
            break
        time.sleep(DBLP_DELAY)

    return results, total


def fetch_arxiv_results():
    results = []
    total = None
    start = 0
    batch = 100
    query = "ti:\"browser extension\" OR ti:\"browser extensions\""

    while True:
        params = {
            "search_query": query,
            "start": str(start),
            "max_results": str(batch),
            "sortBy": "submittedDate",
            "sortOrder": "ascending",
        }
        url = ARXIV_ENDPOINT + "?" + urllib.parse.urlencode(params)
        xml_text = fetch_text(url)
        root = ET.fromstring(xml_text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        if total is None:
            total_tag = root.find("atom:totalResults", ns)
            if total_tag is not None and total_tag.text:
                try:
                    total = int(total_tag.text)
                except ValueError:
                    total = None

        entries = root.findall("atom:entry", ns)
        if not entries:
            break

        for entry in entries:
            title_tag = entry.find("atom:title", ns)
            published_tag = entry.find("atom:published", ns)
            id_tag = entry.find("atom:id", ns)
            title = " ".join((title_tag.text or "").split()) if title_tag is not None else ""
            year = None
            if published_tag is not None and published_tag.text:
                year = normalize_year(published_tag.text[:4])
            url = id_tag.text.strip() if id_tag is not None else None

            results.append(
                {
                    "title": title,
                    "year": year,
                    "venue": "arXiv",
                    "doi": None,
                    "url": url,
                    "source": "arxiv",
                }
            )

        start += len(entries)
        if total is not None and start >= total:
            break
        time.sleep(ARXIV_DELAY)

    return results, total


def fetch_opencitations_citations(doi):
    if not doi:
        return 0
    url = OPENCITATIONS_ENDPOINT + urllib.parse.quote(doi)
    data = fetch_json(url)
    if isinstance(data, list) and data:
        count = data[0].get("count")
        try:
            return int(count)
        except (TypeError, ValueError):
            return 0
    return 0


def build_items():
    items = []
    seen_titles = set()
    seen_dois = set()

    dblp_total = 0
    dblp_matches = 0
    for query in SEARCH_QUERIES:
        dblp_results, total = fetch_dblp_results(query)
        dblp_total += total
        for item in dblp_results:
            title = item["title"]
            if not title or not TITLE_MATCH.search(title):
                continue
            year = item["year"]
            if year is None:
                continue

            key_title = normalize_title(title)
            doi = item.get("doi")
            if doi:
                if doi in seen_dois:
                    continue
                seen_dois.add(doi)
            if key_title in seen_titles:
                continue
            seen_titles.add(key_title)

            items.append(item)
            dblp_matches += 1

        time.sleep(DBLP_DELAY)

    arxiv_results, arxiv_total = fetch_arxiv_results()
    arxiv_matches = 0
    for item in arxiv_results:
        title = item["title"]
        if not title or not TITLE_MATCH.search(title):
            continue
        year = item["year"]
        if year is None:
            continue

        key_title = normalize_title(title)
        if key_title in seen_titles:
            continue
        seen_titles.add(key_title)

        items.append(item)
        arxiv_matches += 1

    source_meta = {
        "dblp_total_results": dblp_total,
        "dblp_matched_results": dblp_matches,
        "arxiv_total_results": arxiv_total,
        "arxiv_matched_results": arxiv_matches,
    }

    return items, source_meta


def enrich_citations(items):
    citations_total = 0
    for item in items:
        citations = 0
        try:
            citations = fetch_opencitations_citations(item.get("doi"))
        except Exception:
            citations = 0
        item["citations"] = citations
        citations_total += citations
        time.sleep(OPENCITATIONS_DELAY)
    return citations_total


def to_dataset(items, filter_top_venues, source_meta):
    counts = {year: {"works": 0, "citations": 0, "papers": []} for year in range(START_YEAR, END_YEAR + 1)}
    total_works = 0
    total_citations = 0

    for item in items:
        year = item.get("year")
        if year is None or year < START_YEAR or year > END_YEAR:
            continue

        venue = item.get("venue")
        if filter_top_venues and not matches_top_venue(venue):
            continue

        title = item.get("title") or "Untitled"
        citations = item.get("citations") or 0
        url = item.get("url")
        doi = item.get("doi")
        url_out = f"https://doi.org/{doi}" if doi else url

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
            "name": "DBLP + arXiv (citations from OpenCitations COCI)",
            "dblp_query": SEARCH_QUERIES,
            "arxiv_query": "ti:\"browser extension\" OR ti:\"browser extensions\"",
            "match_rule": "title contains both 'browser(s)' and 'extension(s)' (any order, case-insensitive)",
            "meta": source_meta,
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
    items, source_meta = build_items()
    enrich_citations(items)

    all_data = to_dataset(items, filter_top_venues=False, source_meta=source_meta)
    top_data = to_dataset(items, filter_top_venues=True, source_meta=source_meta)

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
