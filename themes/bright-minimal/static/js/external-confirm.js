(() => {
  const message = "You're leaving brightprogrammer.in";
  let modal = null;
  let pendingLink = null;

  const ensureModal = () => {
    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.className = "external-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="external-modal__backdrop" data-external-modal-close></div>
      <div class="external-modal__content" role="document">
        <div class="external-modal__header">
          <div class="external-modal__title">${message}</div>
          <button class="external-modal__close" type="button" aria-label="Close" data-external-modal-close>x</button>
        </div>
        <div class="external-modal__body">
          <div class="external-modal__text">You are about to open:</div>
          <div class="external-modal__url" data-external-modal-url></div>
        </div>
        <div class="external-modal__actions">
          <button class="external-modal__button" type="button" data-external-modal-close>Stay here</button>
          <button class="external-modal__button external-modal__button--primary" type="button" data-external-modal-continue>Continue</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-external-modal-close]")) {
        closeModal();
      }
      if (event.target.closest("[data-external-modal-continue]")) {
        continueNavigation();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });

    return modal;
  };

  const openModal = (link) => {
    const modalEl = ensureModal();
    pendingLink = link;

    const urlTarget = modalEl.querySelector("[data-external-modal-url]");
    if (urlTarget) {
      try {
        const url = new URL(link.href, window.location.href);
        urlTarget.textContent = url.href;
      } catch (err) {
        urlTarget.textContent = link.href;
      }
    }

    modalEl.classList.add("is-open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const focusTarget = modalEl.querySelector(".external-modal__button--primary");
    if (focusTarget) {
      focusTarget.focus();
    }
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    pendingLink = null;
  };

  const continueNavigation = () => {
    if (!pendingLink) {
      closeModal();
      return;
    }

    const href = pendingLink.href;
    const target = pendingLink.getAttribute("target");
    closeModal();

    if (target && target !== "_self") {
      window.open(href, target, "noopener,noreferrer");
    } else {
      window.location.href = href;
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-external='true']");
    if (!link) {
      return;
    }
    event.preventDefault();
    openModal(link);
  });
})();
