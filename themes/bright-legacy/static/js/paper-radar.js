(() => {
  const charts = new Set();
  let modalElements = null;

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
    const accentRgb = rootStyle
      .getPropertyValue("--accent-rgb")
      .trim()
      .replace(/\s+/g, " ");
    const borderRgb = rootStyle
      .getPropertyValue("--border-rgb")
      .trim()
      .replace(/\s+/g, " ");
    const [r, g, b] = accentRgb
      ? accentRgb.split(" ").map((value) => Number(value))
      : [0, 51, 153];
    const [br, bg, bb] = borderRgb
      ? borderRgb.split(" ").map((value) => Number(value))
      : [102, 102, 102];
    const fill = `rgba(${r}, ${g}, ${b}, 0.12)`;
    const line = `rgba(${r}, ${g}, ${b}, 0.9)`;
    const point = `rgb(${r}, ${g}, ${b})`;
    const grid = `rgba(${br}, ${bg}, ${bb}, 0.32)`;
    const textColor =
      rootStyle.getPropertyValue("--text").trim() ||
      getComputedStyle(document.body).color ||
      "#111111";

    return {
      fillColor: fill,
      lineColor: line,
      pointColor: point,
      textColor,
      gridColor: grid,
    };
  };

  const applyTheme = (chart) => {
    if (!chart) return;
    const { fillColor, lineColor, pointColor, textColor, gridColor } =
      getThemeColors();

    const dataset = chart.data?.datasets?.[0];
    if (dataset) {
      dataset.backgroundColor = fillColor;
      dataset.borderColor = lineColor;
      dataset.pointBackgroundColor = pointColor;
      dataset.pointBorderColor = pointColor;
    }

    const scale = chart.options?.scales?.r;
    if (scale) {
      scale.angleLines.color = gridColor;
      scale.grid.color = gridColor;
      scale.pointLabels.color = textColor;
      scale.ticks.color = textColor;
    }

    if (chart.options?.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = textColor;
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
          onClick: (event, elements, chartInstance) => {
            if (!elements.length) {
              return;
            }
            const index = elements[0].index;
            const label = chartInstance.data.labels?.[index] || "Category";
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
                  const label = context.chart.data.labels?.[context.dataIndex] || "";
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
                  weight: "400",
                },
              },
            },
          },
        },
      });

      applyTheme(chart);
      chart.update();
      charts.add(chart);
    });
  };

  const updateTheme = () => {
    charts.forEach((chart) => {
      applyTheme(chart);
      chart.update();
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === "data-theme")) {
      updateTheme();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-palette"],
  });
  initCharts();
})();
