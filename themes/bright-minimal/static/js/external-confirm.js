(() => {
  const message = "This will take you out of brightprogrammer.in. Continue?";

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-external='true']");
    if (!link) {
      return;
    }
    const ok = window.confirm(message);
    if (!ok) {
      event.preventDefault();
    }
  });
})();
