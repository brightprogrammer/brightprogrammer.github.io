(() => {
  const copyText = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const addCopyButtons = () => {
    document.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code");
      const container = pre.closest(".highlight") || pre;
      if (!code || container.querySelector(".code-copy")) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy";
      button.setAttribute("aria-label", "Copy code");
      button.setAttribute("title", "Copy");
      button.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      button.addEventListener("click", async () => {
        try {
          await copyText(code.textContent || "");
          button.setAttribute("title", "Copied");
          button.classList.add("is-copied");
          window.setTimeout(() => {
            button.setAttribute("title", "Copy");
            button.classList.remove("is-copied");
          }, 1400);
        } catch (err) {
          button.setAttribute("title", "Failed");
          window.setTimeout(() => {
            button.setAttribute("title", "Copy");
          }, 1400);
        }
      });

      container.appendChild(button);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addCopyButtons, { once: true });
  } else {
    addCopyButtons();
  }
})();
