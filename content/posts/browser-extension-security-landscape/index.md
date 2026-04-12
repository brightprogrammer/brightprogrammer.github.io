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
  note="Sources: DBLP API + arXiv. Query: titles containing both &quot;browser(s)&quot; and &quot;extension(s)&quot; (any order), years 2000-2026, venues filtered to USENIX Security, NDSS, IEEE S&amp;P, and ACM CCS. Citation counts come from OpenCitations (DOI-only), so arXiv and DOI-less entries show 0; paper counts are the more stable signal. Lower recent citation totals are expected because newer papers have had less time to be cited."
>}}

{{< paper-stats
  data="browser_extension_security_all"
  title="All venues (same query, no venue filter)"
  note="Same query as above, without the venue filter, to show the broader literature (including arXiv preprints)."
>}}

{{< paper-radar
  data="paper_categories"
  title="Paper themes"
  note="Manually curated buckets; overlap is minimized by assigning each paper to a single category."
>}}

## [Protecting Browsers from Extension Vulnerabilities](https://www.ndss-symposium.org/ndss2010/protecting-browsers-extension-vulnerabilities/)

Back in 2010, browser extension security wasn't treated as its own serious research topic. Firefox extensions ran with the browser's full privileges, and security failures mostly looked like "bad extensions" rather than an architectural problem. This paper flips that framing: the Berkeley + Google authors study real Firefox extensions, show that most of them are over-privileged, and use that evidence to motivate a new extension architecture that later shaped Chrome.

The proposal is simple in spirit but strong in effect: least privilege by default, privilege separation by construction, and hard isolation between components. Extensions are split into content scripts (exposed to web pages), a core (where most privileges live), and an optional native binary (powerful but kept far from web input). The idea is to make an exploit chain harder, not just make any one bug less likely.

### What they measured (and what fell out)

Their first move was empirical. They manually inspected 25 popular Firefox extensions to understand the behaviors those extensions actually needed, then compared those needs to the power of the interfaces they used. The gap is the story:

- Only 3 out of 25 required "critical" privileges, yet all 25 effectively had them.
- 19 used critical-rated interfaces despite not needing critical privileges.
- 76% of the extensions used interfaces that were more powerful than their behavior required.

The plots below recreate the paper's Figure 2 and Figure 3 with Chart.js. The left donut chart is the most powerful behavior each extension truly needs; the right donut is the most powerful interface they used to implement that behavior. The horizontal bars show how often specific behaviors appeared and whether each one had a privilege gap (highlighted).

{{< paper-base-charts >}}

### Threat model (who the attacker is)

The paper assumes "benign-but-buggy" extensions: developers are well-meaning, but not necessarily security experts. The attacker doesn't trick users into installing native executables. Instead, they exploit vulnerabilities in extension code and inherit the extension's privileges. The model includes two attacker types:

- A web attacker controlling a site the user visits.
- An active network attacker who can tamper with HTTP traffic.

The browser itself is treated as non-vulnerable so the focus stays on extension risk.

### Vulnerability classes they highlight

They focus on how web content can reach powerful extension privileges:

- Extension XSS (e.g., unsafe `eval` or `document.write`) and how optional sandboxing isn't a full fix.
- Mixed-content injection (loading scripts over HTTP or injecting HTTP into HTTPS pages).
- Replacing native DOM APIs with attacker-controlled lookalikes (the XPCNativeWrapper story).
- JavaScript capability leaks (exposing privileged objects to web pages).

Each class is less about a specific bug and more about how tightly Firefox bound untrusted content to powerful extension APIs.

### How they manually analyzed Firefox extensions and APIs

The survey was hands-on. They picked two extensions from each of 13 "recommended" Firefox categories (25 total), ran them, and used the UI to understand what each extension actually needed to do. They then searched for API interfaces in the source code and manually matched behavior to interfaces. That let them assign a security severity level to behaviors and interfaces using Mozilla's five-level scale: critical, high, medium, low, none.

This manual mapping is why the "gap" is convincing: it's not just static analysis of code; it's behavioral intent vs. the actual capabilities the code grabbed.

### The deductive system for escalation points

Beyond the survey, the paper tries to answer a deeper question: if an extension requests a low-privilege interface, can it still reach a high-privilege one through the API surface? To answer that, they model the Firefox extension API (XPCOM) as a security lattice and compute reachability through interfaces.

Key parts of their setup:

- Interfaces are defined in an IDL (think CORBA-style types). The browser enforces the declared parameter and return types.
- They manually labeled 613 interfaces (out of 1582 total) with security severity.
- They built a Datalog-backed analyzer that deduces what interfaces become reachable when you have access to a given interface.

The inference rules are the interesting bit. The notation is: $\rho \leadsto_{\eta} \alpha$ means principal $\rho$ has a reference to interface $\alpha$ implemented by principal $\eta$. Here’s the rule set side by side with the intuition:

| Rule | Intuition | KaTeX rule |
| --- | --- | --- |
| Subtyping | If an interface is a subtype of another, reachability carries over. | $\frac{\rho \leadsto_{\eta} \alpha \quad \alpha \le \beta}{\rho \leadsto_{\eta} \beta}$ |
| Method | If you can call a method that returns $\beta$, you can reach $\beta$. | $\frac{\rho \leadsto_{\eta} \alpha \quad \alpha.\text{method}(\beta)}{\rho \leadsto_{\eta} \beta}$ |
| Getter | Getters are methods that return a value. | $\frac{\rho \leadsto_{\eta} \alpha \quad \alpha.\text{method}(1 \to \beta)}{\rho \leadsto_{\eta} \beta}$ |
| Setter | Setters are methods that take a value. | $\frac{\rho \leadsto_{\eta} \alpha \quad \alpha.\text{method}(\beta \to 1)}{\rho \leadsto_{\eta} \beta}$ |
| Type forgery | Any principal can synthesize an object that *claims* to implement an interface. | $\frac{}{ \rho \leadsto_{\rho} \alpha }$ |
| Return | If $\rho$ can call a method $\alpha \to \beta$ implemented by $\eta$, and can supply an $\alpha$, then the return gives $\rho$ a $\beta$ (implemented by $\delta$). | $\frac{\rho \leadsto_{\eta} \alpha \to \beta \quad \rho \leadsto_{\gamma} \alpha \quad \eta \leadsto_{\delta} \beta}{\rho \leadsto_{\delta} \beta}$ |
| Parameter | The callee can also gain access to the argument it is handed. | $\frac{\rho \leadsto_{\eta} \alpha \to \beta \quad \rho \leadsto_{\gamma} \alpha \quad \eta \leadsto_{\delta} \beta}{\eta \leadsto_{\gamma} \alpha}$ |

Because they don't analyze concrete implementations, this is an over-approximation. That's a feature here: the goal is to surface potential escalation paths and identify "escalation points" where a narrow interface still leaks broader power. Those points are exactly what their new Chrome-like extension design tries to eliminate.

Two extra details from the text matter for how these rules behave in practice. First, the interfaces live in XPCOM and are specified in an IDL, so the browser enforces the declared parameter and return types regardless of who implements the interface. The authors attach a Datalog backend to the IDL compiler, manually label 613 of 1582 interfaces by severity, and then compute reachability using the rules above. Second, the analysis is deliberately an over-approximation because it ignores concrete implementations, so the parameter-flow rule might fire even if a real implementation never calls a particular method on its input. The payoff is that it surfaces potential escalation paths that would otherwise be missed in a strictly implementation-based analysis, and it explains why the type-forgery rule matters: extensions can manufacture objects that claim to implement XPCOM interfaces via `queryInterface`, which makes it possible to reach methods you couldn't otherwise call.
