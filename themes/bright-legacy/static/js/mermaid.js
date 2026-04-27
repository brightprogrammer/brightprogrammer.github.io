(() => {
  const getTheme = () =>
    document.documentElement.getAttribute("data-theme") || "light";

  const replaceMermaidBlocks = () => {
    const blocks = document.querySelectorAll(
      'pre code.language-mermaid, pre code.mermaid'
    );
    if (!blocks.length) {
      return false;
    }

    blocks.forEach((block) => {
      const pre = block.parentElement;
      if (!pre) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "mermaid";
      wrapper.textContent = block.textContent;

      const highlight = pre.parentElement;
      if (highlight && highlight.classList.contains("highlight")) {
        highlight.replaceWith(wrapper);
      } else {
        pre.replaceWith(wrapper);
      }
    });

    return true;
  };

  const renderMermaid = (theme) => {
    if (typeof mermaid === "undefined") {
      return;
    }

    const hasBlocks = replaceMermaidBlocks();
    if (!hasBlocks && !document.querySelector(".mermaid")) {
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
    });

    document.querySelectorAll(".mermaid").forEach((el) => {
      el.removeAttribute("data-processed");
    });

    mermaid.init(undefined, document.querySelectorAll(".mermaid"));
  };

  const init = () => {
    renderMermaid(getTheme());
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("theme-change", (event) => {
    const theme = event?.detail?.theme || getTheme();
    renderMermaid(theme);
  });
})();
