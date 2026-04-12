(() => {
  const slideshows = document.querySelectorAll("[data-slideshow]");

  slideshows.forEach((root) => {
    const track = root.querySelector(".slideshow-track");
    const slides = Array.from(root.querySelectorAll(".slideshow-slide"));
    const prev = root.querySelector("[data-slideshow-prev]");
    const next = root.querySelector("[data-slideshow-next]");

    if (!track || slides.length === 0) {
      return;
    }

    const autoplay = root.dataset.autoplay !== "false";
    const interval = Number(root.dataset.interval) || 6000;
    let timer = null;
    let index = 0;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    slides.forEach((slide, i) => {
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${i + 1} of ${slides.length}`);
    });

    const update = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((slide, i) => {
        slide.setAttribute("aria-hidden", i === index ? "false" : "true");
      });
    };

    const go = (delta) => {
      index = (index + delta + slides.length) % slides.length;
      update();
    };

    const stopAutoplay = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const startAutoplay = () => {
      if (!autoplay) {
        return;
      }
      stopAutoplay();
      timer = setInterval(() => {
        go(1);
      }, interval);
    };

    const resetAutoplay = () => {
      if (autoplay) {
        startAutoplay();
      }
    };

    if (prev) {
      prev.addEventListener("click", () => {
        go(-1);
        resetAutoplay();
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        go(1);
        resetAutoplay();
      });
    }

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      track.style.transition = "none";
    };

    const onPointerMove = (event) => {
      if (!dragging) {
        return;
      }
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault();
        track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
      }
    };

    const endDrag = (event) => {
      if (!dragging) {
        return;
      }
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      dragging = false;
      track.style.transition = "";

      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        index = dx < 0 ? (index + 1) % slides.length : (index - 1 + slides.length) % slides.length;
      }
      update();
      resetAutoplay();
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    root.addEventListener("pointerleave", endDrag);
    root.addEventListener("pointerenter", stopAutoplay);
    root.addEventListener("focusin", stopAutoplay);
    root.addEventListener("focusout", resetAutoplay);
    root.addEventListener("pointerleave", resetAutoplay);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        resetAutoplay();
      }
    });

    update();
    startAutoplay();
  });
})();
