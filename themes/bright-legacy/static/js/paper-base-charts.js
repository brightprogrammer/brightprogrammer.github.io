(() => {
  const charts = new Set();

  const parseRgb = (value, fallback) => {
    if (!value) return fallback;
    const parts = value.trim().split(/\s+/).map((v) => Number(v));
    if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) {
      return fallback;
    }
    return parts;
  };

  const mixChannel = (a, b, ratio) => Math.round(a + (b - a) * ratio);
  const mixRgb = (rgb, target, ratio) => rgb.map((c, i) => mixChannel(c, target[i], ratio));
  const toCss = (rgb, alpha) =>
    alpha === undefined
      ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
      : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

  const getThemeColors = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const accentRgb = parseRgb(
      rootStyle.getPropertyValue("--accent-rgb"),
      [194, 65, 12]
    );
    const bgRgb = parseRgb(rootStyle.getPropertyValue("--bg-rgb"), [255, 246, 238]);
    const textColor =
      rootStyle.getPropertyValue("--text").trim() ||
      getComputedStyle(document.body).color ||
      "#0f172a";

    const paletteSteps =
      theme === "dark" ? [0, 0.12, 0.24, 0.36, 0.48] : [0, 0.2, 0.35, 0.5, 0.65];
    const palette = paletteSteps.map((step) =>
      toCss(mixRgb(accentRgb, bgRgb, step))
    );

    return {
      accentRgb,
      bgRgb,
      textColor,
      gridColor: toCss(accentRgb, 0.18),
      strongFill: toCss(accentRgb, 0.75),
      mutedFill: toCss(accentRgb, 0.28),
      borderColor: toCss(accentRgb, 0.85),
      pieBorder: toCss(bgRgb, 0.9),
      palette,
    };
  };

  const applyTheme = (chart) => {
    if (!chart) return;
    const colors = getThemeColors();

    if (chart.$bpType === "doughnut") {
      const dataset = chart.data?.datasets?.[0];
      if (dataset) {
        const palette = colors.palette;
        dataset.backgroundColor = dataset.data.map(
          (_, idx) => palette[idx % palette.length]
        );
        dataset.borderColor = colors.pieBorder;
      }

      if (chart.options?.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = colors.textColor;
      }
    }

    if (chart.$bpType === "bar") {
      const dataset = chart.data?.datasets?.[0];
      if (dataset && Array.isArray(chart.$bpDisparity)) {
        dataset.backgroundColor = chart.$bpDisparity.map((flag) =>
          flag ? colors.strongFill : colors.mutedFill
        );
        dataset.borderColor = colors.borderColor;
      }

      if (chart.options?.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = colors.textColor;
      }

      const scales = chart.options?.scales;
      if (scales?.x?.ticks) {
        scales.x.ticks.color = colors.textColor;
      }
      if (scales?.y?.ticks) {
        scales.y.ticks.color = colors.textColor;
      }
      if (scales?.x?.grid) {
        scales.x.grid.color = colors.gridColor;
      }
      if (scales?.y?.grid) {
        scales.y.grid.color = colors.gridColor;
      }
    }
  };

  const initCharts = () => {
    if (!window.Chart) {
      requestAnimationFrame(initCharts);
      return;
    }

    document.querySelectorAll("[data-paper-base]").forEach((wrapper) => {
      const dataTag = wrapper.querySelector("[data-paper-base-json]");
      if (!dataTag || wrapper.dataset.chartInitialized === "true") {
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

      const canvases = wrapper.querySelectorAll("canvas");
      if (canvases.length < 3) {
        return;
      }

      wrapper.dataset.chartInitialized = "true";

      const fig2Behavior = payload.fig2?.behavior || {};
      const fig2Interface = payload.fig2?.interface || {};
      const fig3 = payload.fig3 || {};

      const colors = getThemeColors();

      const behaviorChart = new window.Chart(canvases[0].getContext("2d"), {
        type: "doughnut",
        data: {
          labels: fig2Behavior.labels || [],
          datasets: [
            {
              data: fig2Behavior.counts || [],
              backgroundColor: colors.palette,
              borderColor: colors.pieBorder,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: colors.textColor,
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed || 0;
                  return `${context.label}: ${value}`;
                },
              },
            },
          },
        },
      });
      behaviorChart.$bpType = "doughnut";
      charts.add(behaviorChart);

      const interfaceChart = new window.Chart(canvases[1].getContext("2d"), {
        type: "doughnut",
        data: {
          labels: fig2Interface.labels || [],
          datasets: [
            {
              data: fig2Interface.counts || [],
              backgroundColor: colors.palette,
              borderColor: colors.pieBorder,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: colors.textColor,
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed || 0;
                  return `${context.label}: ${value}`;
                },
              },
            },
          },
        },
      });
      interfaceChart.$bpType = "doughnut";
      charts.add(interfaceChart);

      const gapLabels = fig3.labels || [];
      const gapCounts = fig3.counts || [];
      const gapDisparity = fig3.disparity || [];
      const gapInterfaces = fig3.interfaces || [];

      const gapChart = new window.Chart(canvases[2].getContext("2d"), {
        type: "bar",
        data: {
          labels: gapLabels,
          datasets: [
            {
              label: "Extensions (count)",
              data: gapCounts,
              backgroundColor: gapDisparity.map((flag) =>
                flag ? colors.strongFill : colors.mutedFill
              ),
              borderColor: colors.borderColor,
              borderWidth: 1,
              borderRadius: 6,
              maxBarThickness: 20,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "nearest",
            intersect: true,
          },
          plugins: {
            legend: {
              display: false,
              labels: {
                color: colors.textColor,
              },
            },
            tooltip: {
              callbacks: {
                title: (context) => {
                  const idx = context[0]?.dataIndex ?? 0;
                  return gapLabels[idx] || "";
                },
                label: (context) => {
                  const idx = context.dataIndex;
                  const parsed = context.parsed;
                  const count =
                    typeof parsed === "object" && parsed !== null
                      ? parsed.x ?? 0
                      : parsed ?? 0;
                  const interfaceLabel = gapInterfaces[idx] || "";
                  const disparity = gapDisparity[idx] ? "Yes" : "No";
                  return [
                    `Extensions: ${count}`,
                    interfaceLabel ? `Interface used: ${interfaceLabel}` : null,
                    `Privilege gap: ${disparity}`,
                  ].filter(Boolean);
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                color: colors.textColor,
                precision: 0,
              },
              grid: {
                color: colors.gridColor,
              },
            },
            y: {
              ticks: {
                color: colors.textColor,
                callback: (value) => {
                  const label = gapLabels[value] || "";
                  if (label.length > 32) {
                    return `${label.slice(0, 29)}...`;
                  }
                  return label;
                },
              },
              grid: {
                color: colors.gridColor,
              },
            },
          },
        },
      });
      gapChart.$bpType = "bar";
      gapChart.$bpDisparity = gapDisparity;
      charts.add(gapChart);
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
