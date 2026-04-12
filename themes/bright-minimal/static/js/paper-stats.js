(() => {
  const charts = new Set();

  const getThemeColors = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const palette =
      theme === "dark"
        ? {
            bar: "rgba(255, 185, 0, 0.36)",
            line: "#fe9a00",
            point: "#ffd230",
            grid: "rgba(255, 185, 0, 0.18)",
          }
        : {
            bar: "rgba(225, 113, 0, 0.48)",
            line: "#bb4d00",
            point: "#973c00",
            grid: "rgba(187, 77, 0, 0.2)",
          };
    const textColor =
      rootStyle.getPropertyValue("--text").trim() ||
      getComputedStyle(document.body).color ||
      "#0f172a";

    return {
      barColor: palette.bar,
      lineColor: palette.line,
      pointColor: palette.point,
      textColor,
      gridColor: palette.grid,
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

      const chart = new window.Chart(ctx, {
        data: {
          labels,
          datasets: [
            {
              type: "bar",
              label: "Papers",
              data: works,
              yAxisID: "y",
              backgroundColor: "rgba(225, 113, 0, 0.48)",
              borderColor: "#bb4d00",
              borderWidth: 1,
            },
            {
              type: "line",
              label: "Citations",
              data: citations,
              yAxisID: "y1",
              borderColor: "#bb4d00",
              backgroundColor: "#bb4d00",
              pointBorderColor: "#973c00",
              pointBackgroundColor: "#973c00",
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
          plugins: {
            legend: {
              labels: {
                color: "#0f172a",
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
                color: "#0f172a",
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 10,
              },
              grid: {
                color: "rgba(187, 77, 0, 0.2)",
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: "#0f172a",
              },
              grid: {
                color: "rgba(187, 77, 0, 0.2)",
              },
              title: {
                display: true,
                text: "Papers",
                color: "#0f172a",
              },
            },
            y1: {
              beginAtZero: true,
              position: "right",
              ticks: {
                color: "#0f172a",
              },
              grid: {
                drawOnChartArea: false,
              },
              title: {
                display: true,
                text: "Citations",
                color: "#0f172a",
              },
            },
          },
        },
      });

      applyTheme(chart);
      chart.update("none");
      charts.add(chart);
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
