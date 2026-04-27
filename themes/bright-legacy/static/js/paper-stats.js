(() => {
  const charts = new Set();
  let modalElements = null;
  const parseRgb = (value, fallback) => {
    if (!value) {
      return fallback;
    }
    const parts = value
      .trim()
      .split(/\s+/)
      .map((entry) => Number(entry));
    if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) {
      return fallback;
    }
    return parts;
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
    const accentRgb = parseRgb(
      rootStyle.getPropertyValue("--accent-rgb"),
      [0, 51, 153]
    );
    const borderRgb = parseRgb(
      rootStyle.getPropertyValue("--border-rgb"),
      [102, 102, 102]
    );
    const textColor =
      rootStyle.getPropertyValue("--text").trim() ||
      getComputedStyle(document.body).color ||
      "#111111";

    return {
      barColor: toCss(accentRgb, 0.26),
      lineColor: toCss(accentRgb, 0.9),
      pointColor: toCss(accentRgb),
      textColor,
      gridColor: toCss(borderRgb, 0.28),
    };
  };

  const applyTheme = (chart) => {
    if (!chart) return;
    const { barColor, lineColor, pointColor, textColor, gridColor } =
      getThemeColors();

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
    }

    const options = chart.options || {};
    if (options.plugins?.legend?.labels) {
      options.plugins.legend.labels.color = textColor;
    }

    if (options.scales?.x?.ticks) {
      options.scales.x.ticks.color = textColor;
    }
    if (options.scales?.x?.grid) {
      options.scales.x.grid.color = gridColor;
    }

    if (options.scales?.y?.ticks) {
      options.scales.y.ticks.color = textColor;
    }
    if (options.scales?.y?.grid) {
      options.scales.y.grid.color = gridColor;
    }
    if (options.scales?.y?.title) {
      options.scales.y.title.color = textColor;
    }

    if (options.scales?.y1?.ticks) {
      options.scales.y1.ticks.color = textColor;
    }
    if (options.scales?.y1?.title) {
      options.scales.y1.title.color = textColor;
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

      applyTheme(chart);
      chart.update("none");
      charts.add(chart);

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
        applyTheme(chart);
        chart.update("none");
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
    });
  } else {
    initCharts();
    observeThemeChanges();
  }
})();
