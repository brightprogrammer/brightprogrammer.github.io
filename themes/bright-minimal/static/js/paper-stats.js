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

  const ensureModal = () => {
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

  const openModal = ({ title, yearData, yearLabel }) => {
    const elements = ensureModal();
    const { modal, body, meta } = elements;

    const heading = title ? `${title} - ${yearLabel}` : `Papers - ${yearLabel}`;
    elements.title.textContent = heading;

    const papers = yearData?.papers || [];
    const citations = yearData?.citations || 0;
    const papersCount = yearData?.works || papers.length;
    meta.textContent = `${papersCount} papers - ${citations} citations`;

    body.textContent = "";

    if (!papers.length) {
      const empty = document.createElement("div");
      empty.className = "paper-modal__empty";
      empty.textContent = "No papers found for this year in the dataset.";
      body.appendChild(empty);
    } else {
      const list = document.createElement("ol");
      list.className = "paper-modal__list";

      papers.forEach((paper) => {
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
        theme === "dark" ? [148, 163, 184] : [63, 75, 90]
      )
    );
    const bgRgb = parseRgb(
      rootStyle.getPropertyValue("--bg-rgb"),
      theme === "dark" ? [18, 20, 23] : [244, 245, 247]
    );
    const textRgb = parseRgb(
      rootStyle.getPropertyValue("--text-rgb"),
      theme === "dark" ? [230, 231, 232] : [31, 36, 41]
    );
    const contentAccentRgb = ensureContrastRgb(
      accentRgb,
      bgRgb,
      textRgb,
      theme === "dark" ? 4.8 : 4.5
    );
    const textColor =
      rootStyle.getPropertyValue("--text").trim() ||
      getComputedStyle(document.body).color ||
      "#0f172a";
    const lineRgb =
      theme === "dark"
        ? mixRgb(contentAccentRgb, [255, 255, 255], 0.08)
        : mixRgb(contentAccentRgb, textRgb, 0.06);
    const pointRgb =
      theme === "dark"
        ? mixRgb(contentAccentRgb, textRgb, 0.14)
        : mixRgb(contentAccentRgb, textRgb, 0.12);
    const barRgb =
      theme === "dark"
        ? mixRgb(contentAccentRgb, bgRgb, 0.18)
        : mixRgb(contentAccentRgb, bgRgb, 0.12);
    const gridRgb =
      theme === "dark"
        ? mixRgb(contentAccentRgb, textRgb, 0.18)
        : mixRgb(contentAccentRgb, textRgb, 0.08);

    return {
      barColor: toCss(barRgb, theme === "dark" ? 0.44 : 0.42),
      lineColor: toCss(lineRgb),
      pointColor: toCss(pointRgb),
      textColor,
      gridColor: toCss(gridRgb, theme === "dark" ? 0.3 : 0.2),
    };
  };

  const applyTheme = (chart) => {
    if (!chart) return;
    const { barColor, lineColor, pointColor, textColor, gridColor } =
      getThemeColors();
    const chartWidth = getChartWidth(chart);
    const compact = chartWidth < 460;
    const scaleFactor = clamp(chartWidth / 560, 0.72, 1);
    const tickFontSize = Math.round(12 * scaleFactor);
    const legendFontSize = Math.round(12 * scaleFactor);
    const axisTitleSize = Math.round(13 * scaleFactor);
    const layoutPad = compact ? 8 : Math.round(12 * scaleFactor);

    const datasets = chart.data?.datasets || [];
    const bar = datasets.find((d) => d.type === "bar");
    const line = datasets.find((d) => d.type === "line");

    if (bar) {
      bar.backgroundColor = barColor;
      bar.borderColor = lineColor;
    }
    if (line) {
      line.borderColor = lineColor;
      line.backgroundColor = lineColor;
      line.pointBorderColor = pointColor;
      line.pointBackgroundColor = pointColor;
      line.pointRadius = compact ? 1.5 : 2;
      line.pointHoverRadius = compact ? 3 : 4;
    }

    const options = chart.options || {};
    options.layout = {
      padding: {
        top: layoutPad,
        right: layoutPad,
        bottom: layoutPad,
        left: layoutPad,
      },
    };

    if (options.plugins?.legend) {
      options.plugins.legend.position = compact ? "bottom" : "top";
    }
    if (options.plugins?.legend?.labels) {
      options.plugins.legend.labels.color = textColor;
      options.plugins.legend.labels.boxWidth = compact ? 12 : 16;
      options.plugins.legend.labels.padding = compact ? 12 : 16;
      options.plugins.legend.labels.font = {
        size: legendFontSize,
      };
    }

    if (options.scales?.x?.ticks) {
      options.scales.x.ticks.color = textColor;
      options.scales.x.ticks.font = {
        size: tickFontSize,
      };
      options.scales.x.ticks.maxTicksLimit = compact ? 6 : 10;
    }
    if (options.scales?.x?.grid) {
      options.scales.x.grid.color = gridColor;
    }

    if (options.scales?.y?.ticks) {
      options.scales.y.ticks.color = textColor;
      options.scales.y.ticks.font = {
        size: tickFontSize,
      };
      options.scales.y.ticks.maxTicksLimit = compact ? 5 : 7;
    }
    if (options.scales?.y?.grid) {
      options.scales.y.grid.color = gridColor;
    }
    if (options.scales?.y?.title) {
      options.scales.y.title.color = textColor;
      options.scales.y.title.display = !compact;
      options.scales.y.title.font = {
        size: axisTitleSize,
      };
    }

    if (options.scales?.y1?.ticks) {
      options.scales.y1.ticks.color = textColor;
      options.scales.y1.ticks.font = {
        size: tickFontSize,
      };
      options.scales.y1.ticks.maxTicksLimit = compact ? 5 : 7;
    }
    if (options.scales?.y1?.title) {
      options.scales.y1.title.color = textColor;
      options.scales.y1.title.display = !compact;
      options.scales.y1.title.font = {
        size: axisTitleSize,
      };
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

  const initCharts = () => {
    if (!window.Chart) {
      requestAnimationFrame(initCharts);
      return;
    }

    document.querySelectorAll("[data-paper-stats]").forEach((wrapper) => {
      const canvas = wrapper.querySelector("canvas");
      const dataTag = wrapper.querySelector("[data-paper-stats-json]");
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

      const years = payload.years || [];
      const labels = years.map((entry) => entry.year);
      const works = years.map((entry) => entry.works);
      const citations = years.map((entry) => entry.citations);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      canvas.dataset.chartInitialized = "true";
      const colors = getThemeColors();

      const chart = new window.Chart(ctx, {
        data: {
          labels,
          datasets: [
            {
              type: "bar",
              label: "Papers",
              data: works,
              yAxisID: "y",
              backgroundColor: colors.barColor,
              borderColor: colors.lineColor,
              borderWidth: 1,
            },
            {
              type: "line",
              label: "Citations",
              data: citations,
              yAxisID: "y1",
              borderColor: colors.lineColor,
              backgroundColor: colors.lineColor,
              pointBorderColor: colors.pointColor,
              pointBackgroundColor: colors.pointColor,
              pointRadius: 2,
              pointHoverRadius: 4,
              tension: 0.25,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 10,
              right: 12,
              bottom: 10,
              left: 12,
            },
          },
          interaction: {
            mode: "index",
            intersect: false,
          },
          onHover: (event, elements) => {
            const target = event?.native?.target;
            if (target) {
              target.style.cursor = elements.length ? "pointer" : "default";
            }
          },
          plugins: {
            legend: {
              labels: {
                color: colors.textColor,
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
          scales: {
            x: {
              ticks: {
                color: colors.textColor,
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 10,
              },
              grid: {
                color: colors.gridColor,
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: colors.textColor,
              },
              grid: {
                color: colors.gridColor,
              },
              title: {
                display: true,
                text: "Papers",
                color: colors.textColor,
              },
            },
            y1: {
              beginAtZero: true,
              position: "right",
              ticks: {
                color: colors.textColor,
              },
              grid: {
                drawOnChartArea: false,
              },
              title: {
                display: true,
                text: "Citations",
                color: colors.textColor,
              },
            },
          },
        },
      });

      charts.add(chart);
      syncChart(chart);
      window.requestAnimationFrame(() => {
        syncChart(chart);
      });

      const titleText = wrapper.querySelector(".paper-stats__title")?.textContent?.trim();
      canvas.addEventListener("click", (event) => {
        const points = chart.getElementsAtEventForMode(
          event,
          "nearest",
          { intersect: true },
          true
        );
        if (!points.length) {
          return;
        }
        const index = points[0].index;
        const yearData = years[index];
        if (!yearData) {
          return;
        }
        const yearLabel = labels[index];
        openModal({ title: titleText, yearData, yearLabel });
      });
    });
  };

  const observeThemeChanges = () => {
    const observer = new MutationObserver(() => {
      charts.forEach((chart) => {
        syncChart(chart);
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-palette"],
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initCharts();
      observeThemeChanges();
      bindResizeHandlers();
    });
  } else {
    initCharts();
    observeThemeChanges();
    bindResizeHandlers();
  }
})();
