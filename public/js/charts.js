// Charts module managing Chart.js instances dynamically based on equipment configs.

let chartInstances = [];
let chartEmvAnual = null;
let chartInjAnual = null;
let chartLeakAnual = null;

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const tealPlugin = {
  id: 'teal',
  beforeDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
    ctx.restore();
  }
};

// Destroys all currently active main page charts
export function destroyCharts() {
  chartInstances.forEach(c => {
    try { c.destroy(); } catch (e) {}
  });
  chartInstances = [];
}

// Destroys all currently active annual analysis charts
export function destroyAnualCharts() {
  if (chartEmvAnual) { try { chartEmvAnual.destroy(); } catch(e) {} chartEmvAnual = null; }
  if (chartInjAnual) { try { chartInjAnual.destroy(); } catch(e) {} chartInjAnual = null; }
  if (chartLeakAnual) { try { chartLeakAnual.destroy(); } catch(e) {} chartLeakAnual = null; }
}

function buildEmvChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'line',
    plugins: [tealPlugin],
    data: {
      labels,
      datasets: [{
        label: 'EMV (V)',
        data,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13,148,136,.08)',
        borderWidth: 2,
        pointBackgroundColor: '#0d9488',
        pointRadius: 4,
        tension: .4,
        fill: true
      }, {
        label: 'Limite superior (2500V)',
        data: Array(labels.length).fill(2500),
        borderColor: 'rgba(220,38,38,.5)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#64748b', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, min: 1600, max: 2600 }
      }
    }
  });
}

// Initializes all charts for the main dashboard views
export function initCharts(tuneData, injectByMonth, config) {
  destroyCharts();

  const labels = tuneData.map(t => t.date);
  const emvs = tuneData.map(t => t.emv);

  // 1. Injections per month (relevant for all equipment)
  const injectCtx = document.getElementById('injectChart');
  if (injectCtx) {
    chartInstances.push(new Chart(injectCtx, {
      type: 'bar',
      plugins: [tealPlugin],
      data: {
        labels: months,
        datasets: [{
          label: 'Injeções',
          data: injectByMonth,
          backgroundColor: 'rgba(13,148,136,.3)',
          borderColor: '#0d9488',
          borderWidth: 1,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true }
        }
      }
    }));
  }

  // If the equipment does not have tune data, we do not initialize the remaining charts
  if (!config.hasTune) return;

  // 2. EMV main charts
  const emvChart = buildEmvChart('emvChart', labels, emvs);
  if (emvChart) chartInstances.push(emvChart);

  const emvSmall = buildEmvChart('emvSmall', labels, emvs);
  if (emvSmall) chartInstances.push(emvSmall);

  // 3. Multi-series Tune historical parameters chart
  const tuneCtx = document.getElementById('tuneChart');
  if (tuneCtx) {
    chartInstances.push(new Chart(tuneCtx, {
      type: 'line',
      plugins: [tealPlugin],
      data: {
        labels,
        datasets: [
          { label: 'm/z 219 (%)', data: tuneData.map(t => t.m219), borderColor: '#2563eb', pointRadius: 3, tension: .4, fill: false, borderWidth: 2 },
          { label: 'm/z 502 (%)', data: tuneData.map(t => t.m502), borderColor: '#8b5cf6', pointRadius: 3, tension: .4, fill: false, borderWidth: 2 },
          { label: 'm/z 18 – umidade (%)', data: tuneData.map(t => t.m18), borderColor: '#d97706', pointRadius: 3, tension: .4, fill: false, borderWidth: 1.5, borderDash: [3, 3] },
          { label: 'm/z 28 – N₂ (%)', data: tuneData.map(t => t.m28), borderColor: '#dc2626', pointRadius: 3, tension: .4, fill: false, borderWidth: 1.5, borderDash: [3, 3] },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#64748b', font: { size: 11 } } } },
        scales: {
          x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true, max: 70 }
        }
      }
    }));
  }

  // 4. H2O bar chart
  const h2oCtx = document.getElementById('h2oChart');
  if (h2oCtx) {
    chartInstances.push(new Chart(h2oCtx, {
      type: 'bar',
      plugins: [tealPlugin],
      data: {
        labels,
        datasets: [{
          label: 'm/z 18 (%)',
          data: tuneData.map(t => t.m18),
          backgroundColor: tuneData.map(t => t.m18 > 10 ? 'rgba(220,38,38,.5)' : t.m18 > 7 ? 'rgba(217,119,6,.4)' : 'rgba(16,185,129,.3)'),
          borderColor: tuneData.map(t => t.m18 > 10 ? '#dc2626' : t.m18 > 7 ? '#d97706' : '#10b981'),
          borderWidth: 1,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } } },
          y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } }, max: 12, beginAtZero: true }
        }
      }
    }));
  }

  // 5. Air leak chart (N2 and O2)
  const leakCtx = document.getElementById('leakChart');
  if (leakCtx) {
    chartInstances.push(new Chart(leakCtx, {
      type: 'line',
      plugins: [tealPlugin],
      data: {
        labels,
        datasets: [
          { label: 'm/z 28 (N₂%)', data: tuneData.map(t => t.m28), borderColor: '#d97706', pointRadius: 3, tension: .4, borderWidth: 2, fill: false },
          { label: 'm/z 32 (O₂%)', data: tuneData.map(t => t.m32), borderColor: '#dc2626', pointRadius: 3, tension: .4, borderWidth: 2, fill: false },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#64748b', font: { size: 10 } } } },
        scales: {
          x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } } },
          y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } }, beginAtZero: true, max: 12 }
        }
      }
    }));
  }
}

// Initializes annual statistics charts
export function initAnualCharts(anualTunes, monthlyInjections, selectedYear, config) {
  destroyAnualCharts();

  // 1. Monthly injections
  const injCtx = document.getElementById('injAnual');
  if (injCtx) {
    chartInjAnual = new Chart(injCtx, {
      type: 'bar',
      plugins: [tealPlugin],
      data: {
        labels: months,
        datasets: [{
          label: 'Injeções',
          data: monthlyInjections,
          backgroundColor: '#0d9488',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  // If the equipment does not have tune data, we do not initialize the remaining annual charts
  if (!config.hasTune) return;

  const labels = anualTunes.map(t => t.date);
  const emvs = anualTunes.map(t => t.emv);

  // 2. EMV Trend
  const emvCtx = document.getElementById('emvAnual');
  if (emvCtx) {
    chartEmvAnual = new Chart(emvCtx, {
      type: 'line',
      plugins: [tealPlugin],
      data: {
        labels,
        datasets: [
          {
            label: 'EMV (V)',
            data: emvs,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13,148,136,.06)',
            borderWidth: 2,
            tension: .4,
            fill: true
          },
          {
            label: 'Limite de ação',
            data: Array(labels.length).fill(2500),
            borderColor: 'rgba(220,38,38,.4)',
            borderWidth: 1,
            borderDash: [4, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#64748b', font: { size: 10 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
          y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } }, min: 1600, max: 2600 }
        }
      }
    });
  }

  // 3. Air integrity / Leak analysis
  const leakCtx = document.getElementById('leakAnual');
  if (leakCtx) {
    chartLeakAnual = new Chart(leakCtx, {
      type: 'line',
      plugins: [tealPlugin],
      data: {
        labels,
        datasets: [
          { label: 'm/z 18 (Umidade)', data: anualTunes.map(t => t.m18), borderColor: '#d97706', borderWidth: 2, tension: .4, fill: false },
          { label: 'm/z 28 (Nitrogênio)', data: anualTunes.map(t => t.m28), borderColor: '#2563eb', borderWidth: 2, tension: .4, fill: false },
          { label: 'm/z 32 (Oxigênio)', data: anualTunes.map(t => t.m32), borderColor: '#dc2626', borderWidth: 2, tension: .4, fill: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#64748b', font: { size: 10 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
          y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } }, beginAtZero: true, max: 12 }
        }
      }
    });
  }
}
