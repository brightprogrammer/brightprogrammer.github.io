(() => {
  const input = document.getElementById("search-input");
  const resultsEl = document.getElementById("search-results");
  const statusEl = document.getElementById("search-status");

  if (!input || !resultsEl) {
    return;
  }

  const indexPath = input.dataset.index || "/lunr.json";
  let documents = [];
  let index = null;

  const setStatus = (message) => {
    if (statusEl) {
      statusEl.textContent = message;
    }
  };

  const clearResults = () => {
    resultsEl.innerHTML = "";
  };

  const buildSnippet = (content, query) => {
    const clean = content.replace(/\s+/g, " ").trim();
    if (!query) {
      return clean.slice(0, 160) + (clean.length > 160 ? "…" : "");
    }
    const lower = clean.toLowerCase();
    const token = query.toLowerCase().split(/\s+/).filter(Boolean)[0];
    if (!token) {
      return clean.slice(0, 160) + (clean.length > 160 ? "…" : "");
    }
    const idx = lower.indexOf(token);
    if (idx === -1) {
      return clean.slice(0, 160) + (clean.length > 160 ? "…" : "");
    }
    const start = Math.max(0, idx - 60);
    const end = Math.min(clean.length, idx + 100);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < clean.length ? "…" : "";
    return prefix + clean.slice(start, end) + suffix;
  };

  const renderResults = (results, query) => {
    clearResults();
    if (!results.length) {
      setStatus("No results.");
      return;
    }

    const fragment = document.createDocumentFragment();
    results.forEach((item) => {
      const article = document.createElement("article");
      article.className = "search-result";

      const link = document.createElement("a");
      link.href = item.uri;
      link.textContent = item.title || item.uri;

      const meta = document.createElement("div");
      meta.className = "search-result-meta";
      meta.textContent = item.uri;

      const snippet = document.createElement("p");
      snippet.className = "search-result-snippet";
      snippet.textContent = buildSnippet(item.content || "", query);

      article.appendChild(link);
      article.appendChild(meta);
      article.appendChild(snippet);
      fragment.appendChild(article);
    });

    resultsEl.appendChild(fragment);
    setStatus(`${results.length} result${results.length === 1 ? "" : "s"}.`);
  };

  const runSearch = (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      clearResults();
      setStatus("Type to search.");
      return;
    }

    if (!index) {
      setStatus("Indexing content…");
      return;
    }

    let matches = [];
    try {
      matches = index.search(trimmed);
    } catch (err) {
      matches = [];
    }

    const results = matches
      .map((match) => documents.find((doc) => doc.uri === match.ref))
      .filter(Boolean);

    renderResults(results, trimmed);
  };

  const updateUrl = (query) => {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState({}, "", url.toString());
  };

  const init = async () => {
    setStatus("Loading index…");
    try {
      if (typeof lunr === "undefined") {
        setStatus("Search library unavailable.");
        return;
      }
      const response = await fetch(indexPath);
      documents = await response.json();

      const normalized = documents.map((doc) => ({
        ...doc,
        tags: Array.isArray(doc.tags) ? doc.tags.join(" ") : "",
      }));

      index = lunr(function () {
        this.ref("uri");
        this.field("title");
        this.field("content");
        this.field("tags");

        normalized.forEach((doc) => {
          this.add(doc);
        }, this);
      });

      setStatus("Type to search.");

      const params = new URLSearchParams(window.location.search);
      const initial = params.get("q") || "";
      if (initial) {
        input.value = initial;
        runSearch(initial);
      }
    } catch (err) {
      setStatus("Search index unavailable. Run `npm run index` after building the site.");
    }
  };

  input.addEventListener("input", (event) => {
    const value = event.target.value;
    updateUrl(value);
    runSearch(value);
  });

  init();
})();
