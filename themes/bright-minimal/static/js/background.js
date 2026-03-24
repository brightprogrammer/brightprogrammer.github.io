(() => {
  const canvas = document.getElementById("ambient-bg");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let gridW = 0;
  let gridH = 0;
  let points = [];
  let colors = [];
  let raf = null;
  let lastTime = 0;
  let resizeTimer = null;
  let offscreen = null;
  let offCtx = null;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const parseRGB = (value, fallback) => {
    if (!value) {
      return fallback;
    }
    const parts = value.trim().split(/\s+/).map(Number);
    if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
      return parts.slice(0, 3);
    }
    return fallback;
  };

  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  const refreshColors = () => {
    const styles = getComputedStyle(document.documentElement);
    const bg = parseRGB(styles.getPropertyValue("--bg-rgb"), [245, 245, 245]);
    const text = parseRGB(styles.getPropertyValue("--text-rgb"), [25, 25, 25]);
    const accent = parseRGB(styles.getPropertyValue("--accent-rgb"), [120, 80, 200]);
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const strengths =
      theme === "light"
        ? [0.35, 0.55, 0.2, 0.7]
        : [0.22, 0.38, 0.1, 0.55];

    colors = [
      mix(bg, accent, strengths[0]),
      mix(bg, accent, strengths[1]),
      mix(bg, text, strengths[2]),
      mix(bg, accent, strengths[3]),
    ];
  };

  const getViewportSize = () => {
    const viewport = window.visualViewport;
    return {
      width: viewport ? viewport.width : window.innerWidth,
      height: viewport ? viewport.height : window.innerHeight,
    };
  };

  const ensureOffscreen = () => {
    if (!offscreen || offscreen.width !== gridW || offscreen.height !== gridH) {
      offscreen = document.createElement("canvas");
      offscreen.width = gridW;
      offscreen.height = gridH;
      offCtx = offscreen.getContext("2d");
    }
  };

  const resize = ({ preserve = false, targetWidth, targetHeight } = {}) => {
    const dpr = window.devicePixelRatio || 1;
    const prevGridW = gridW || 1;
    const prevGridH = gridH || 1;
    const viewport = getViewportSize();
    width = targetWidth ?? viewport.width;
    height = targetHeight ?? viewport.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nextGridW = Math.max(80, Math.floor(width / 10));
    const nextGridH = Math.max(60, Math.floor(height / 10));

    const count = Math.max(12, Math.floor(Math.min(width, height) / 120));
    if (preserve && points.length) {
      const scaleX = nextGridW / prevGridW;
      const scaleY = nextGridH / prevGridH;
      points = points.map((p) => ({
        ...p,
        x: Math.max(0, Math.min(nextGridW, p.x * scaleX)),
        y: Math.max(0, Math.min(nextGridH, p.y * scaleY)),
      }));

      if (points.length < count) {
        const addCount = count - points.length;
        points = points.concat(
          Array.from({ length: addCount }, () => ({
            x: Math.random() * nextGridW,
            y: Math.random() * nextGridH,
            vx: (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
            vy: (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
            color: colors[Math.floor(Math.random() * colors.length)],
          }))
        );
      } else if (points.length > count) {
        points = points.slice(0, count);
      }
    } else {
      points = Array.from({ length: count }, () => ({
        x: Math.random() * nextGridW,
        y: Math.random() * nextGridH,
        vx: (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
        vy: (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    }

    gridW = nextGridW;
    gridH = nextGridH;
    ensureOffscreen();
  };

  const update = (dt) => {
    points.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0 || p.x > gridW) {
        p.vx *= -1;
        p.x = Math.max(0, Math.min(gridW, p.x));
      }
      if (p.y < 0 || p.y > gridH) {
        p.vy *= -1;
        p.y = Math.max(0, Math.min(gridH, p.y));
      }
    });
  };

  const render = () => {
    const image = ctx.createImageData(gridW, gridH);
    const data = image.data;
    let idx = 0;

    for (let y = 0; y < gridH; y += 1) {
      for (let x = 0; x < gridW; x += 1) {
        let closest = points[0];
        let best = Infinity;
        for (let i = 0; i < points.length; i += 1) {
          const p = points[i];
          const dx = x - p.x;
          const dy = y - p.y;
          const dist = dx * dx + dy * dy;
          if (dist < best) {
            best = dist;
            closest = p;
          }
        }
        const falloff = Math.min(1, best / (gridW * gridH * 0.015));
        const color = closest.color;
        data[idx++] = Math.round(color[0] + (255 - color[0]) * (falloff * 0.08));
        data[idx++] = Math.round(color[1] + (255 - color[1]) * (falloff * 0.08));
        data[idx++] = Math.round(color[2] + (255 - color[2]) * (falloff * 0.08));
        data[idx++] = 255;
      }
    }

    ensureOffscreen();
    offCtx.putImageData(image, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) {
      ctx.imageSmoothingQuality = "high";
    }
    ctx.drawImage(offscreen, 0, 0, width, height);
  };

  const frame = (time) => {
    if (!lastTime) {
      lastTime = time;
    }
    const delta = (time - lastTime) / 1000;
    if (delta > 0.2) {
      lastTime = time;
      raf = requestAnimationFrame(frame);
      return;
    }
    if (delta >= 0.03) {
      const step = Math.min(delta, 0.05);
      update(step * 5);
      render();
      lastTime = time;
    }
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    refreshColors();
    resize();
    render();
    if (!prefersReducedMotion) {
      raf = requestAnimationFrame(frame);
    }
  };

  const stop = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  window.addEventListener("resize", () => {
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      const viewport = getViewportSize();
      const widthDelta = Math.abs(viewport.width - width);
      const heightDelta = Math.abs(viewport.height - height);
      if (width && widthDelta < 1 && heightDelta < 80) {
        return;
      }
      resize({
        preserve: true,
        targetWidth: viewport.width,
        targetHeight: viewport.height,
      });
      render();
    }, 120);
  });

  window.addEventListener("theme-change", () => {
    refreshColors();
    points.forEach((p) => {
      p.color = colors[Math.floor(Math.random() * colors.length)];
    });
    render();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("beforeunload", stop);
})();
