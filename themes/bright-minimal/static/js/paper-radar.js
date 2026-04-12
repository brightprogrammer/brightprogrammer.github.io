(() => {
  const charts = new Set();
  let modalElements = null;
  let resizeTimer = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const getChartWidth = (chart) =>
    chart?.canvas?.parentElement?.clientWidth ||
    chart?.width ||
    window.innerWidth ||
    0;
  const parseRgb = (value, fallback) => {
    if (!value) {
      return fallback;
    }
    const parts = value.trim().split(/\s+/).map((entry) => Number(entry));
    if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) {
      return fallback;
    }
    return parts;
  };
  const mixChannel = (a, b, ratio) => Math.round(a + (b - a) * ratio);
  const mixRgb = (rgb, target, ratio) =>
    rgb.map((channel, index) => mixChannel(channel, target[index], ratio));
  const linearizeChannel = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const luminance = (rgb) =>
    0.2126 * linearizeChannel(rgb[0]) +
    0.7152 * linearizeChannel(rgb[1]) +
    0.0722 * linearizeChannel(rgb[2]);
  const contrastRatio = (rgbA, rgbB) => {
    const a = luminance(rgbA);
    const b = luminance(rgbB);
    const lighter = Math.max(a, b);
    const darker = Math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
  };
  const ensureContrastRgb = (rgb, againstRgb, targetRgb, minRatio) => {
    if (contrastRatio(rgb, againstRgb) >= minRatio) {
      return rgb;
    }

    let adjusted = rgb;
    for (let step = 0.08; step <= 0.72; step += 0.08) {
      adjusted = mixRgb(rgb, targetRgb, step);
      if (contrastRatio(adjusted, againstRgb) >= minRatio) {
        return adjusted;
      }
    }

    return adjusted;
  };
  const toCss = (rgb, alpha) =>
    alpha === undefined
      ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
      : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

  const wrapLabel = (label, maxChars) => {
    if (typeof label !== "string" || label.length <= maxChars) {
      return label;
    }

    const words = label.split(/\s+/);
    const lines = [];
    let current = "";

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) {
        current = next;
        return;
      }
      if (current) {
        lines.push(current);
      }
      current = word;
    });

    if (current) {
      lines.push(current);
    }

    return lines.length > 1 ? lines : label;
  };

  const ensureModal = () => {
    const existing = document.querySelector(".paper-modal");
    if (existing) {
      return {
        modal: existing,
        title: existing.querySelector(".paper-modal__title"),
        meta: existing.querySelector(".paper-modal__meta"),
        body: existing.querySelector(".paper-modal__body"),
      };
    }

    if (modalElements) {
      return modalElements;
    }

    const modal = document.createElement("div");
    modal.className = "paper-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="paper-modal__backdrop" data-paper-modal-close></div>
      <div class="paper-modal__content" role="document">
        <div class="paper-modal__header">
          <div>
            <div class="paper-modal__title"></div>
            <div class="paper-modal__meta"></div>
          </div>
          <button class="paper-modal__close" type="button" aria-label="Close" data-paper-modal-close>x</button>
        </div>
        <div class="paper-modal__body"></div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    };

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-paper-modal-close]")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });

    modalElements = {
      modal,
      title: modal.querySelector(".paper-modal__title"),
      meta: modal.querySelector(".paper-modal__meta"),
      body: modal.querySelector(".paper-modal__body"),
      closeModal,
    };

    return modalElements;
  };

  const openModal = ({ heading, papers }) => {
    const elements = ensureModal();
    const { modal, body, meta } = elements;

    elements.title.textContent = heading || "Papers";
    meta.textContent = `${papers.length} papers`;

    body.textContent = "";

    if (!papers.length) {
      const empty = document.createElement("div");
      empty.className = "paper-modal__empty";
      empty.textContent = "No papers found for this category.";
      body.appendChild(empty);
    } else {
      const list = document.createElement("ol");
      list.className = "paper-modal__list";

      const sorted = [...papers].sort((a, b) => {
        const aC = a.citations || 0;
        const bC = b.citations || 0;
        if (bC !== aC) return bC - aC;
        return (a.title || "").localeCompare(b.title || "");
      });

      sorted.forEach((paper) => {
        const li = document.createElement("li");
        li.className = "paper-modal__item";

        const titleText = paper.title || "Untitled";
        if (paper.url) {
          const link = document.createElement("a");
          link.href = paper.url;
          link.textContent = titleText;
          link.setAttribute("data-external", "true");
          link.setAttribute("rel", "noopener noreferrer");
          li.appendChild(link);
        } else {
          const span = document.createElement("span");
          span.textContent = titleText;
          li.appendChild(span);
        }

        const metaBits = [];
        if (paper.venue) {
          metaBits.push(paper.venue);
        }
        if (paper.citations) {
          metaBits.push(`${paper.citations} citations`);
        }
        if (metaBits.length) {
          const metaLine = document.createElement("div");
          metaLine.className = "paper-modal__item-meta";
          metaLine.textContent = metaBits.join(" - ");
          li.appendChild(metaLine);
        }

        list.appendChild(li);
      });

      body.appendChild(list);
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const focusTarget = modal.querySelector(".paper-modal__close");
    if (focusTarget) {
      focusTarget.focus();
    }
  };

  const getThemeColors = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const accentRgb = parseRgb(
      rootStyle.getPropertyValue("--accent-content-rgb"),
      parseRgb(
        rootStyle.getPropertyValue("--accent-rgb"),
        theme === "dark" ? [148, 163, 184] : [194, 65, 12]
      )
    );
    const bgRgb = parseRgb(
      rootStyle.getPropertyValue("--bg-rgb"),
      theme === "dark" ? [18, 20, 23] : [255, 246, 238]
    );
    const textRgb = parseRgb(
      rootStyle.getPropertyValue("--text-rgb"),
      theme === "dark" ? [230, 231, 232] : [31, 35, 40]
    );
    const contentAccentRgb = ensureContrastRgb(
      accentRgb,
      bgRgb,
      textRgb,
      theme === "dark" ? 4.6 : 4.4
    );
    const textColor =
      rootStyle.getPropertyValue("--text").trim() ||
      getComputedStyle(document.body).color ||
      "#0f172a";

    return {
      fillColor: toCss(contentAccentRgb, theme === "dark" ? 0.28 : 0.2),
      lineColor: toCss(contentAccentRgb),
      pointColor: toCss(
        theme === "dark"
          ? mixRgb(contentAccentRgb, textRgb, 0.12)
          : contentAccentRgb
      ),
      textColor,
      gridColor: toCss(contentAccentRgb, theme === "dark" ? 0.28 : 0.22),
    };
  };

  const applyTheme = (chart) => {
    if (!chart) return;
    const { fillColor, lineColor, pointColor, textColor, gridColor } =
      getThemeColors();
    const chartWidth = getChartWidth(chart);
    const compact = chartWidth < 480;
    const scaleFactor = clamp(chartWidth / 560, 0.68, 1);
    const pointLabelSize = Math.round(12 * scaleFactor);
    const tickSize = Math.round(11 * scaleFactor);
    const layoutPad = compact ? 8 : Math.round(18 * scaleFactor);
    const labelWrap = compact ? 14 : 18;

    const dataset = chart.data?.datasets?.[0];
    if (dataset) {
      dataset.backgroundColor = fillColor;
      dataset.borderColor = lineColor;
      dataset.pointBackgroundColor = pointColor;
      dataset.pointBorderColor = pointColor;
      dataset.borderWidth = compact ? 1.5 : 2;
      dataset.pointRadius = compact ? 2 : 3;
      dataset.pointHoverRadius = compact ? 3 : 4;
    }

    if (Array.isArray(chart.$rawLabels)) {
      chart.data.labels = chart.$rawLabels.map((label) => wrapLabel(label, labelWrap));
    }

    chart.options.layout = {
      padding: {
        top: layoutPad,
        right: layoutPad,
        bottom: layoutPad,
        left: layoutPad,
      },
    };

    const scale = chart.options?.scales?.r;
    if (scale) {
      scale.angleLines.color = gridColor;
      scale.grid.color = gridColor;
      scale.pointLabels.color = textColor;
      scale.pointLabels.font = {
        size: pointLabelSize,
        weight: "600",
      };
      scale.ticks.color = textColor;
      scale.ticks.display = !compact;
      scale.ticks.font = {
        size: tickSize,
      };
    }

    if (chart.options?.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = textColor;
    }
  };

  const syncChart = (chart, mode = "none") => {
    if (!chart) {
      return;
    }
    chart.resize();
    applyTheme(chart);
    chart.update(mode);
  };

  const scheduleRefreshCharts = () => {
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      charts.forEach((chart) => {
        syncChart(chart);
      });
    }, 120);
  };

  const bindResizeHandlers = () => {
    window.addEventListener("resize", scheduleRefreshCharts);
    window.addEventListener("orientationchange", scheduleRefreshCharts);
    window.addEventListener("load", scheduleRefreshCharts);
    window.addEventListener("pageshow", scheduleRefreshCharts);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleRefreshCharts);
    }
  };

  const classify = (papers, labels) => {
    const buckets = labels.map(() => []);
    const labelIndex = labels.reduce((acc, label, index) => {
      acc[label] = index;
      return acc;
    }, {});

    papers.forEach((paper) => {
      let categories = [];
      if (Array.isArray(paper.categories)) {
        categories = paper.categories;
      } else if (typeof paper.category === "string") {
        categories = [paper.category];
      }

      if (!categories.length) {
        categories = ["Unsorted"];
      }

      categories.forEach((label) => {
        const index = labelIndex[label];
        if (index === undefined) {
          return;
        }
        buckets[index].push(paper);
      });
    });

    const counts = buckets.map((bucket) => bucket.length);
    return { counts, buckets };
  };

  const initCharts = () => {
    if (!window.Chart) {
      requestAnimationFrame(initCharts);
      return;
    }

    document.querySelectorAll("[data-paper-radar]").forEach((wrapper) => {
      const canvas = wrapper.querySelector("canvas");
      const dataTag = wrapper.querySelector("[data-paper-radar-json]");
      if (!canvas || !dataTag || canvas.dataset.chartInitialized === "true") {
        return;
      }

      let payload;
      try {
        payload = JSON.parse(dataTag.textContent.trim());
        if (typeof payload === "string") {
          payload = JSON.parse(payload);
        }
      } catch (err) {
        return;
      }

      const labels = payload.categories || [];
      const papers = payload.papers || [];
      const { counts, buckets } = classify(papers, labels);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      canvas.dataset.chartInitialized = "true";

      const chart = new window.Chart(ctx, {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Paper count",
              data: counts,
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 18,
              right: 20,
              bottom: 18,
              left: 20,
            },
          },
          onClick: (event, elements, chartInstance) => {
            if (!elements.length) {
              return;
            }
            const index = elements[0].index;
            const label = labels[index] || "Category";
            openModal({
              heading: `Paper themes - ${label}`,
              papers: buckets[index] || [],
            });
          },
          onHover: (event, elements) => {
            const target = event?.native?.target || event?.chart?.canvas;
            if (target) {
              target.style.cursor = elements.length ? "pointer" : "default";
            }
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = labels[context.dataIndex] || "";
                  return `${label}: ${context.raw}`;
                },
              },
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              ticks: {
                backdropColor: "transparent",
                font: {
                  size: 11,
                },
              },
              pointLabels: {
                font: {
                  size: 12,
                  weight: "600",
                },
              },
            },
          },
        },
      });

      chart.$rawLabels = labels;
      charts.add(chart);
      syncChart(chart);
      window.requestAnimationFrame(() => {
        syncChart(chart);
      });
    });
  };

  const updateTheme = () => {
    charts.forEach((chart) => {
      syncChart(chart);
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (
      mutations.some(
        (mutation) =>
          mutation.attributeName === "data-theme" ||
          mutation.attributeName === "data-palette"
      )
    ) {
      updateTheme();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-palette"],
  });
  initCharts();
  bindResizeHandlers();
})();
