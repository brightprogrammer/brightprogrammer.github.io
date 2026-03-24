(() => {
  const modal = document.getElementById("img-modal");
  if (!modal) {
    return;
  }

  const modalImage = modal.querySelector(".img-modal__image");
  const modalCaption = modal.querySelector(".img-modal__caption");
  const closeButtons = modal.querySelectorAll("[data-img-close]");

  const openModal = (button) => {
    const src = button.getAttribute("data-img-src");
    const alt = button.getAttribute("data-img-alt") || "";
    const caption = button.getAttribute("data-img-caption") || "";

    if (modalImage) {
      modalImage.src = src;
      modalImage.alt = alt;
    }

    if (modalCaption) {
      if (caption) {
        modalCaption.textContent = caption;
        modalCaption.style.display = "block";
      } else {
        modalCaption.textContent = "";
        modalCaption.style.display = "none";
      }
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (modalImage) {
      modalImage.src = "";
      modalImage.alt = "";
    }
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest(".image-button");
    if (button) {
      event.preventDefault();
      openModal(button);
    }
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      closeModal();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
})();
