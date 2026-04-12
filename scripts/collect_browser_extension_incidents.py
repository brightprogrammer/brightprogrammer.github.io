#!/usr/bin/env python3

import csv
import html
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "incidents"
CSV_OUT_DIR = ROOT / "research" / "incidents"
PUBLIC_OUT_DIR = ROOT / "static" / "data" / "incidents"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"
REQUEST_DELAY = 0.25
FETCH_TIMEOUT = 15
YEAR_START = 2000
YEAR_END = 2026
ARTICLE_TEXT_MAX = 5000

EXTENSION_TERMS = (
    "browser extension",
    "browser extensions",
    "chrome extension",
    "chrome extensions",
    "firefox extension",
    "firefox extensions",
    "edge extension",
    "edge extensions",
    "chromium extension",
    "chromium extensions",
    "browser add-on",
    "browser add-ons",
    "firefox add-on",
    "firefox add-ons",
    "firefox addon",
    "firefox addons",
)

GENERIC_EXTENSION_TERMS = (
    "extension",
    "extensions",
    "add-on",
    "add-ons",
    "addon",
    "addons",
)

BROWSER_CONTEXT_TERMS = (
    "browser",
    "chrome",
    "firefox",
    "edge",
    "chromium",
    "brave",
    "opera",
    "mozilla",
    "web store",
    "addons.mozilla.org",
)

INCIDENT_TERMS = (
    "malicious",
    "malware",
    "rogue",
    "stealer",
    "phishing",
    "fraud",
    "spy",
    "spyware",
    "adware",
    "hijack",
    "hijacked",
    "hijacking",
    "compromise",
    "compromised",
    "takeover",
    "taken over",
    "supply chain",
    "supply-chain",
    "abuse",
    "attacker",
    "attack",
    "infected",
    "vulnerability",
    "vulnerable",
    "flaw",
    "bug",
    "breach",
    "poaching",
    "data theft",
    "credential theft",
    "cookie theft",
)

SOURCE_CONFIG = {
    "feeds": [
        {
            "name": "The Hacker News",
            "kind": "blogger_label_feed",
            "label": "browser extension",
            "url": "https://thehackernews.com/feeds/posts/default/-/browser%20extension?alt=json&max-results=500",
        },
        {
            "name": "The Hacker News",
            "kind": "blogger_label_feed",
            "label": "chrome extension",
            "url": "https://thehackernews.com/feeds/posts/default/-/chrome%20extension?alt=json&max-results=500",
        },
        {
            "name": "The Hacker News",
            "kind": "blogger_label_feed",
            "label": "firefox extension",
            "url": "https://thehackernews.com/feeds/posts/default/-/firefox%20extension?alt=json&max-results=500",
        },
    ],
    "searches": [
        {
            "name": "Bing News RSS",
            "query": "browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "chrome extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "firefox extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "browser extension hijacked",
        },
        {
            "name": "Bing News RSS",
            "query": "browser extension supply chain",
        },
        {
            "name": "Bing News RSS",
            "query": "browser extension malicious update",
        },
        {
            "name": "Bing News RSS",
            "query": "browser extension compromised publisher",
        },
        {
            "name": "Bing News RSS",
            "query": "browser extension vulnerability",
        },
        {
            "name": "Bing News RSS",
            "query": "chrome extension vulnerability",
        },
        {
            "name": "Bing News RSS",
            "query": "firefox extension vulnerability",
        },
        {
            "name": "Bing News RSS",
            "query": "site:bleepingcomputer.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:securityweek.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:arstechnica.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:kaspersky.com/blog browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:trendmicro.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:malwarebytes.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:computerworld.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:techrepublic.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:engadget.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:helpnetsecurity.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:infosecurity-magazine.com browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:therecord.media browser extension malicious",
        },
        {
            "name": "Bing News RSS",
            "query": "site:krebsonsecurity.com browser extension",
        },
        {
            "name": "Bing News RSS",
            "query": "site:blog.mozilla.org/addons add-on malicious extension",
        },
        {
            "name": "Bing News RSS",
            "query": "site:vx-underground.org browser extension malware",
        },
    ],
    "sitemaps": [
        {
            "name": "Guardio Labs",
            "url": "https://guard.io/sitemap.xml",
        },
        {
            "name": "LayerX Security",
            "url": "https://layerxsecurity.com/sitemap-posts.xml",
        },
        {
            "name": "Koi Security",
            "url": "https://www.koi.security/sitemap.xml",
        },
        {
            "name": "Expel",
            "url": "https://expel.com/post-sitemap.xml",
        },
        {
            "name": "Annex Security",
            "url": "https://annex.security/sitemap.xml",
        },
    ],
}

SOURCE_NAME_MAP = {
    "annex.security": "Annex Security",
    "arstechnica.com": "Ars Technica",
    "appleinsider.com": "AppleInsider",
    "aol.com": "AOL",
    "bleepingcomputer.com": "BleepingComputer",
    "blog.mozilla.org": "Mozilla Add-ons Blog",
    "computerworld.com": "Computerworld",
    "crowdfundinsider.com": "Crowdfund Insider",
    "expel.com": "Expel",
    "foxnews.com": "Fox News",
    "geeky-gadgets.com": "Geeky Gadgets",
    "gitlab-com.gitlab.io": "GitLab Security",
    "govinfosecurity.com": "HHS",
    "guard.io": "Guardio Labs",
    "infosecurity-magazine.com": "Infosecurity Magazine",
    "kaspersky.com": "Kaspersky",
    "keepaware.com": "Keep Aware",
    "koi.ai": "Koi Research",
    "koi.security": "Koi Security",
    "layerxsecurity.com": "LayerX Security",
    "lifehacker.com": "Lifehacker",
    "malwarebytes.com": "Malwarebytes",
    "msn.com": "MSN",
    "obsidiansecurity.com": "Obsidian Security",
    "reuters.com": "Reuters",
    "scmagazine.com": "SC Media",
    "securityweek.com": "SecurityWeek",
    "support.trustwallet.com": "Trust Wallet",
    "thehackernews.com": "The Hacker News",
    "therecord.media": "The Record",
    "techcrunch.com": "TechCrunch",
    "techjuice.pk": "TechJuice",
    "techradar.com": "TechRadar",
    "techrepublic.com": "TechRepublic",
    "techtimes.com": "TechTimes",
    "trendmicro.com": "Trend Micro",
    "vx-underground.org": "vx-underground",
    "yahoo.com": "Yahoo",
    "zdnet.com": "ZDNet",
}

NON_INCIDENT_TERMS = (
    "acquires browser security firm",
    "acquires browser security company",
    "acquires squarex",
    "acquisition",
    "series a",
    "funding round",
    "beginner",
    "explained",
    "google offers chrome extension for end-to-end",
    "google releases chrome extension for end-to-end",
    "launches chrome extension",
    "how to",
    "m&a",
    "what you need to know",
    "what are browser extensions",
    "dangers of browser extensions",
    "putting you at risk",
    "pose serious threat",
    "private browsers",
    "raises browser-hijacking concerns",
    "tell users what data they collect",
    "mandatory for chrome apps",
    "security validation",
    "risk guide",
    "no one is talking about",
    "accidentally compromise your privacy",
    "prompt injection attacks explained",
)

LOW_PREFERENCE_DOMAINS = {
    "aol.com",
    "msn.com",
    "newsbreak.com",
    "yahoo.com",
}

MANUAL_SEEDS = [
    {
        "source_name": "Mozilla Add-ons Blog",
        "url": "https://blog.mozilla.org/addons/2010/07/13/add-on-security-announcement/",
        "note": "Older advisory on malicious add-on and security-vulnerable add-on",
    },
    {
        "source_name": "Mozilla Security Blog",
        "url": "https://blog.mozilla.org/security/2011/03/25/comodo-certificate-issue-follow-up/",
        "note": "Fraudulent certificate for addons.mozilla.org could have enabled malicious software downloads",
        "force_extension_related": True,
        "force_incident_like": True,
    },
    {
        "source_name": "Ars Technica",
        "url": "https://arstechnica.com/information-technology/2012/03/googles-chome-web-store-used-to-spread-malware/",
        "note": "Older Chrome Web Store malware coverage",
    },
    {
        "source_name": "Ars Technica",
        "url": "https://arstechnica.com/information-technology/2012/05/firefox-security-add-in-exposes-users-web-browsing-history/",
        "note": "Firefox ShowIP add-on privacy leak coverage",
        "force_incident_like": True,
    },
    {
        "source_name": "SecurityWeek",
        "url": "https://www.securityweek.com/malicious-chrome-extensions-targeting-facebook/",
        "note": "Older Chrome extension malware campaign coverage",
    },
    {
        "source_name": "Annex Security",
        "url": "https://annex.security/blog/pixel-perfect/",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Expel",
        "url": "https://expel.com/blog/on-the-radar-chatgpt-stealer/",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "LayerX Security",
        "url": "https://layerxsecurity.com/blog/browser-extensions-gone-rogue-the-full-scope-of-the-ghostposter-campaign/",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "BrowserGate",
        "url": "https://browsergate.eu/",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Trust Wallet",
        "url": "https://support.trustwallet.com/support/solutions/articles/67000750069-security-notice-trust-wallet-browser-extension-version-2-68-vulnerability",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Koi Research",
        "url": "https://www.koi.ai/blog/darkspectre-unmasking-the-threat-actor-behind-7-8-million-infected-browsers",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Koi Research",
        "url": "https://www.koi.ai/blog/4-million-browsers-infected-inside-shadypanda-7-year-malware-campaign",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Koi Research",
        "url": "https://www.koi.ai/blog/greedybear-650-attack-tools-one-coordinated-campaign",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Koi Security",
        "url": "https://www.koi.security/blog/google-and-microsoft-trusted-them-2-3-million-users-installed-them-they-were-malware",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Koi Research",
        "url": "https://www.koi.ai/blog/foxywallet-40-malicious-firefox-extensions-exposed",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "GitLab Security",
        "url": "https://gitlab-com.gitlab.io/gl-security/security-tech-notes/threat-intelligence-tech-notes/malicious-browser-extensions-feb-2025/",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Keep Aware",
        "url": "https://keepaware.com/blog/cyberhaven-browser-extension-compromise",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Guardio",
        "url": "https://guard.io/blog/fakegpt-protecting-your-data-from-malicious-extensions",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Guardio Labs",
        "url": "https://guard.io/labs/fakegpt-2-open-source-turned-malicious-in-another-variant-of-the-facebook-account-stealer",
        "note": "Seeded from existing post slideshow",
    },
    {
        "source_name": "Obsidian Security",
        "url": "https://www.obsidiansecurity.com/blog/small-tools-big-risk-when-browser-extensions-start-stealing-api-keys",
        "note": "AI-extension theft dataset anchor",
    },
    {
        "source_name": "Kaspersky",
        "url": "https://www.kaspersky.com/blog/browser-extensions-mining-data/49829/",
        "note": "Known browser-extension incident roundup",
    },
]

SUPPLY_CHAIN_STRONG_PATTERNS = (
    r"\bsupply chain\b",
    r"\bsupply-chain\b",
    r"\bextension compromise\b",
    r"\bextensions compromise\b",
    r"\blegitimate\b.{0,36}\bturn(?:ed|s)?\b.{0,28}\b(?:spyware|malicious)\b",
    r"\bmalicious update\b",
    r"\bownership change\b",
    r"\bonce-trusted\b",
    r"\bonce trusted\b",
    r"\bwhen good extensions go bad\b",
    r"\b(?:publishers?|developers?)\b.{0,28}\b(?:targeted|phished|phishing|compromised|hacked|hijacked)\b",
    r"\b(?:targeted|phished|phishing|compromised|hacked|hijacked)\b.{0,28}\b(?:publishers?|developers?)\b",
    r"\badmin accounts?\b.{0,40}\b(?:targeted|phished|phishing|compromised|hacked|hijacked)\b",
    r"\b(?:targeted|phished|phishing|compromised|hacked|hijacked)\b.{0,40}\badmin accounts?\b",
    r"\binjected malicious code into\b.{0,40}\b(?:extensions?|add-ons?|addons?)\b",
    r"\b(?:extensions?|add-ons?|addons?)\b.{0,40}\binjected with malicious code\b",
    r"\b(?:weaponized|backdoored)\b.{0,40}\b(?:extensions?|add-ons?|addons?)\b",
    r"\bupdated\b.{0,28}\b(?:to deploy malware|to distribute spam|with malicious code)\b",
)

SUPPLY_CHAIN_WEAK_PATTERNS = (
    r"\b(?:extensions?|add-ons?|addons?)\b.{0,24}\b(?:compromised|hacked|hijacked|taken over)\b",
    r"\b(?:compromised|hacked|hijacked|taken over)\b.{0,24}\b(?:extensions?|add-ons?|addons?)\b",
    r"\bhackers?\b.{0,24}\bhijack\b.{0,48}\b(?:extensions?|add-ons?|addons?)\b",
)

SUPPLY_CHAIN_NEGATIVE_PATTERNS = (
    r"\bgmail takeover\b",
    r"\baccount takeover\b",
    r"\bhijacking facebook accounts?\b",
    r"\bhijack(?:ing|ed)? sessions?\b",
    r"\bsession hijack(?:ing)?\b",
    r"\bpasskeys? can be hijacked\b",
    r"\bhijack(?:ing|ed)? whatsapp web\b",
    r"\bhijack(?:ing|ed)? accounts?\b",
    r"\bhijack(?:ing|ed)? (?:your|users'?|online) browsing\b",
    r"\bthrough malicious extensions\b",
    r"\bgemini live ai assistant\b",
)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as response:
        return response.read()


def fetch_text(url):
    return fetch(url).decode("utf-8", "ignore")


def norm_space(value):
    return re.sub(r"\s+", " ", value or "").strip()


def strip_tags(value):
    text = norm_space(re.sub(r"<[^>]+>", " ", html.unescape(value or "")))
    text = re.sub(r"\bAdvertisement\b", " ", text, flags=re.I)
    text = re.sub(r"\bShare this article:\b", " ", text, flags=re.I)
    return norm_space(text)


def summarize_excerpt(text, max_chars=520):
    text = norm_space(text)
    if len(text) <= max_chars:
        return text
    window = text[: max_chars + 120]
    for token in (". ", "! ", "? "):
        cut = window.rfind(token)
        if cut >= int(max_chars * 0.65):
            return window[: cut + 1].strip()
    trimmed = window[:max_chars].rsplit(" ", 1)[0].strip()
    return f"{trimmed}..." if trimmed else text[:max_chars]


def iter_jsonld_entries(payload):
    if isinstance(payload, dict):
        yield payload
        for value in payload.values():
            yield from iter_jsonld_entries(value)
    elif isinstance(payload, list):
        for item in payload:
            yield from iter_jsonld_entries(item)


def extract_article_text(html_text):
    candidates = []

    for match in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html_text,
        re.I | re.S,
    ):
        blob = match.group(1).strip()
        try:
            payload = json.loads(blob)
        except Exception:
            continue
        for entry in iter_jsonld_entries(payload):
            if not isinstance(entry, dict):
                continue
            body = entry.get("articleBody")
            if isinstance(body, str):
                text = strip_tags(body)
                if len(text) > 240:
                    candidates.append(text)

    article_match = re.search(r"<article\b[^>]*>(.*?)</article>", html_text, re.I | re.S)
    if article_match:
        text = strip_tags(article_match.group(1))
        if len(text) > 240:
            candidates.append(text)

    for pattern in (
        r'<div[^>]+class=["\'][^"\']*(?:article-content|entry-content|post-content|article-body|story-body|content-body|article__body)[^"\']*["\'][^>]*>(.*?)</div>',
        r'<main\b[^>]*>(.*?)</main>',
    ):
        match = re.search(pattern, html_text, re.I | re.S)
        if not match:
            continue
        text = strip_tags(match.group(1))
        if len(text) > 240:
            candidates.append(text)

    body_match = re.search(r"<body\b[^>]*>(.*?)</body>", html_text, re.I | re.S)
    body = body_match.group(1) if body_match else html_text
    body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
    body = re.sub(
        r"<(script|style|noscript|svg|iframe|form|nav|footer|aside)\b[^>]*>.*?</\1>",
        " ",
        body,
        flags=re.I | re.S,
    )
    text = strip_tags(body)
    if len(text) > 240:
        candidates.append(text)

    if not candidates:
        return None

    for candidate in candidates:
        lowered = candidate.lower()
        if lowered.startswith("advertisement"):
            continue
        if any(term in lowered for term in EXTENSION_TERMS) or (
            any(term in lowered for term in GENERIC_EXTENSION_TERMS)
            and any(term in lowered for term in BROWSER_CONTEXT_TERMS)
        ):
            return candidate[:ARTICLE_TEXT_MAX]

    return candidates[0][:ARTICLE_TEXT_MAX]


def slug_to_title(url):
    slug = urllib.parse.urlparse(url).path.rstrip("/").split("/")[-1]
    slug = slug.replace("-", " ").replace("_", " ")
    return norm_space(slug.title())


def has_generic_title(title, source_name, url):
    cleaned = norm_space(title).lower()
    if not cleaned:
        return True
    domain = urllib.parse.urlparse(url).netloc.lower().removeprefix("www.")
    source_tokens = {
        norm_space(source_name or "").lower(),
        domain,
        domain.split(".")[0] if domain else "",
    }
    return cleaned in source_tokens or len(cleaned) <= 3


def has_junk_aggregator_title(title):
    cleaned = norm_space(title)
    return bool(re.fullmatch(r"Ar\s+A[a-zA-Z0-9]{5,}", cleaned))


def parse_date(value):
    if not value:
        return None
    raw = value.strip()
    fmts = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d",
    ]
    normalized = raw.replace("Z", "+0000") if raw.endswith("Z") else raw
    normalized = re.sub(r"([+-]\d\d):(\d\d)$", r"\1\2", normalized)
    for fmt in fmts:
        try:
            dt = datetime.strptime(normalized, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            pass
    return None


def parse_date_string(value):
    dt = parse_date(value)
    return dt.date().isoformat() if dt else None


def detect_browser(text):
    lowered = text.lower()
    browsers = []
    for token in ("chrome", "firefox", "edge", "chromium", "brave", "opera"):
        if token in lowered:
            browsers.append(token)
    return sorted(set(browsers))


def source_name_for_url(url):
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower().removeprefix("www.")
    if domain == "blog.mozilla.org" and parsed.path.lower().startswith("/security/"):
        return "Mozilla Security Blog"
    return SOURCE_NAME_MAP.get(domain, domain)


def has_supply_chain_signal(title, description, extra_text=""):
    title_text = (title or "").lower()
    full_text = " ".join([title or "", description or "", (extra_text or "")[:1800]]).lower()
    if not full_text:
        return False
    if any(re.search(pattern, full_text) for pattern in SUPPLY_CHAIN_NEGATIVE_PATTERNS):
        return False
    if any(re.search(pattern, full_text) for pattern in SUPPLY_CHAIN_STRONG_PATTERNS):
        return True
    return any(re.search(pattern, title_text) for pattern in SUPPLY_CHAIN_WEAK_PATTERNS)


def classify_incident(title, description, url, extra_text=""):
    summary_text = " ".join([title or "", description or "", url or ""]).lower()
    ai_text = " ".join([title or "", description or ""]).lower()
    tags = []
    if has_supply_chain_signal(title, description, extra_text):
        tags.append("supply-chain")
    if any(
        re.search(pattern, summary_text)
        for pattern in (
            r"\bcve-\d{4}-\d+\b",
            r"\bvulnerab(?:ility|ilities|le)\b",
            r"\bflaws?\b",
            r"\bbugs?\b",
            r"\bzero-day\b",
            r"\bsecurity notice\b",
            r"\bprivilege escalation\b",
            r"\bremote code execution\b",
            r"\brce\b",
            r"\bsandbox escape\b",
            r"\bpermission bypass\b",
        )
    ):
        tags.append("vulnerability")
    if any(
        term in summary_text
        for term in (
            "malicious",
            "malware",
            "rogue",
            "stealer",
            "phishing",
            "fraud",
            "spam",
            "spamware",
            "spy",
            "spying",
            "hijack",
            "hijacked",
            "hijacking",
            "spyware",
            "adware",
            "infected",
            "data theft",
            "credential theft",
            "cookie theft",
            "backdoor",
            "backdoored",
            "tampering with security headers",
        )
    ):
        tags.append("malicious-extension")
    if any(term in ai_text for term in (" ai ", "chatgpt", "gpt", "genai", "llm", "openai", "prompt")):
        tags.append("ai-related")
    if not tags:
        tags.append("other")
    return sorted(set(tags))


def is_extension_related(title, description, url, extra_text=""):
    text = " ".join([title or "", description or "", url or ""]).lower()
    if any(term in text for term in EXTENSION_TERMS):
        return True
    return any(term in text for term in GENERIC_EXTENSION_TERMS) and any(
        term in text for term in BROWSER_CONTEXT_TERMS
    )


def url_has_extension_hint(url):
    path = urllib.parse.urlparse(url).path.lower()
    slug_terms = (
        "browser-extension",
        "browser-extensions",
        "chrome-extension",
        "chrome-extensions",
        "firefox-extension",
        "firefox-extensions",
        "firefox-addon",
        "firefox-addons",
        "browser-addon",
        "browser-addons",
        "browsergate",
        "fakegpt",
        "foxywallet",
        "ghostposter",
        "cyberhaven",
        "prompt-poaching",
        "chatgpt-stealer",
    )
    return any(term in path for term in slug_terms)


def url_has_incident_hint(url):
    path = urllib.parse.urlparse(url).path.lower()
    hint_terms = (
        "malicious",
        "malware",
        "rogue",
        "stealer",
        "phishing",
        "spy",
        "adware",
        "compromise",
        "compromised",
        "hijack",
        "hijacked",
        "attack",
        "abuse",
        "supply-chain",
        "supply",
        "infected",
        "vulnerability",
        "fakegpt",
        "chatgpt",
        "ghostposter",
        "foxywallet",
        "cyberhaven",
        "pixel-perfect",
        "browsergate",
        "darkspectre",
        "shadypanda",
        "greedybear",
        "reddirection",
        "poaching",
    )
    return any(term in path for term in hint_terms)


def is_index_like_url(url):
    path = urllib.parse.urlparse(url).path.lower()
    return any(
        segment in path
        for segment in (
            "/tag/",
            "/tags/",
            "/category/",
            "/categories/",
            "/search/",
            "/feed/",
            "/page/",
        )
    )


def looks_generic_or_policy(title, description, url):
    text = " ".join([title or "", description or "", url or ""]).lower()
    if is_index_like_url(url):
        return True
    return any(term in text for term in NON_INCIDENT_TERMS)


def is_incident_like(title, description, url, extra_text=""):
    text = " ".join([title or "", description or "", url or ""]).lower()
    return (
        is_extension_related(title, description, url, extra_text)
        and not looks_generic_or_policy(title, description, url)
        and any(term in text for term in INCIDENT_TERMS)
    )


def extract_meta(html_text, url):
    title = None
    description = None
    published = None
    article_text = None

    patterns = [
        (r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', "title"),
        (r'<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\']([^"\']+)["\']', "title"),
        (r"<title>(.*?)</title>", "title"),
        (r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', "description"),
        (r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']', "description"),
        (r'<meta[^>]+property=["\']article:published_time["\'][^>]+content=["\']([^"\']+)["\']', "published"),
        (r'<meta[^>]+name=["\']article:published_time["\'][^>]+content=["\']([^"\']+)["\']', "published"),
        (r'<meta[^>]+name=["\']publish-date["\'][^>]+content=["\']([^"\']+)["\']', "published"),
        (r'<meta[^>]+name=["\']parsely-pub-date["\'][^>]+content=["\']([^"\']+)["\']', "published"),
        (r'<time[^>]+datetime=["\']([^"\']+)["\']', "published"),
    ]

    for pattern, target in patterns:
        match = re.search(pattern, html_text, re.I | re.S)
        if not match:
            continue
        value = html.unescape(norm_space(re.sub(r"<.*?>", "", match.group(1))))
        if target == "title" and not title:
            title = value
        elif target == "description" and not description:
            description = value
        elif target == "published" and not published:
            published = parse_date_string(value)

    for match in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html_text,
        re.I | re.S,
    ):
        blob = match.group(1).strip()
        try:
            payload = json.loads(blob)
        except Exception:
            continue
        for entry in iter_jsonld_entries(payload):
            if not isinstance(entry, dict):
                continue
            if not published:
                value = entry.get("datePublished") or entry.get("dateCreated")
                published = parse_date_string(value)
            if not title:
                headline = entry.get("headline") or entry.get("name")
                if isinstance(headline, str):
                    title = norm_space(headline)
            if not description:
                body_description = entry.get("description")
                if isinstance(body_description, str):
                    description = norm_space(body_description)
            if not article_text:
                body = entry.get("articleBody")
                if isinstance(body, str):
                    cleaned = strip_tags(body)
                    if len(cleaned) > 240:
                        article_text = cleaned[:ARTICLE_TEXT_MAX]
            if published and title and description and article_text:
                break
        if published and title and description and article_text:
            break

    if not article_text:
        article_text = extract_article_text(html_text)

    if title:
        title = re.sub(r"\s*[-|]\s*(The Hacker News|Guardio|LayerX Security|Koi Security|Expel|Annex Security).*?$", "", title).strip()
    else:
        title = slug_to_title(url)

    if article_text and (not description or len(description) < 180):
        description = summarize_excerpt(article_text)

    return {
        "title": title,
        "description": description,
        "published": published,
        "article_text": article_text,
    }


def parse_blogger_feed(entry):
    links = entry.get("link", [])
    permalink = None
    for link in links:
        if link.get("rel") == "alternate":
            permalink = link.get("href")
            break
    title = entry.get("title", {}).get("$t")
    published = parse_date_string(entry.get("published", {}).get("$t"))
    summary = entry.get("summary", {}).get("$t")
    return {
        "url": permalink,
        "title": norm_space(html.unescape(title or "")),
        "description": norm_space(re.sub(r"<.*?>", " ", html.unescape(summary or ""))),
        "published": published,
    }


def sitemap_entries(source_name, url, visited=None):
    visited = visited or set()
    if url in visited:
        return []
    visited.add(url)
    xml_text = fetch_text(url)
    root = ET.fromstring(xml_text)
    tag = root.tag.rsplit("}", 1)[-1]
    items = []

    if tag == "sitemapindex":
        for node in root.findall(".//{*}sitemap/{*}loc"):
            child_url = norm_space(node.text)
            if not child_url:
                continue
            if "post-sitemap" in child_url or "posts" in child_url or "blog" in child_url:
                items.extend(sitemap_entries(source_name, child_url, visited))
                time.sleep(REQUEST_DELAY)
        return items

    for node in root.findall(".//{*}url"):
        loc = norm_space(node.findtext("{*}loc"))
        lastmod = parse_date_string(node.findtext("{*}lastmod"))
        if not loc:
            continue
        if not url_has_extension_hint(loc):
            continue
        if not url_has_incident_hint(loc):
            continue
        path_parts = [part for part in urllib.parse.urlparse(loc).path.split("/") if part]
        if source_name == "LayerX Security" and (not path_parts or path_parts[0] != "blog"):
            continue
        items.append(
            {
                "url": loc,
                "title": None,
                "description": None,
                "published": lastmod,
                "source_name": source_name,
                "source_type": "sitemap",
                "collector": url,
            }
        )
    return items


def thn_entries():
    items = []
    for feed in SOURCE_CONFIG["feeds"]:
        payload = json.loads(fetch_text(feed["url"]))
        entries = payload.get("feed", {}).get("entry", [])
        for entry in entries:
            item = parse_blogger_feed(entry)
            if not item["url"]:
                continue
            item.update(
                {
                    "source_name": feed["name"],
                    "source_type": "feed",
                    "collector": feed["url"],
                    "label": feed["label"],
                }
            )
            items.append(item)
    return items


def bing_news_target(link):
    parsed = urllib.parse.urlparse(link or "")
    if "bing.com" not in parsed.netloc:
        return link
    target = urllib.parse.parse_qs(parsed.query).get("url", [None])[0]
    return urllib.parse.unquote(target) if target else link


def bing_news_entries():
    items = []
    for search in SOURCE_CONFIG["searches"]:
        search_url = "https://www.bing.com/news/search?" + urllib.parse.urlencode(
            {"q": search["query"], "format": "rss"}
        )
        root = ET.fromstring(fetch_text(search_url))
        for node in root.findall(".//item"):
            link = norm_space(node.findtext("link"))
            url = bing_news_target(link)
            if not url.startswith("http"):
                continue
            source_name = None
            for child in node:
                if child.tag.rsplit("}", 1)[-1] == "Source":
                    source_name = norm_space(child.text)
                    break
            items.append(
                {
                    "url": url,
                    "title": norm_space(node.findtext("title") or slug_to_title(url)) or None,
                    "description": norm_space(
                        re.sub(r"<.*?>", " ", html.unescape(node.findtext("description") or ""))
                    )
                    or None,
                    "published": parse_date_string(node.findtext("pubDate")),
                    "source_name": source_name or source_name_for_url(url),
                    "source_type": "bing-news-rss",
                    "collector": search_url,
                    "query": search["query"],
                }
            )
        time.sleep(REQUEST_DELAY)
    return items


def enrich_item(item):
    try:
        meta = extract_meta(fetch_text(item["url"]), item["url"])
        if meta.get("title") and (not item.get("title") or item.get("source_type") == "bing-news-rss"):
            item["title"] = meta["title"]
        if meta.get("description") and (
            not item.get("description")
            or len(item.get("description") or "") < 80
        ):
            item["description"] = meta["description"]
        if meta.get("published") and not item.get("published"):
            item["published"] = meta["published"]
        if meta.get("article_text"):
            item["article_text"] = meta["article_text"]
        if has_generic_title(item.get("title"), item.get("source_name"), item["url"]):
            item["title"] = slug_to_title(item["url"])
    except Exception:
        item.setdefault("title", slug_to_title(item["url"]))
        item.setdefault("description", None)
        item.setdefault("published", None)
    return item


def normalize_item(item, seed=False):
    title = norm_space(item.get("title") or slug_to_title(item["url"]))
    description = norm_space(item.get("description") or "")
    article_text = norm_space(item.get("article_text") or "")
    published = parse_date_string(item.get("published") or "")
    domain = urllib.parse.urlparse(item["url"]).netloc.lower().removeprefix("www.")
    incident_types = classify_incident(title, description, item["url"], article_text)
    year = int(published[:4]) if published else None
    extension_related = (
        item.get("force_extension_related")
        if item.get("force_extension_related") is not None
        else is_extension_related(title, description, item["url"], article_text)
    )
    incident_like = (
        item.get("force_incident_like")
        if item.get("force_incident_like") is not None
        else is_incident_like(title, description, item["url"], article_text)
    )

    return {
        "id": re.sub(r"[^a-z0-9]+", "-", urllib.parse.urlparse(item["url"]).path.lower()).strip("-") or domain,
        "title": title,
        "date": published,
        "year": year,
        "url": item["url"],
        "domain": domain,
        "source_name": item.get("source_name") or domain,
        "source_type": item.get("source_type") or ("manual-seed" if seed else "unknown"),
        "collector": item.get("collector"),
        "description": description or None,
        "browser_family": detect_browser(" ".join([title, description, article_text, item["url"]])),
        "incident_types": incident_types,
        "seeded": seed,
        "extension_related": extension_related,
        "incident_like": incident_like,
        "note": item.get("note"),
    }


def title_key(item):
    title = (item.get("title") or "").lower()
    title = re.sub(r"\s+", " ", title).strip()
    if title:
        return re.sub(r"[^a-z0-9]+", "", title)
    fallback = urllib.parse.urlparse(item.get("url") or "").path.lower()
    return re.sub(r"[^a-z0-9]+", "", fallback)


def item_preference(item):
    score = 0
    if item.get("source_type") == "manual-seed":
        score += 40
    elif item.get("source_type") in {"feed", "sitemap"}:
        score += 20
    elif item.get("source_type") == "bing-news-rss":
        score += 10
    domain = urllib.parse.urlparse(item["url"]).netloc.lower().removeprefix("www.")
    if domain not in LOW_PREFERENCE_DOMAINS:
        score += 15
    if item.get("published"):
        score += 5
    if not is_index_like_url(item["url"]):
        score += 5
    score += min(len(item.get("description") or "") // 80, 5)
    return score


def merge_items(existing, incoming):
    for key in (
        "title",
        "description",
        "published",
        "source_name",
        "note",
        "article_text",
        "force_extension_related",
        "force_incident_like",
    ):
        if not existing.get(key) and incoming.get(key):
            existing[key] = incoming[key]
    return existing


def dedupe_items(items):
    by_url = {}
    for item in items:
        url = item["url"]
        existing = by_url.get(url)
        if not existing:
            by_url[url] = item
            continue
        merge_items(existing, item)

    by_title = {}
    for item in by_url.values():
        key = title_key(item)
        year = parse_date_string(item.get("published") or "") or "unknown"
        bucket = f"{key}:{year[:4] if isinstance(year, str) else year}"
        existing = by_title.get(bucket)
        if not existing:
            by_title[bucket] = item
            continue
        if item_preference(item) > item_preference(existing):
            by_title[bucket] = merge_items(item, existing)
        else:
            merge_items(existing, item)
    return list(by_title.values())


def by_year(entries):
    years = {year: [] for year in range(YEAR_START, YEAR_END + 1)}
    for entry in entries:
        if entry.get("year") in years:
            years[entry["year"]].append(entry)
    return [
        {
            "year": year,
            "count": len(years[year]),
            "entries": years[year],
        }
        for year in range(YEAR_START, YEAR_END + 1)
    ]


def write_csv(path, entries):
    fieldnames = [
        "id",
        "title",
        "date",
        "year",
        "url",
        "domain",
        "source_name",
        "source_type",
        "collector",
        "browser_family",
        "incident_types",
        "seeded",
        "extension_related",
        "incident_like",
        "note",
        "description",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for entry in entries:
            row = dict(entry)
            row["browser_family"] = "|".join(entry.get("browser_family") or [])
            row["incident_types"] = "|".join(entry.get("incident_types") or [])
            writer.writerow({name: row.get(name) for name in fieldnames})


def collect():
    raw = []
    raw.extend(thn_entries())
    time.sleep(REQUEST_DELAY)
    raw.extend(bing_news_entries())
    time.sleep(REQUEST_DELAY)

    for sitemap in SOURCE_CONFIG["sitemaps"]:
        raw.extend(sitemap_entries(sitemap["name"], sitemap["url"]))
        time.sleep(REQUEST_DELAY)

    for seed in MANUAL_SEEDS:
        raw.append(
            {
                "url": seed["url"],
                "title": None,
                "description": None,
                "published": None,
                "source_name": seed["source_name"],
                "source_type": "manual-seed",
                "collector": "manual",
                "note": seed["note"],
                "force_extension_related": seed.get("force_extension_related"),
                "force_incident_like": seed.get("force_incident_like"),
            }
        )

    deduped = dedupe_items(raw)
    filtered = []
    for item in deduped:
        if item.get("source_type") == "manual-seed":
            filtered.append(item)
            continue
        if is_extension_related(item.get("title"), item.get("description"), item["url"]):
            filtered.append(item)
            continue
        slug_text = urllib.parse.urlparse(item["url"]).path.lower()
        if any(term.replace(" ", "-") in slug_text for term in ("browser-extension", "chrome-extension", "firefox-extension", "browser-extensions", "chrome-extensions", "firefox-extensions")):
            filtered.append(item)

    enriched = []
    for item in filtered:
        enriched.append(enrich_item(item))
        time.sleep(REQUEST_DELAY)

    normalized = [normalize_item(item, seed=item.get("source_type") == "manual-seed") for item in dedupe_items(enriched)]
    normalized = [item for item in normalized if item["extension_related"] and not is_index_like_url(item["url"])]
    normalized = [
        item
        for item in normalized
        if not (item["domain"] in LOW_PREFERENCE_DOMAINS and has_junk_aggregator_title(item["title"]))
    ]
    normalized.sort(key=lambda item: (item["date"] or "9999-99-99", item["source_name"], item["title"]))

    incidents = [item for item in normalized if item["incident_like"]]
    incidents.sort(key=lambda item: (item["date"] or "9999-99-99", item["source_name"], item["title"]))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CSV_OUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUT_DIR.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    candidates_payload = {
        "metadata": {
            "generated_at": generated_at,
            "range": {"start_year": YEAR_START, "end_year": YEAR_END},
            "coverage": "Candidate corpus from accessible news/security feeds, sitemaps, and seeded reports; not exhaustive.",
            "sources": {
                "feeds": SOURCE_CONFIG["feeds"],
                "searches": SOURCE_CONFIG["searches"],
                "sitemaps": SOURCE_CONFIG["sitemaps"],
                "manual_seeds": MANUAL_SEEDS,
            },
            "counts": {
                "candidates": len(normalized),
                "incident_like": len(incidents),
                "sources": len({item['domain'] for item in normalized}),
            },
        },
        "entries": normalized,
        "by_year": by_year(normalized),
    }

    incident_payload = {
        "metadata": {
            "generated_at": generated_at,
            "range": {"start_year": YEAR_START, "end_year": YEAR_END},
            "coverage": "Incident-focused subset selected by extension+incident keyword heuristics plus seeded reports.",
            "counts": {
                "incidents": len(incidents),
                "sources": len({item['domain'] for item in incidents}),
                "incident_types": Counter(tag for item in incidents for tag in item["incident_types"]),
            },
        },
        "entries": incidents,
        "by_year": by_year(incidents),
    }

    (OUT_DIR / "browser_extension_incident_candidates.json").write_text(
        json.dumps(candidates_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (PUBLIC_OUT_DIR / "browser_extension_incident_candidates.json").write_text(
        json.dumps(candidates_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    write_csv(CSV_OUT_DIR / "browser_extension_incident_candidates.csv", normalized)
    (OUT_DIR / "browser_extension_incidents_raw.json").write_text(
        json.dumps(incident_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (PUBLIC_OUT_DIR / "browser_extension_incidents_raw.json").write_text(
        json.dumps(incident_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    write_csv(CSV_OUT_DIR / "browser_extension_incidents_raw.csv", incidents)

    print(json.dumps(
        {
            "candidates": len(normalized),
            "incidents": len(incidents),
            "candidate_domains": len({item['domain'] for item in normalized}),
            "incident_domains": len({item['domain'] for item in incidents}),
        },
        indent=2,
    ))


if __name__ == "__main__":
    collect()
