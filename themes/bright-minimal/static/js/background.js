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
  let targetGridPixels = 18000;
  let pointDivisor = 140;
  let frameInterval = 0.035;
  let speedFactor = 5;
  let highlightStrength = 0.08;

  const isLowEnd = () => {
    const mem = navigator.deviceMemory || 0;
    const cores = navigator.hardwareConcurrency || 0;
    return (mem && mem <= 4) || (cores && cores <= 4);
  };

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
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const refreshColors = () => {
    const styles = getComputedStyle(document.documentElement);
    const bg = parseRGB(styles.getPropertyValue("--bg-rgb"), [245, 245, 245]);
    const text = parseRGB(styles.getPropertyValue("--text-rgb"), [25, 25, 25]);
    const accent = parseRGB(styles.getPropertyValue("--accent-rgb"), [120, 80, 200]);
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const palette = document.documentElement.getAttribute("data-palette") || "graphite";
    let nextColors;

    if (theme === "dark" && palette === "copper") {
      const soot = [8, 5, 4];
      highlightStrength = 0.05;
      nextColors = [
        mix(bg, accent, 0.3),
        mix(bg, accent, 0.44),
        mix(bg, text, 0.24),
        mix(mix(bg, accent, 0.58), soot, 0.12),
      ];
    } else {
      const strengths =
        theme === "light"
          ? [0.35, 0.55, 0.2, 0.7]
          : [0.48, 0.68, 0.32, 0.78];
      highlightStrength = 0.08;
      nextColors = [
        mix(bg, accent, strengths[0]),
        mix(bg, accent, strengths[1]),
        mix(bg, text, strengths[2]),
        mix(bg, accent, strengths[3]),
      ];
    }

    if (colors.length === nextColors.length) {
      nextColors.forEach((next, index) => {
        const target = colors[index];
        if (Array.isArray(target) && target.length >= 3) {
          target[0] = next[0];
          target[1] = next[1];
          target[2] = next[2];
        } else {
          colors[index] = next;
        }
      });
    } else {
      colors = nextColors;
    }
  };

  const getViewportMetrics = () => {
    const viewport = window.visualViewport;
    return {
      width: viewport ? viewport.width : window.innerWidth,
      height: viewport ? viewport.height : window.innerHeight,
      offsetLeft: viewport ? viewport.offsetLeft : 0,
      offsetTop: viewport ? viewport.offsetTop : 0,
    };
  };

  const syncViewportVars = (viewport = getViewportMetrics()) => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--viewport-width", `${Math.ceil(viewport.width)}px`);
    rootStyle.setProperty("--viewport-height", `${Math.ceil(viewport.height)}px`);
    rootStyle.setProperty("--viewport-offset-x", `${viewport.offsetLeft}px`);
    rootStyle.setProperty("--viewport-offset-y", `${viewport.offsetTop}px`);
    return viewport;
  };

  const ensureOffscreen = () => {
    if (!offscreen || offscreen.width !== gridW || offscreen.height !== gridH) {
      offscreen = document.createElement("canvas");
      offscreen.width = gridW;
      offscreen.height = gridH;
      offCtx = offscreen.getContext("2d");
    }
  };

  const createVelocity = () =>
    (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1);

  const createBalancedColors = (count) =>
    Array.from({ length: count }, (_, index) => colors[index % colors.length]);

  const rebalancePointColors = () => {
    if (!points.length || !colors.length) {
      return;
    }
    const balancedColors = createBalancedColors(points.length);
    const orderedPoints = [...points].sort((a, b) =>
      a.y === b.y ? a.x - b.x : a.y - b.y
    );
    orderedPoints.forEach((point, index) => {
      point.color = balancedColors[index];
    });
  };

  const createSeedPoints = (
    count,
    maxWidth,
    maxHeight,
    { minX = 0, minY = 0, maxX = maxWidth, maxY = maxHeight } = {}
  ) => {
    const spanW = Math.max(1, maxX - minX);
    const spanH = Math.max(1, maxY - minY);
    const cols = Math.max(1, Math.ceil(Math.sqrt((count * spanW) / spanH)));
    const rows = Math.max(1, Math.ceil(count / cols));
    const cellW = spanW / cols;
    const cellH = spanH / rows;
    const cells = Array.from({ length: cols * rows }, (_, index) => index);

    for (let i = cells.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[swapIndex]] = [cells[swapIndex], cells[i]];
    }

    return Array.from({ length: count }, (_, index) => {
      const cell = cells[index];
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      return {
        x: minX + col * cellW + (0.2 + Math.random() * 0.6) * cellW,
        y: minY + row * cellH + (0.2 + Math.random() * 0.6) * cellH,
        vx: createVelocity(),
        vy: createVelocity(),
        color: colors[index % colors.length],
      };
    });
  };

  const getGridSize = (targetWidth, targetHeight) => {
    const area = Math.max(1, targetWidth * targetHeight);
    const divisor = Math.max(1, Math.sqrt(area / targetGridPixels));
    return {
      width: Math.max(70, Math.min(Math.ceil(targetWidth), Math.round(targetWidth / divisor))),
      height: Math.max(54, Math.min(Math.ceil(targetHeight), Math.round(targetHeight / divisor))),
    };
  };

  const resize = ({ preserve = false, targetWidth, targetHeight } = {}) => {
    const dpr = window.devicePixelRatio || 1;
    const prevGridW = gridW || 1;
    const prevGridH = gridH || 1;
    const viewport = syncViewportVars();
    width = targetWidth ?? viewport.width;
    height = targetHeight ?? viewport.height;
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nextGrid = getGridSize(width, height);
    const nextGridW = nextGrid.width;
    const nextGridH = nextGrid.height;
    const widthDelta = Math.abs(nextGridW - prevGridW);
    const heightDelta = Math.abs(nextGridH - prevGridH);
    const onlyHeightChange = widthDelta < 1 && heightDelta > 0;
    const heightExpanded = nextGridH > prevGridH;

    const count = Math.max(10, Math.floor(Math.min(width, height) / pointDivisor));
    if (preserve && points.length) {
      if (onlyHeightChange) {
        points = points.map((p) => ({
          ...p,
          x: Math.max(0, Math.min(nextGridW, p.x)),
          y: p.y > nextGridH ? Math.random() * nextGridH : p.y,
        }));
      } else {
        const scaleX = nextGridW / prevGridW;
        const scaleY = nextGridH / prevGridH;
        points = points.map((p) => ({
          ...p,
          x: Math.max(0, Math.min(nextGridW, p.x * scaleX)),
          y: Math.max(0, Math.min(nextGridH, p.y * scaleY)),
        }));
      }

      if (points.length < count) {
        const addCount = count - points.length;
        points = points.concat(
          createSeedPoints(addCount, nextGridW, nextGridH, {
            minY: heightExpanded && onlyHeightChange ? prevGridH : 0,
            maxY: nextGridH,
          })
        );
      } else if (points.length > count) {
        points = points.slice(0, count);
      }
      rebalancePointColors();
    } else {
      points = createSeedPoints(count, nextGridW, nextGridH);
      rebalancePointColors();
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
    const edgeSoftness = Math.max(
      1.6,
      Math.sqrt((gridW * gridH) / Math.max(1, points.length)) * 0.08
    );

    for (let y = 0; y < gridH; y += 1) {
      for (let x = 0; x < gridW; x += 1) {
        let closest = points[0];
        let secondClosest = points[1] || points[0];
        let best = Infinity;
        let secondBest = Infinity;
        for (let i = 0; i < points.length; i += 1) {
          const p = points[i];
          const dx = x - p.x;
          const dy = y - p.y;
          const dist = dx * dx + dy * dy;
          if (dist < best) {
            secondBest = best;
            secondClosest = closest;
            best = dist;
            closest = p;
          } else if (dist < secondBest) {
            secondBest = dist;
            secondClosest = p;
          }
        }
        const gap = Math.sqrt(secondBest) - Math.sqrt(best);
        const edgeMix = clamp(1 - gap / edgeSoftness, 0, 1) * 0.32;
        const falloff = Math.min(1, best / (gridW * gridH * 0.015));
        const color = closest.color;
        const edgeColor = secondClosest.color || color;
        const red = Math.round(color[0] + (edgeColor[0] - color[0]) * edgeMix);
        const green = Math.round(color[1] + (edgeColor[1] - color[1]) * edgeMix);
        const blue = Math.round(color[2] + (edgeColor[2] - color[2]) * edgeMix);
        data[idx++] = Math.round(red + (255 - red) * (falloff * highlightStrength));
        data[idx++] = Math.round(green + (255 - green) * (falloff * highlightStrength));
        data[idx++] = Math.round(blue + (255 - blue) * (falloff * highlightStrength));
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
    if (delta >= frameInterval) {
      const step = Math.min(delta, 0.05);
      update(step * speedFactor);
      render();
      lastTime = time;
    }
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (isLowEnd()) {
      targetGridPixels = 12000;
      pointDivisor = 160;
      frameInterval = 0.06;
      speedFactor = 3.8;
    }
    refreshColors();
    syncViewportVars();
    resize();
    render();

    const startAnim = () => {
      if (!prefersReducedMotion && !raf) {
        raf = requestAnimationFrame(frame);
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(startAnim, { timeout: 1200 });
    } else {
      window.setTimeout(startAnim, 800);
    }
  };

  const stop = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  const resume = () => {
    if (prefersReducedMotion || raf) {
      return;
    }
    lastTime = 0;
    raf = requestAnimationFrame(frame);
  };

  const scheduleResize = () => {
    const viewport = syncViewportVars();
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      const widthDelta = Math.abs(viewport.width - width);
      const heightDelta = Math.abs(viewport.height - height);
      if (widthDelta < 0.5 && heightDelta < 0.5) {
        return;
      }
      resize({
        preserve: true,
        targetWidth: viewport.width,
        targetHeight: viewport.height,
      });
      render();
    }, 120);
  };

  window.addEventListener("resize", scheduleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleResize);
    window.visualViewport.addEventListener("scroll", () => {
      syncViewportVars();
    });
  }

  window.addEventListener("theme-change", () => {
    refreshColors();
    rebalancePointColors();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      return;
    }
    lastTime = 0;
    render();
    resume();
  });

  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", () => {
    refreshColors();
    syncViewportVars();
    resize({ preserve: true });
    render();
    resume();
  });

  window.addEventListener("load", () => {
    refreshColors();
    syncViewportVars();
    render();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("beforeunload", stop);
})();
