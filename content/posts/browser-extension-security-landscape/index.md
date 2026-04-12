---
title: "A Look Into Browser Extension Security"
date: "2026-04-11"
description: "Notes from a presentation in a reading group"
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

Back in 2010, browser extension security wasn't treated as its own serious research topic. Firefox extensions ran with the browser's full privileges, and security failures mostly looked like "bad extensions" rather than an architectural problem. A year earlier, DEFCON 17 had a talk titled ["Abusing Firefox Extensions"](https://www.defcon.org/images/defcon-17/dc-17-presentations/defcon-17-roberto_liverani-nick_freeman-abusing_firefox.pdf) by Liverani and Freeman that demonstrated practical attacks against popular extensions, which helped underline how serious the problem was. This paper flips the framing: the Berkeley + Google authors study real Firefox extensions, show that most of them are over-privileged, and use that evidence to motivate a new extension architecture that later shaped Chrome.

The proposal is simple in spirit but strong in effect: least privilege by default, privilege separation by construction, and hard isolation between components. Extensions are split into content scripts (exposed to web pages), a core (where most privileges live), and an optional native binary (powerful but kept far from web input). The idea is to make an exploit chain harder, not just make any one bug less likely.

### What they measured (and what fell out)

Their first move was empirical. They manually inspected 25 popular Firefox extensions to understand the behaviors those extensions actually needed, then compared those needs to the power of the interfaces they used. The gap is the story:

- Only 3 out of 25 required "critical" privileges, yet all 25 effectively had them.
- 19 used critical-rated interfaces despite not needing critical privileges.
- 76% of the extensions used interfaces that were more powerful than their behavior required.

{{< paper-base-charts
  donut_note="The donut charts show the highest privilege level per extension. On the behavior side, that means the most powerful action an extension actually needed. On the interface side, it means the most powerful interface the implementation touched."
  bar_note="The horizontal bars show how common each behavior was and whether it came with a privilege gap--cases where the interface power exceeded the behavior's true need. The mismatch is the headline: a small slice of extensions need critical power, but a much larger slice end up touching critical APIs."
>}}

### Threat model (who the attacker is)

The paper assumes "benign-but-buggy" extensions: developers are well-meaning, but not necessarily security experts. The attacker doesn't trick users into installing native executables. Instead, they exploit vulnerabilities in extension code and inherit the extension's privileges. The model includes two attacker types:

- A web attacker controlling a site the user visits.
- An active network attacker who can tamper with HTTP traffic.

The browser itself is treated as non-vulnerable so the focus stays on extension risk.

One subtlety the paper calls out: extensions are not the same as plug-ins. Plug-ins are typically loaded by sites via specific MIME types, while extensions act on pages without explicit site requests. The paper stays scoped to extensions only, not plug-ins. In practice, classic browser plug-ins are basically gone today (NPAPI/Flash/Java/Silverlight are all retired), so the paper’s focus on extensions also lines up with how browsers actually work now.

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

### Proposed model: Chrome extension system

The proposed architecture is the Chrome extension model built around least privilege, privilege separation, and isolation. The idea is to make the *default* extension shape safer, not to bolt on after-the-fact checks.

**Least privilege via the manifest.** Every extension declares what it wants up front. Privileges fall into three buckets:

- **Execute arbitrary code** by listing a native binary in the manifest (NPAPI in the 2010 era).
- **Web site access** by origin patterns, so an extension can target `*.google.com` without ever seeing `bank.com`.
- **API access** via named groups like `tabs`, only granted if explicitly listed.

The paper also cares about incentives: the Chrome gallery tightens the install UX for high‑privilege extensions and blocks arbitrary‑code extensions unless the developer signs a contract. Extensions installed outside the gallery use a scary, “native executable”‑style flow, which means a site tricking the user into installing a malicious extension isn’t gaining much more than it already could with a normal binary.

**Privilege separation by design.** Extensions are forced into three components:

- **Content scripts** live inside web pages and can only touch the DOM plus message the core.
- **Extension core** runs with the extension APIs and can reach the network, but only for origins listed in the manifest.
- **Native binary** is optional and the only place with arbitrary code / file access.

The key property is that the most exposed component (content scripts) never directly talks to the most privileged component (native binary). That makes multi‑step exploitation the *expected* path, not the exception.

**Isolation mechanisms.** The model adds three layers:

- **Origin isolation** by embedding the extension’s public key in its URL (`chrome-extension://<public key>/`), which avoids a central naming authority and lets the same‑origin policy do real work.
- **Process isolation** for core and native binaries, so a renderer compromise doesn’t immediately grant extension APIs.
- **Isolated worlds** for content scripts: the page and the content script see the same DOM, but they do not share JS objects or pointers, which is meant to reduce capability leaks and DOM‑level “rootkits.”

**Evaluation and overhead.** When they survey 25 popular Chrome extensions, privilege requests are already narrower than Firefox. Only one extension (Cooliris) asks for more than it needs, and overall the privilege gap shrinks. The cost is real but manageable: message round‑trips across components average ~0.8ms, and isolated worlds add about a third to raw DOM micro‑benchmarks, but the paper argues those costs are small in real user flows.

At the adoption level, the contrast is sharp: the 2010 model directly influenced Chrome’s extension architecture, while the 2023 FISTBUMP design still looks like a research prototype with no clear mainstream deployment.
