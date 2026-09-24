// ตัวช่วยวาดกราฟด้วย Chart.js (โหลดผ่าน CDN ใน index.html) — ใช้ร่วมกันระหว่าง
// หน้าภาพรวมระบบ (dashboard.js) และหน้ารายงานตามเงื่อนไข (reports.js)

const CHART_PALETTE = ['#22c55e', '#fbbf24', '#f87171', '#38bdf8', '#a78bfa', '#f472b6', '#94a3b8', '#fb923c'];

const chartInstances = {};

function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

// รวมยอด (SUM ของ r.total) ตามค่าของ key ที่ระบุ พร้อมแปลป้ายกำกับผ่าน labelsMap ถ้ามี
function aggregateBy(rows, key, labelsMap) {
  const totals = {};
  (rows || []).forEach((r) => {
    const k = r[key];
    if (k == null) return;
    totals[k] = (totals[k] || 0) + Number(r.total || 0);
  });
  const keys = Object.keys(totals);
  return {
    labels: keys.map((k) => (labelsMap && labelsMap[k]) || k),
    data: keys.map((k) => totals[k]),
  };
}

// ต่อ % ท้ายป้ายกำกับแต่ละค่า (คิดจากสัดส่วนต่อผลรวมทั้งหมด) — ให้เห็น % ได้แม้ตอนพิมพ์ (ไม่ต้อง hover)
function withPercentLabels(labels, data) {
  const total = data.reduce((sum, v) => sum + Number(v), 0) || 1;
  return labels.map((l, i) => `${l} (${((Number(data[i]) / total) * 100).toFixed(1)}%)`);
}

// เติมฟิลด์ percent (string มี % ต่อท้าย) ให้แถวที่มี r.total — ใช้กับตารางสรุปใต้กราฟ
function withPercentColumn(rows) {
  const total = rows.reduce((sum, r) => sum + Number(r.total || 0), 0) || 1;
  return rows.map((r) => ({ ...r, percent: `${((Number(r.total || 0) / total) * 100).toFixed(1)}%` }));
}

function renderChart(canvasId, type, labels, data, { label = '' } = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  destroyChart(canvasId);

  if (!labels.length) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const isBar = type === 'bar';
  chartInstances[canvasId] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: CHART_PALETTE,
        borderColor: isBar ? CHART_PALETTE[0] : 'rgba(18,26,21,0.9)',
        borderWidth: isBar ? 0 : 2,
        borderRadius: isBar ? 4 : 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !isBar,
          position: 'bottom',
          labels: { color: '#e7f5ec', boxWidth: 12, font: { size: 11 } },
        },
        tooltip: { enabled: true },
      },
      scales: isBar ? {
        x: { ticks: { color: '#7f9a8a' }, grid: { display: false } },
        y: { ticks: { color: '#7f9a8a', precision: 0 }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true },
      } : undefined,
    },
  });
}
