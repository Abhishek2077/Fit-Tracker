/* ==========================================
   FitTracker AI - Chart Utilities
   Uses Chart.js for all graphs
   ========================================== */

// Chart.js defaults for dark theme
function setChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#a0a0a0';
  Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.animation.duration = 1200;
  Chart.defaults.animation.easing = 'easeOutQuart';
  Chart.defaults.elements.point.radius = 3;
  Chart.defaults.elements.point.hoverRadius = 6;
  Chart.defaults.elements.line.tension = 0.4;
  Chart.defaults.elements.line.borderWidth = 2.5;
  Chart.defaults.elements.bar.borderRadius = 8;
  Chart.defaults.scale.grid = { color: 'rgba(255, 255, 255, 0.04)' };
}

// Color palette
const CHART_COLORS = {
  accent: '#e8b923',
  accentLight: 'rgba(232, 185, 35, 0.15)',
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.15)',
  danger: '#ef4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  info: '#38bdf8',
  infoLight: 'rgba(56, 189, 248, 0.15)',
  text: '#a0a0a0',
  grid: 'rgba(255, 255, 255, 0.04)'
};

// Create gradient
function createGradient(ctx, color1, color2) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
}

/* ---------- Weight Trend Chart ---------- */
function createWeightChart(canvasId, labels, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // Destroy existing chart
  if (canvas._chart) canvas._chart.destroy();

  const gradient = createGradient(ctx, 'rgba(232, 185, 35, 0.3)', 'rgba(232, 185, 35, 0)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data,
        borderColor: CHART_COLORS.accent,
        backgroundColor: gradient,
        fill: true,
        pointBackgroundColor: CHART_COLORS.accent,
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#f5f5f5',
          bodyColor: '#a0a0a0',
          borderColor: '#333',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} kg`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false }
      }
    }
  });

  canvas._chart = chart;
  return chart;
}

/* ---------- Protein Chart ---------- */
function createProteinChart(canvasId, labels, data, goal = 140) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  if (canvas._chart) canvas._chart.destroy();

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Protein (g)',
        data,
        backgroundColor: data.map(v => v >= goal ? CHART_COLORS.success : CHART_COLORS.accent),
        borderRadius: 8,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#f5f5f5',
          bodyColor: '#a0a0a0',
          borderColor: '#333',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y}g protein`
          }
        },
        annotation: goal ? {
          annotations: {
            goalLine: {
              type: 'line',
              yMin: goal,
              yMax: goal,
              borderColor: 'rgba(232, 185, 35, 0.5)',
              borderWidth: 1.5,
              borderDash: [6, 4],
              label: {
                content: `Goal: ${goal}g`,
                display: true,
                position: 'end'
              }
            }
          }
        } : {}
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  });

  canvas._chart = chart;
  return chart;
}

/* ---------- Calories Chart ---------- */
function createCaloriesChart(canvasId, labels, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  if (canvas._chart) canvas._chart.destroy();

  const gradient = createGradient(ctx, 'rgba(56, 189, 248, 0.3)', 'rgba(56, 189, 248, 0)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Calories',
        data,
        borderColor: CHART_COLORS.info,
        backgroundColor: gradient,
        fill: true,
        pointBackgroundColor: CHART_COLORS.info,
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#f5f5f5',
          bodyColor: '#a0a0a0',
          borderColor: '#333',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} kcal`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false }
      }
    }
  });

  canvas._chart = chart;
  return chart;
}

/* ---------- Gym Attendance Donut ---------- */
function createGymDonut(canvasId, attended, total) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  if (canvas._chart) canvas._chart.destroy();

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Gym Done', 'Missed'],
      datasets: [{
        data: [attended, total - attended],
        backgroundColor: [CHART_COLORS.accent, 'rgba(255, 255, 255, 0.05)'],
        borderWidth: 0,
        cutout: '78%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: '#1a1a1a',
          cornerRadius: 12,
          padding: 12
        }
      }
    }
  });

  canvas._chart = chart;
  return chart;
}

/* ---------- Macro Donut ---------- */
function createMacroDonut(canvasId, protein, carbs, fat) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  if (canvas._chart) canvas._chart.destroy();

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [protein, carbs, fat],
        backgroundColor: [CHART_COLORS.accent, CHART_COLORS.info, CHART_COLORS.danger],
        borderWidth: 0,
        cutout: '65%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: {
          backgroundColor: '#1a1a1a',
          cornerRadius: 12,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed}g`
          }
        }
      }
    }
  });

  canvas._chart = chart;
  return chart;
}

/* ---------- Expense Chart ---------- */
function createExpenseChart(canvasId, labels, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  if (canvas._chart) canvas._chart.destroy();

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Spending (₹)',
        data,
        backgroundColor: CHART_COLORS.accent,
        borderRadius: 8,
        barPercentage: 0.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        tooltip: {
          backgroundColor: '#1a1a1a',
          cornerRadius: 12,
          padding: 12,
          callbacks: {
            label: (ctx) => `₹${ctx.parsed.x}`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { display: false } }
      }
    }
  });

  canvas._chart = chart;
  return chart;
}

// Initialize chart defaults when script loads
document.addEventListener('DOMContentLoaded', setChartDefaults);
