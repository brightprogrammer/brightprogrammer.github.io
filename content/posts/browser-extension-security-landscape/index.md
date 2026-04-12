---
title: "A Look Into Browser Extension Security"
date: "2026-04-11"
description: "Notes from a presentation in a reading group"
draft: true
tags:
  - security
  - browser
  - extensions
  - privacy
  - supply-chain
---

## Introduction

I'm in a paper reading group for class. We present in small teams, and each round focuses on a different security domain with an older paper paired to a newer one that builds on it. This was our second presentation.

This time, we picked browser extensions. We were supposed to find a neat seminal-to-follow-on pairing, but we went with these two because extension security keeps showing up in the news and it had never come up in our group before:

- [Protecting Browsers from Extension Vulnerabilities](https://www.ndss-symposium.org/ndss2010/protecting-browsers-extension-vulnerabilities/)
- [Extending a Hand to Attackers: Browser Privilege Escalation Attacks via Extensions](https://www.usenix.org/conference/usenixsecurity23/presentation/kim-young-min)

The older one helped us set the baseline model, and the newer one shows how privilege escalation still slips through the cracks. I also wanted to include [The Dangers of Human Touch: Fingerprinting Browser Extensions through User Actions](https://www.usenix.org/conference/usenixsecurity22/presentation/solomos), but we were time-bound and it doesn't line up tightly with the first paper we planned to present.

For context, our first presentation was on onion-routing security. I started with [Anonymous Connections and Onion Routing](https://ieeexplore.ieee.org/document/668972/) as a personal warm-up, then we treated [Tor: The Second-Generation Onion Router](https://www.usenix.org/conference/13th-usenix-security-symposium/tor-second-generation-onion-router) as the seminal anchor and [RAPTOR: Routing Attacks on Privacy in Tor](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/sun) as the newer follow-up.

## Browser Extensions in Recent News

{{< slideshow >}}
  {{< slide src="/images/browser-extension-news/pixelperfect-annex.png" alt="Annex report on PixelPerfect extension abuse" link="https://annex.security/blog/pixel-perfect/" >}}
  {{< slide src="/images/browser-extension-news/prompt-poaching-expel.png" alt="Expel report on ChatGPT stealer prompt poaching" link="https://expel.com/blog/on-the-radar-chatgpt-stealer/" >}}
  {{< slide src="/images/browser-extension-news/ghostposter-layerx.png" alt="LayerX report on the GhostPoster campaign" link="https://layerxsecurity.com/blog/browser-extensions-gone-rogue-the-full-scope-of-the-ghostposter-campaign/" >}}
  {{< slide src="/images/browser-extension-news/browsergate.png" alt="BrowserGate report page" link="https://browsergate.eu/" >}}
  {{< slide src="/images/browser-extension-news/trustwallet-security-notice.png" alt="Trust Wallet security notice for browser extension version 2.68" link="https://support.trustwallet.com/support/solutions/articles/67000750069-security-notice-trust-wallet-browser-extension-version-2-68-vulnerability" >}}
  {{< slide src="/images/browser-extension-news/darkspectre-koi.png" alt="Koi Research report on the DarkSpectre campaign" link="https://www.koi.ai/blog/darkspectre-unmasking-the-threat-actor-behind-7-8-million-infected-browsers" >}}
  {{< slide src="/images/browser-extension-news/shadypanda-koi.png" alt="Koi Research report on the ShadyPanda campaign" link="https://www.koi.ai/blog/4-million-browsers-infected-inside-shadypanda-7-year-malware-campaign" >}}
  {{< slide src="/images/browser-extension-news/greedybear-koi.png" alt="Koi Research report on the GreedyBear campaign" link="https://www.koi.ai/blog/greedybear-650-attack-tools-one-coordinated-campaign" >}}
  {{< slide src="/images/browser-extension-news/reddirection-koi-security.png" alt="Koi Security report on the RedDirection campaign" link="https://www.koi.security/blog/google-and-microsoft-trusted-them-2-3-million-users-installed-them-they-were-malware" >}}
  {{< slide src="/images/browser-extension-news/foxywallet-koi.png" alt="Koi Research report on the FoxyWallet malicious extensions" link="https://www.koi.ai/blog/foxywallet-40-malicious-firefox-extensions-exposed" >}}
  {{< slide src="/images/browser-extension-news/gitlab-malicious-extensions.png" alt="GitLab tech note on malicious browser extensions" link="https://gitlab-com.gitlab.io/gl-security/security-tech-notes/threat-intelligence-tech-notes/malicious-browser-extensions-feb-2025/" >}}
  {{< slide src="/images/browser-extension-news/cyberhaven-keepaware.png" alt="Keep Aware report on the Cyberhaven browser extension compromise" link="https://keepaware.com/blog/cyberhaven-browser-extension-compromise" >}}
  {{< slide src="/images/browser-extension-news/guardio-fakegpt.png" alt="Guardio report on FakeGPT malicious extensions" link="https://guard.io/blog/fakegpt-protecting-your-data-from-malicious-extensions" >}}
  {{< slide src="/images/browser-extension-news/guardio-fakegpt-2.png" alt="Guardio Labs report on FakeGPT #2 open-source turned malicious" link="https://guard.io/labs/fakegpt-2-open-source-turned-malicious-in-another-variant-of-the-facebook-account-stealer" >}}
{{< /slideshow >}}

## Trends in Academia in Recent Times

{{< paper-stats
  data="browser_extension_security"
  title="Top venues only (USENIX Security, NDSS, IEEE S&amp;P, ACM CCS)"
  note="Source: Crossref. Query: titles containing both &quot;browser&quot; and &quot;extension(s)&quot; (any order), years 2000-2026, venues filtered by container title to USENIX Security, NDSS, IEEE S&amp;P, and ACM CCS. Citation counts shift over time; the paper counts are the more stable signal. Lower recent citation totals are expected because newer papers have had less time to be cited."
>}}

{{< paper-stats
  data="browser_extension_security_all"
  title="All venues (same query, no venue filter)"
  note="Same query as above, without the venue filter, to show the broader literature."
>}}
