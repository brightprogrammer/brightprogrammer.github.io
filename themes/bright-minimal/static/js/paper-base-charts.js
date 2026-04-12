(() => {
  const charts = new Set();
  let resizeTimer = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const getChartWidth = (chart) =>
    chart?.canvas?.parentElement?.clientWidth ||
    chart?.width ||
    window.innerWidth ||
    0;
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

  const getThemeColors = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const accentRgb = parseRgb(
      rootStyle.getPropertyValue("--accent-content-rgb"),
      parseRgb(rootStyle.getPropertyValue("--accent-rgb"), [194, 65, 12])
    );
    const bgRgb = parseRgb(rootStyle.getPropertyValue("--bg-rgb"), [255, 246, 238]);
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

    const paletteSteps =
      theme === "dark" ? [0.04, 0.18, 0.3, 0.42, 0.54] : [0, 0.2, 0.35, 0.5, 0.65];
    const palette = paletteSteps.map((step) =>
      toCss(mixRgb(contentAccentRgb, bgRgb, step))
    );

    return {
      accentRgb: contentAccentRgb,
      bgRgb,
      textColor,
      gridColor: toCss(contentAccentRgb, theme === "dark" ? 0.26 : 0.18),
      strongFill: toCss(contentAccentRgb, theme === "dark" ? 0.82 : 0.75),
      mutedFill: toCss(contentAccentRgb, theme === "dark" ? 0.46 : 0.28),
      borderColor: toCss(contentAccentRgb, theme === "dark" ? 0.96 : 0.85),
      pieBorder: toCss(bgRgb, 0.9),
      palette,
    };
  };

  const applyTheme = (chart) => {
    if (!chart) return;
    const colors = getThemeColors();
    const chartWidth = getChartWidth(chart);
    const compact = chartWidth < 460;
    const scaleFactor = clamp(chartWidth / 560, 0.7, 1);
    const tickFontSize = Math.round(12 * scaleFactor);
    const legendFontSize = Math.round(12 * scaleFactor);
    const layoutPad = compact ? 8 : Math.round(12 * scaleFactor);

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
        chart.options.plugins.legend.labels.boxWidth = compact ? 12 : 16;
        chart.options.plugins.legend.labels.padding = compact ? 10 : 14;
        chart.options.plugins.legend.labels.font = {
          size: legendFontSize,
        };
      }

      chart.options.layout = {
        padding: {
          top: layoutPad,
          right: layoutPad,
          bottom: layoutPad,
          left: layoutPad,
        },
      };
    }

    if (chart.$bpType === "bar") {
      const datasets = chart.data?.datasets || [];
      datasets.forEach((dataset) => {
        if (dataset.$bpRole === "gap") {
          dataset.backgroundColor = colors.strongFill;
        } else if (dataset.$bpRole === "no-gap") {
          dataset.backgroundColor = colors.mutedFill;
        }
        dataset.borderColor = colors.borderColor;
        dataset.maxBarThickness = compact ? 16 : 20;
      });

      if (chart.options?.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = colors.textColor;
        chart.options.plugins.legend.labels.boxWidth = compact ? 12 : 16;
        chart.options.plugins.legend.labels.padding = compact ? 10 : 14;
        chart.options.plugins.legend.labels.font = {
          size: legendFontSize,
        };
      }
      if (chart.options?.plugins?.legend) {
        chart.options.plugins.legend.position = compact ? "bottom" : "top";
      }

      chart.options.layout = {
        padding: {
          top: layoutPad,
          right: layoutPad,
          bottom: layoutPad,
          left: layoutPad,
        },
      };

      const scales = chart.options?.scales;
      if (scales?.x?.ticks) {
        scales.x.ticks.color = colors.textColor;
        scales.x.ticks.font = {
          size: tickFontSize,
        };
        scales.x.ticks.maxTicksLimit = compact ? 5 : 7;
      }
      if (scales?.y?.ticks) {
        scales.y.ticks.color = colors.textColor;
        scales.y.ticks.font = {
          size: tickFontSize,
        };
        scales.y.ticks.callback = (value) => {
          const label = chart.$gapLabels?.[value] || "";
          const maxChars = chartWidth < 380 ? 14 : chartWidth < 460 ? 18 : 24;
          return wrapLabel(label, maxChars);
        };
      }
      if (scales?.x?.grid) {
        scales.x.grid.color = colors.gridColor;
      }
      if (scales?.y?.grid) {
        scales.y.grid.color = colors.gridColor;
      }
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
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10,
            },
          },
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
      syncChart(behaviorChart);

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
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10,
            },
          },
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
      syncChart(interfaceChart);

      const gapLabels = fig3.labels || [];
      const gapCounts = fig3.counts || [];
      const gapDisparity = fig3.disparity || [];
      const gapInterfaces = fig3.interfaces || [];
      const gapCountsWithDisparity = gapCounts.map((count, idx) =>
        gapDisparity[idx] ? count : null
      );
      const gapCountsWithoutDisparity = gapCounts.map((count, idx) =>
        gapDisparity[idx] ? null : count
      );

      const gapChart = new window.Chart(canvases[2].getContext("2d"), {
        type: "bar",
        data: {
          labels: gapLabels,
          datasets: [
            {
              label: "Privilege gap",
              data: gapCountsWithDisparity,
              backgroundColor: colors.strongFill,
              borderColor: colors.borderColor,
              borderWidth: 1,
              borderRadius: 6,
              maxBarThickness: 20,
              stack: "gap",
              $bpRole: "gap",
            },
            {
              label: "No privilege gap",
              data: gapCountsWithoutDisparity,
              backgroundColor: colors.mutedFill,
              borderColor: colors.borderColor,
              borderWidth: 1,
              borderRadius: 6,
              maxBarThickness: 20,
              stack: "gap",
              $bpRole: "no-gap",
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 12,
              right: 14,
              bottom: 12,
              left: 14,
            },
          },
          interaction: {
            mode: "nearest",
            intersect: true,
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
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
              stacked: true,
              ticks: {
                color: colors.textColor,
                precision: 0,
              },
              grid: {
                color: colors.gridColor,
              },
            },
            y: {
              stacked: true,
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
      gapChart.$gapLabels = gapLabels;
      charts.add(gapChart);
      syncChart(gapChart);

      window.requestAnimationFrame(() => {
        syncChart(behaviorChart);
        syncChart(interfaceChart);
        syncChart(gapChart);
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
