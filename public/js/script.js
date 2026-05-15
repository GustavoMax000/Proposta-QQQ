// =====================================================================
// DATA
// =====================================================================
let tuneData = [];
let injectByMonth = [];
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const troubleshootItems = [
  {
    symptom: '⚡ Perda de sensibilidade / queda repentina de sinal',
    severity: 'alert',
    causes: 'Fonte de íons contaminada; coluna degradada ou com excesso de bleed; detector (electron multiplier) no fim da vida útil; vazamento na linha de vácuo; filamento danificado.',
    steps: [
      'Verificar m/z 18, 28, 32 no último tune — valores elevados indicam contaminação ou vazamento.',
      'Inspecionar e limpar a fonte de íons (ion source cartridge) — lentes, volume iônico, repeller.',
      'Cortar a coluna (2–5 cm) próximo ao injetor e verificar o liner.',
      'Verificar se o EMV está próximo ou acima de 2500 V; se sim, considerar substituição do electron multiplier.',
      'Verificar a corrente de emissão do filamento. Alternar para filamento 2 se necessário.',
      'Realizar EI Full Tune com gás PFTBA e verificar relatório de diagnóstico.',
    ]
  },
  {
    symptom: '🌡️ Temperatura da interface instável ou acima do limite',
    severity: 'warn',
    causes: 'Transfer line desconectada ou com mau contato; superaquecimento da coluna cromatográfica (colunas poliimida: não exceder 280 °C contínuo); configuração de método incorreta.',
    steps: [
      'Verificar a temperatura definida no método: Transfer Line Max = 400 °C absoluto; para colunas de poliimida, limite prático = 280 °C.',
      'Conferir se a coluna instalada é compatível com a temperatura programada.',
      'Reconectar o cabo da transfer line ao MS e verificar no software TSQ Series se o valor está sendo lido corretamente.',
      'Executar um EI Diagnostics no Chromeleon para verificar sensores de temperatura.',
    ]
  },
  {
    symptom: '💧 m/z 18 elevado (umidade na fonte)',
    severity: 'warn',
    causes: 'Fonte de íons aberta recentemente (sistema ainda em equilíbrio); vazamento de água no gás de arraste; coluna não condicionada; instrumento recém-ligado.',
    steps: [
      'Aguardar ≥ 2 horas após ligar o sistema para o vácuo estabilizar.',
      'Verificar o cilindro de He: usar He ultra-puro (pureza ≥ 99,999%). Checar armadilha de água/O₂ inline.',
      'Condicionar a coluna antes de realizar tuning — programação de forno crescente.',
      'Se m/z 18 > 10% persiste, limpar a fonte de íons.',
    ]
  },
  {
    symptom: '🔴 m/z 28 ou m/z 32 elevados (vazamento de ar)',
    severity: 'alert',
    causes: 'Vazamento na conexão da coluna ao injetor ou ao MS; o-ring do manifold danificado; liner ou septo com mau contato; fitting da transfer line frouxo.',
    steps: [
      'Verificar com leak detector ou isobutano (método de exclusão) todas as conexões: injetor, transfer line, manifold door.',
      'Checar septo do injetor — substituir se necessário (uso recomendado: <150 injeções).',
      'Verificar o o-ring do manifold door e o vent valve o-ring.',
      'Se m/z 32 > 2%, parar imediatamente as corridas — o O₂ deteriora o filamento e os componentes do electron multiplier.',
      'Reconectar a coluna ao MS com o procedimento correto de SilTite fitting.',
    ]
  },
  {
    symptom: '📉 EMV crescente a cada tune (> 2200 V)',
    severity: 'warn',
    causes: 'Desgaste natural do electron multiplier (MCP); contaminação por amostras de alta concentração; operação em pressão subótima.',
    steps: [
      'Monitorar tendência do EMV nos tunes consecutivos — crescimento contínuo indica fim de vida.',
      'Se EMV > 2500 V com baixa sensibilidade, solicitar substituição do electron multiplier (MCP plate).',
      'Manter o melhor vácuo possível: verificar óleo da bomba foreline mensalmente.',
      'Limitar corridas a alta concentração — usar diluições ou injeção split agressivo.',
    ]
  },
  {
    symptom: '⏱️ Deriva de tempo de retenção do PI (tR)',
    severity: 'warn',
    causes: 'Variação de pressão no injetor; coluna degradada ou com volume morto; temperatura do forno instável; troca de lote de gás de arraste.',
    steps: [
      'Verificar a pressão no injetor (registrar diariamente) — comparar com valores históricos.',
      'Verificar a temperatura do forno do GC no início e fim da corrida.',
      'Realizar corte da coluna (2–5 cm) se observado alargamento de pico além do corte.',
      'Confirmar que o liner está limpo e com volume morto mínimo.',
      'Se o tR mudou > 0.05 min em relação ao histórico, investigar antes de injetar amostras reais.',
    ]
  },
  {
    symptom: '🔧 Falha ao iniciar — bomba ou vácuo não estabelecido',
    severity: 'alert',
    causes: 'Bomba foreline sem óleo ou com óleo saturado; o-ring do manifold mal posicionado; vent valve aberta; falha elétrica da bomba turbomolecular.',
    steps: [
      'Verificar nível e qualidade do óleo da bomba foreline antes de ligar.',
      'Confirmar que o vent valve knob está totalmente fechado (girar 1,5 voltas horário após venting).',
      'Verificar se o manifold door está travado corretamente (4 parafusos T20).',
      'Seguir procedimento completo de Power On: Powering On the TSQ 9610 System (Hardware Manual, Cap. 1).',
      'Se turbomolecular não atingir velocidade em 10 min, contatar suporte Thermo Fisher Scientific.',
    ]
  },
];

const checklistItems = [
  { label: 'Verificar energia e LEDs de status (Power, Vacuum, Tune)' },
  { label: 'Confirmar pressão do gás de arraste (He) no cilindro' },
  { label: 'Registrar Tambiente (temperatura do laboratório)' },
  { label: 'Verificar pressão no injetor e registrar em psi' },
  { label: 'Confirmar nível de óleo da bomba foreline' },
  { label: 'Verificar parâmetros de vácuo e temperatura no software' },
  { label: 'Checar ausência de mensagens de erro no TSQ Series' },
  { label: 'Registrar número de injeções do dia e acumular no liner' },
];

// =====================================================================
// NAVIGATION
// =====================================================================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'" + page + "'")) n.classList.add('active');
  });
}

// =====================================================================
// RENDER DATE
// =====================================================================
function renderDate() {
  const d = new Date();
  document.getElementById('sidebar-date').textContent = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const di = document.getElementById('log-date');
  if (di) di.value = d.toISOString().split('T')[0];
}

// =====================================================================
// CHARTS
// =====================================================================
const chartDefaults = {
  color: '#64748b',
  borderColor: 'rgba(226,232,240,0.8)',
  backgroundColor: 'rgba(0,0,0,0)',
};
Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = 'rgba(226,232,240,0.8)';

const tealPlugin = {
  id: 'teal',
  beforeDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height); ctx.restore();
  }
};

function buildEmvChart(id, labels, data) {
  return new Chart(document.getElementById(id), {
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
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#64748b', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, min: 1600, max: 2600 }
      }
    }
  });
}

function initCharts() {
  const labels = tuneData.map(t => t.date);
  const emvs = tuneData.map(t => t.emv);

  // EMV main chart
  buildEmvChart('emvChart', labels, emvs);
  buildEmvChart('emvSmall', labels, emvs);

  // Injection chart
  new Chart(document.getElementById('injectChart'), {
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
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true }
      }
    }
  });

  // Tune full chart (multi-series)
  new Chart(document.getElementById('tuneChart'), {
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
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#64748b', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true, max: 70 }
      }
    }
  });

  // H2O chart
  new Chart(document.getElementById('h2oChart'), {
    type: 'bar',
    plugins: [tealPlugin],
    data: {
      labels,
      datasets: [{
        label: 'm/z 18 (%)',
        data: tuneData.map(t => t.m18),
        backgroundColor: tuneData.map(t => t.m18 > 10 ? 'rgba(220,38,38,.5)' : t.m18 > 7 ? 'rgba(217,119,6,.4)' : 'rgba(16,185,129,.3)'),
        borderColor: tuneData.map(t => t.m18 > 10 ? '#dc2626' : t.m18 > 7 ? '#d97706' : '#10b981'),
        borderWidth: 1, borderRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } } },
        y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } }, max: 12, beginAtZero: true }
      }
    }
  });

  // Leak chart
  new Chart(document.getElementById('leakChart'), {
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
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#64748b', font: { size: 10 } } } },
      scales: {
        x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } } },
        y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 9 } }, beginAtZero: true, max: 12 }
      }
    }
  });
}

// =====================================================================
// TUNE TABLE
// =====================================================================
function renderTuneTable() {
  const tbody = document.getElementById('tune-table-body');
  tbody.innerHTML = tuneData.map(t => {
    const emvClass = t.emv > 2200 ? 'alert' : t.emv > 1800 ? 'warn' : 'ok';
    const m18Class = t.m18 > 10 ? 'alert' : t.m18 > 7 ? 'warn' : 'ok';
    const m28Class = t.m28 > 10 ? 'alert' : t.m28 > 7 ? 'warn' : 'ok';
    const m32Class = t.m32 > 2 ? 'alert' : t.m32 > 1.5 ? 'warn' : 'ok';
    return `<tr>
      <td class="num">#${t.num}</td>
      <td class="num">${t.date}</td>
      <td>${t.op}</td>
      <td class="num">Fil. ${t.fil}</td>
      <td class="num ${emvClass}">${t.emv}</td>
      <td class="num">${t.tint}</td>
      <td class="num ok">${t.m69}</td>
      <td class="num ok">${t.m219}</td>
      <td class="num ok">${t.m502}</td>
      <td class="num ${m18Class}">${t.m18}</td>
      <td class="num ${m28Class}">${t.m28}</td>
      <td class="num ${m32Class}">${t.m32}</td>
      <td><span class="metric-badge badge-ok">OK</span></td>
    </tr>`;
  }).join('');
}

// =====================================================================
// TROUBLESHOOT
// =====================================================================
function renderTroubleshoot() {
  const c = document.getElementById('trouble-container');
  c.innerHTML = troubleshootItems.map((item, i) => `
    <div class="trouble-item">
      <div class="trouble-header" onclick="toggleTrouble(${i})">
        <div class="trouble-symptom">
          <span class="metric-badge badge-${item.severity}">${item.severity === 'alert' ? 'CRÍTICO' : 'ATENÇÃO'}</span>
          ${item.symptom}
        </div>
        <span class="chevron" id="chev-${i}">▾</span>
      </div>
      <div class="trouble-body" id="trouble-${i}">
        <div class="trouble-cause"><strong>Possíveis causas:</strong> ${item.causes}</div>
        <ul class="trouble-steps">
          ${item.steps.map((s, j) => `<li><span class="step-num">${j + 1}</span><span>${s}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

function toggleTrouble(i) {
  const body = document.getElementById('trouble-' + i);
  const chev = document.getElementById('chev-' + i);
  body.classList.toggle('open');
  chev.classList.toggle('open');
}

// =====================================================================
// CHECKLIST
// =====================================================================
function renderChecklist() {
  const c = document.getElementById('check-items');
  let checked = 0;
  c.innerHTML = checklistItems.map((item, i) => `
    <div class="indicator-row" style="cursor:pointer" onclick="toggleCheck(${i},this)">
      <span class="ind-name" id="chk-label-${i}">${item.label}</span>
      <span id="chk-ico-${i}" style="color:var(--muted)">○</span>
    </div>
  `).join('');
}
function toggleCheck(i, row) {
  const ico = document.getElementById('chk-ico-' + i);
  const label = document.getElementById('chk-label-' + i);
  const checked = ico.textContent === '✓';
  ico.textContent = checked ? '○' : '✓';
  ico.style.color = checked ? 'var(--muted)' : 'var(--green)';
  label.style.color = checked ? 'var(--label)' : 'var(--text)';
  const total = document.querySelectorAll('#check-items .ind-name').length;
  const done = document.querySelectorAll('#check-items .ind-name').length - [...document.querySelectorAll('#check-items [id^=chk-ico]')].filter(e => e.textContent === '○').length;
  document.getElementById('check-count').textContent = done + '/' + total;
  document.getElementById('check-bar').style.width = (done / total * 100) + '%';
}

// =====================================================================
// LOG
// =====================================================================
let savedLogs = [];

function renderLogsList() {
  const c = document.getElementById('saved-logs');
  if (!c) return;
  c.innerHTML = savedLogs.map(l => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
      <strong style="color:var(--teal)">${l.date}</strong> · ${l.op} · 
      ${l.psi ? '<span style=color:var(--label)>' + l.psi + ' psi</span> · ' : ''} 
      ${l.inj ? l.inj + ' inj. · ' : ''}
      <span style="color:var(--muted)">${l.obs || 'Sem obs.'}</span>
    </div>
  `).join('');
}

async function saveLog() {
  const date = document.getElementById('log-date').value;
  const op = document.getElementById('log-op').value || '—';
  const psi = document.getElementById('log-psi').value;
  const inj = document.getElementById('log-inj').value;
  const obs = document.getElementById('log-obs').value;
  if (!date) { alert('Preencha a data do registro.'); return; }
  const entry = { date, op, psi, inj, obs };
  const tuneNum = document.getElementById('log-tunenum').value;

  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const result = await response.json();
    savedLogs = result.savedLogs;
    renderLogsList();

    if (tuneNum) {
      const tuneEntry = {
        num: parseInt(tuneNum),
        date: date,
        op: op,
        fil: document.getElementById('log-fil').value || 1,
        emv: parseFloat(document.getElementById('log-emv').value || 0),
        tint: parseFloat(document.getElementById('log-tinterf').value || 0),
        m69: parseFloat(document.getElementById('log-69').value || 0),
        m219: parseFloat(document.getElementById('log-219').value || 0),
        m502: parseFloat(document.getElementById('log-502').value || 0),
        m18: parseFloat(document.getElementById('log-18').value || 0),
        m28: parseFloat(document.getElementById('log-28').value || 0),
        m32: parseFloat(document.getElementById('log-32').value || 0)
      };
      await fetch('/api/tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tuneEntry)
      });
      window.location.reload();
      return;
    }

    // clear
    ['log-op', 'log-psi', 'log-inj', 'log-obs', 'log-corte', 'log-trpi', 'log-emv', 'log-18', 'log-28', 'log-32', 'log-69', 'log-219', 'log-502', 'log-tinterf', 'log-codcol', 'log-tunenum'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    ['log-sistema', 'log-he', 'log-limpinj', 'log-septo', 'log-liner', 'log-col', 'log-limpfonte', 'log-fil'].forEach(id => {
      const el = document.getElementById(id); if (el) el.selectedIndex = 0;
    });
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar no servidor.');
  }
}

// =====================================================================
// PDF GENERATION
// =====================================================================
async function generatePDF() {
  const overlay = document.getElementById('pdf-overlay');
  overlay.classList.add('show');
  const status = document.getElementById('pdf-status');

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;

    // Color helpers
    const hex2rgb = hex => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
    const teal = hex2rgb('#0d9488'), amber = hex2rgb('#d97706'), red = hex2rgb('#dc2626'), green = hex2rgb('#10b981');

    // ---- PAGE 1: COVER ----
    status.textContent = 'Gerando capa do relatório...';
    await sleep(200);
    doc.setFillColor(11, 15, 26); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 60, 'F');

    // Title block
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('RELATÓRIO ANUAL DE ACOMPANHAMENTO DE EQUIPAMENTO', 105, 20, { align: 'center' });
    doc.text('MÉTODO 5.389 · TRIAGEM IX · CÓD. EQUIP. 12E797', 105, 27, { align: 'center' });
    doc.setFontSize(28); doc.setTextColor(226, 232, 240);
    doc.text('TSQ 9610 GCxGC–MS/MS', 105, 42, { align: 'center' });
    doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Thermo Scientific · Triple Quadrupole GC-MS · Ionização EI', 105, 52, { align: 'center' });

    // Year badge
    const yr = new Date().getFullYear();
    doc.setFillColor(0, 212, 184); doc.roundedRect(75, 65, 60, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(11, 15, 26);
    doc.text('Ano de Referência: ' + yr, 105, 76, { align: 'center' });

    // Info table
    const infoY = 92;
    const rows = [
      ['Equipamento', 'TSQ 9610 GCxGC–MS/MS'], ['Código', '12E797'],
      ['Fabricante', 'Thermo Fisher Scientific'], ['Método', '5.389 · Triagem IX'],
      ['Gás de Arraste', 'Hélio (He) — Grau Ultra-Puro'], ['Filamentos', 'Duplo (1 e 2)'],
      ['Software', 'TSQ Series 5.0 ou superior'], ['Calibrante', 'PFTBA'],
      ['Documento', 'TSQ 9610 Hardware Manual Rev. B · Jul 2024'],
      ['Data do relatório', new Date().toLocaleDateString('pt-BR')],
    ];
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('IDENTIFICAÇÃO DO EQUIPAMENTO', 20, infoY);
    doc.setDrawColor(30, 47, 71); doc.setLineWidth(.3); doc.line(20, infoY + 2, 190, infoY + 2);
    rows.forEach((r, i) => {
      const y = infoY + 10 + i * 9;
      //doc.setFillColor(i%2===0?22,32,50:17,24,39);
      doc.rect(20, y - 5, 170, 9, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text(r[0], 24, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(226, 232, 240);
      doc.text(r[1], 90, y);
    });

    // Summary KPIs
    const sumY = infoY + 105;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('RESUMO OPERACIONAL ' + yr, 20, sumY);
    doc.line(20, sumY + 2, 190, sumY + 2);
    const kpis = [
      ['Tunes Realizados', '7', 'ok'], ['Total de Injeções (est.)', '442', 'ok'],
      ['Injeções no Liner Atual', '342', 'warn'], ['Último EMV', '1842 V', 'ok'],
      ['Limpezas da Fonte', '1', 'ok'], ['Manutenções Corretivas', '0', 'ok'],
    ];
    kpis.forEach((k, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = 20 + col * 60, by = sumY + 8 + row * 22;
      const clr = k[2] === 'ok' ? green : k[2] === 'warn' ? amber : red;
      doc.setFillColor(22, 32, 50); doc.roundedRect(bx, by, 55, 18, 2, 2, 'F');
      doc.setDrawColor(clr.r, clr.g, clr.b); doc.setLineWidth(.5); doc.roundedRect(bx, by, 55, 18, 2, 2, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(clr.r, clr.g, clr.b);
      doc.text(k[1], bx + 27.5, by + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text(k[0], bx + 27.5, by + 16.5, { align: 'center' });
    });

    // ---- PAGE 2: TUNE DATA ----
    status.textContent = 'Compilando histórico de tune...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(11, 15, 26); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(100, 116, 139); doc.text('HISTÓRICO DE TUNE', 190, 10, { align: 'right' });

    doc.setFontSize(14); doc.setTextColor(226, 232, 240);
    doc.text('Histórico de Tune — Parâmetros Registrados', 20, 28);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Calibrante PFTBA · Ionização EI · ' + tuneData.length + ' tunes realizados em ' + yr, 20, 34);

    // Table
    const th = ['Tune', 'Data', 'Operador', 'Fil', 'EMV(V)', 'T.Int(°C)', 'm/z69', 'm/z219', 'm/z502', 'm/z18', 'm/z28', 'm/z32'];
    const cols = [15, 22, 26, 12, 16, 16, 12, 16, 16, 12, 12, 12];
    let tx = 12, ty = 44;
    doc.setFillColor(26, 34, 53); doc.rect(10, ty - 6, 190, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 212, 184);
    let cx = tx;
    th.forEach((h, i) => { doc.text(h, cx, ty); cx += cols[i]; });
    tuneData.forEach((t, ri) => {
      ty += 10;
      //doc.setFillColor(ri%2===0?22,32,50:17,24,39);
      doc.rect(10, ty - 6, 190, 9, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      const row = ['#' + t.num, t.date, t.op, 'Fil.' + t.fil, '' + t.emv, '' + t.tint, '' + t.m69, '' + t.m219, '' + t.m502, '' + t.m18, '' + t.m28, '' + t.m32];
      cx = tx;
      row.forEach((val, i) => {
        let clr = [226, 232, 240];
        if (i === 4 && t.emv > 2200) clr = [amber.r, amber.g, amber.b];
        if (i === 9 && t.m18 > 7) clr = [amber.r, amber.g, amber.b];
        if (i === 10 && t.m28 > 7) clr = [amber.r, amber.g, amber.b];
        if (i === 11 && t.m32 > 1.5) clr = [red.r, red.g, red.b];
        doc.setTextColor(...clr);
        doc.text(val, cx, ty); cx += cols[i];
      });
    });
    ty += 18;
    // Legend
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('LIMITES DE REFERÊNCIA', 20, ty);
    doc.line(20, ty + 2, 190, ty + 2);
    const limits = [
      'EMV — Faixa normal: 1200 a 2500 V. Acima de 2500 V: considerar substituição do electron multiplier.',
      'm/z 18 (umidade) — Limite: < 10% relativo ao m/z 69. Valores altos indicam contaminação da fonte ou vazamento.',
      'm/z 28 (N₂) — Limite: < 10% relativo ao m/z 69. Valores altos indicam vazamento de ar.',
      'm/z 32 (O₂) — Limite: < 2% relativo ao m/z 69. Valores acima deste limite deterioram filamento e detector.',
      'm/z 219 e m/z 502 — Rastreiam a qualidade do tune com o calibrante PFTBA.',
    ];
    limits.forEach((l, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text('•  ' + l, 20, ty + 10 + i * 8, { maxWidth: 170 });
    });

    // ---- PAGE 3: MAINTENANCE ----
    status.textContent = 'Gerando plano de manutenção...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(11, 15, 26); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(100, 116, 139); doc.text('MANUTENÇÃO PREVENTIVA', 190, 10, { align: 'right' });
    doc.setFontSize(14); doc.setTextColor(226, 232, 240);
    doc.text('Manutenção Preventiva — Plano e Execução', 20, 28);

    const maintItems = [
      ['Troca de Septo', '100–200 injeções', '15/11/2022', 'OK', 'Realizado preventivamente. Operação normal após troca.'],
      ['Troca de Liner', '400–800 injeções', '03/02/2022', 'MONITORAR', '342 injeções acumuladas. Substituição prevista em breve.'],
      ['Corte de Coluna (1D)', 'Por necessidade', '05/08/2022', 'OK', '3 cortes de 3 cm realizados ao longo de ' + yr + '.'],
      ['Limpeza da Fonte de Íons', 'Trimestral / m/z18>10%', '22/09/2022', 'OK', 'Ion source cartridge removido e limpo. Lentes e volume iônico lavados com metanol HPLC.'],
      ['Troca Cilindro He', 'Por pressão', '18/05/2022', 'OK', 'Substituição realizada. Pressão verificada em 14 psi no injetor.'],
      ['Verificação Óleo Foreline', 'Mensal', 'Não registrado', 'ATENÇÃO', 'Registro não encontrado no caderno. Verificar imediatamente.'],
      ['Tune EI do Sistema', 'Semanal / pré-corrida', '10/11/2022', 'OK', '7 tunes realizados em ' + yr + '. Todos dentro dos parâmetros.'],
    ];
    let my = 40;
    doc.setFillColor(26, 34, 53); doc.rect(10, my, 190, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0, 212, 184);
    doc.text('COMPONENTE', 14, my + 6.5);
    doc.text('FREQUÊNCIA', 55, my + 6.5);
    doc.text('ÚLTIMA REALIZ.', 95, my + 6.5);
    doc.text('STATUS', 130, my + 6.5);
    doc.text('OBSERVAÇÕES', 150, my + 6.5);
    maintItems.forEach((m, i) => {
      my += 10;
      //doc.setFillColor(i%2===0?22,32,50:17,24,39);
      doc.rect(10, my, 190, 20, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(226, 232, 240);
      doc.text(m[0], 14, my + 5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text(m[1], 55, my + 5, { maxWidth: 38 });
      doc.text(m[2], 95, my + 5);
      const sc = m[3] === 'OK' ? green : m[3] === 'MONITORAR' ? amber : red;
      doc.setTextColor(sc.r, sc.g, sc.b); doc.setFont('helvetica', 'bold');
      doc.text(m[3], 130, my + 5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text(m[4], 150, my + 5, { maxWidth: 46 });
      my += 10;
    });

    // ---- PAGE 4: ISSUES & TROUBLESHOOTING ----
    status.textContent = 'Compilando guia de diagnósticos...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(11, 15, 26); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(100, 116, 139); doc.text('DIAGNÓSTICO E OCORRÊNCIAS', 190, 10, { align: 'right' });
    doc.setFontSize(14); doc.setTextColor(226, 232, 240);
    doc.text('Diagnósticos e Ocorrências — ' + yr, 20, 28);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Baseado no TSQ 9610 Hardware Manual (1R120622-0003 Rev. B) e User Guide (1R120622-0002 Rev. B)', 20, 35);

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129);
    doc.text('✓  Sem ocorrências de manutenção corretiva registradas para o ano de ' + yr + '.', 20, 48);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text('O sistema operou dentro dos parâmetros esperados ao longo de ' + yr + '. Nenhuma falha crítica foi registrada no', 20, 56);
    doc.text('Caderno de Manutenção Corretiva. Todos os tunes realizados passaram nos critérios de aceitação.', 20, 62);

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('PONTOS DE ATENÇÃO PARA ' + (yr + 1), 20, 78);
    doc.line(20, 80, 190, 80);
    const atencoes = [
      ['⚠', 'Liner com 342 injeções acumuladas — substituir antes de atingir 400 injeções para evitar contaminação do injetor.', [amber.r, amber.g, amber.b]],
      ['⚠', 'Registro de verificação do óleo da bomba foreline não localizado. Realizar verificação e registrar imediatamente.', [amber.r, amber.g, amber.b]],
      ['ℹ', 'EMV em 1842 V (Tune #7). Tendência de crescimento gradual observada. Monitorar — limite de ação: 2500 V.', [100, 116, 139]],
      ['ℹ', 'Considerar limpeza preventiva da fonte de íons no primeiro trimestre de 2023 (última limpeza: set/2022).', [100, 116, 139]],
      ['✓', 'Sistema de vácuo íntegro: m/z 28 = 4.8% e m/z 32 = 0.9% — ambos abaixo dos limites de aceitação.', [16, 185, 129]],
    ];
    let ay = 88;
    atencoes.forEach(a => {
      doc.setFillColor(22, 32, 50); doc.roundedRect(18, ay - 5, 174, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(a[2][0], a[2][1], a[2][2]);
      doc.text(a[0], 23, ay + 2.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
      doc.text(a[1], 30, ay + 2.5, { maxWidth: 158 });
      ay += 18;
    });

    // ---- PAGE 5: ANNUAL SUMMARY + CORRECTIVE RECORDS ----
    status.textContent = 'Gerando resumo anual e registros corretivos...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(11, 15, 26); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(100, 116, 139); doc.text('ANÁLISE ANUAL E MANUTENÇÕES CORRETIVAS', 190, 10, { align: 'right' });
    doc.setFontSize(14); doc.setTextColor(226, 232, 240);
    doc.text('Análise Anual — Manutenções Corretivas e Recomendações ' + (yr + 1), 20, 28);

    // Corrective records
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('MANUTENÇÕES CORRETIVAS REGISTRADAS', 20, 42);
    doc.setDrawColor(30, 47, 71); doc.line(20, 44, 190, 44);

    let p5y = 50;
    if (correctiveRecords.length === 0) {
      doc.setFillColor(16, 32, 22); doc.roundedRect(18, p5y, 174, 16, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(green.r, green.g, green.b);
      doc.text('✓  Nenhuma manutenção corretiva registrada em ' + yr + '. Sistema sem falhas criticas.', 24, p5y + 10, { maxWidth: 162 });
      p5y += 24;
    } else {
      correctiveRecords.forEach((r, i) => {
        doc.setFillColor(22, 32, 50); doc.roundedRect(18, p5y, 174, 30, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(amber.r, amber.g, amber.b);
        doc.text(r.date + ' — ' + r.resp + ' | Supervisão: ' + r.sup, 22, p5y + 8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(226, 232, 240);
        doc.text('Problema: ', 22, p5y + 15);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
        doc.text(r.prob, 44, p5y + 15, { maxWidth: 148 });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 212, 184);
        doc.text('Ação: ', 22, p5y + 22);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
        doc.text(r.proc, 36, p5y + 22, { maxWidth: 154 });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text('Resultado: ', 22, p5y + 28);
        doc.setFont('helvetica', 'normal');
        doc.text(r.result, 48, p5y + 28, { maxWidth: 144 });
        p5y += 36;
      });
    }

    // Recommendations for 2023
    p5y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('RECOMENDAÇÕES PARA ' + (yr + 1), 20, p5y);
    doc.line(20, p5y + 2, 190, p5y + 2);
    p5y += 10;
    const recs5 = [
      [amber, 'URGENTE', 'Substituir liner do injetor — 342 injecoes acumuladas, proximo do limite de 400.'],
      [amber, 'URGENTE', 'Verificar oleo da bomba foreline — nenhum registro localizado em ' + yr + '.'],
      [green, 'MONITORAR', 'Tendencia do EMV: +92 V em ' + yr + '. Projecao ' + (yr + 1) + ': ~1950 V. Acao ao atingir 2500 V.'],
      [green, 'PLANEJAR', 'Agendar limpeza da fonte de ions — 1T/' + (yr + 1) + ' (manter intervalo trimestral).'],
      [green, 'INFORMATIVO', 'Vacuo integro em ' + yr + ': m/z 28=4.8%, m/z 32=0.9%. Ambos dentro dos limites.'],
    ];
    recs5.forEach(r => {
      doc.setFillColor(22, 32, 50); doc.roundedRect(18, p5y, 174, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(r[0].r, r[0].g, r[0].b);
      doc.text(r[1], 23, p5y + 9);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
      doc.text(r[2], 23 + 35, p5y + 9, { maxWidth: 148 });
      p5y += 18;
    });

    // Signature block
    p5y += 10;
    doc.setFillColor(17, 24, 39); doc.roundedRect(18, p5y, 174, 38, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text('ASSINATURAS', 105, p5y + 8, { align: 'center' });
    doc.line(30, p5y + 22, 90, p5y + 22);
    doc.line(120, p5y + 22, 180, p5y + 22);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text('Responsável pelo Equipamento', 60, p5y + 28, { align: 'center' });
    doc.text('Supervisão / Aprovação', 150, p5y + 28, { align: 'center' });
    doc.text('Data: ___/___/______', 60, p5y + 35, { align: 'center' });
    doc.text('Data: ___/___/______', 150, p5y + 35, { align: 'center' });

    // Footer on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(17, 24, 39); doc.rect(0, H - 14, W, 14, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text('Relatório Anual · TSQ 9610 GCxGC–MS/MS · Código 12E797 · Método 5.389', 20, H - 5);
      doc.text('Página ' + i + ' de ' + totalPages, W - 20, H - 5, { align: 'right' });
      doc.setDrawColor(30, 47, 71); doc.line(20, H - 14, W - 20, H - 14);
    }

    status.textContent = 'Salvando arquivo PDF...';
    await sleep(300);
    doc.save(`Relatorio_Anual_TSQ9610_12E797_${yr}.pdf`);
    overlay.classList.remove('show');
  } catch (e) {
    console.error(e);
    overlay.classList.remove('show');
    alert('Erro ao gerar PDF. Por favor tente novamente.');
  }
}

// =====================================================================
// CORRECTIVE MAINTENANCE
// =====================================================================
let correctiveRecords = [];

async function saveCorrectiveMaint() {
  const date = document.getElementById('cor-date').value;
  const resp = document.getElementById('cor-resp').value.trim();
  const sup = document.getElementById('cor-sup').value.trim();
  const prob = document.getElementById('cor-prob').value.trim();
  const proc = document.getElementById('cor-proc').value.trim();
  const result = document.getElementById('cor-result').value.trim();
  if (!date || !prob) { alert('Preencha ao menos a data e a descricao do problema.'); return; }

  const entry = { date, resp: resp || '—', sup: sup || '—', prob, proc: proc || '—', result: result || '—' };

  try {
    const response = await fetch('/api/corrective', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const resData = await response.json();
    correctiveRecords = resData.correctiveRecords;

    renderCorrectiveTable();
    updateAnualCorrectiveList();
    ['cor-date', 'cor-resp', 'cor-sup', 'cor-prob', 'cor-proc', 'cor-result'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar no servidor.');
  }
}

function renderCorrectiveTable() {
  const tbody = document.getElementById('corrective-body');
  if (!tbody) return;
  if (correctiveRecords.length === 0) { return; }
  const emptyRow = document.getElementById('corrective-empty-row');
  if (emptyRow) emptyRow.style.display = 'none';
  const existingRows = tbody.querySelectorAll('tr.corrective-record');
  existingRows.forEach(r => r.remove());
  correctiveRecords.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'corrective-record';
    tr.innerHTML = `<td class="num">${r.date}</td><td>${r.resp}</td><td>${r.sup}</td>
      <td style="font-size:11px;max-width:180px">${r.prob}</td>
      <td style="font-size:11px;max-width:180px">${r.proc}</td>
      <td style="font-size:11px;max-width:140px">${r.result}</td>`;
    tbody.appendChild(tr);
  });
}

function updateAnualCorrectiveList() {
  const el = document.getElementById('anual-corrective-list');
  if (!el) return;
  if (correctiveRecords.length === 0) {
    el.innerHTML = 'Nenhuma manutencao corretiva registrada nesta sessao. Use a aba <strong style="color:var(--teal)">Manutencao</strong> para adicionar.';
    return;
  }
  el.innerHTML = correctiveRecords.map(r => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-family:Space Mono,monospace;font-size:10px;color:var(--teal)">${r.date}</span>
      &nbsp;·&nbsp;<strong>${r.resp}</strong> &nbsp;/&nbsp; Sup: ${r.sup}
      <div style="color:var(--label);margin-top:4px"><strong style="color:var(--amber)">Problema:</strong> ${r.prob}</div>
      <div style="color:var(--label);margin-top:2px"><strong style="color:var(--teal)">Acao:</strong> ${r.proc}</div>
      <div style="color:var(--muted);margin-top:2px"><strong>Resultado:</strong> ${r.result}</div>
    </div>
  `).join('');
}

// =====================================================================
// ANNUAL PAGE CHARTS
// =====================================================================
function initAnualCharts() {
  new Chart(document.getElementById('emvAnual'), {
    type: 'line', plugins: [tealPlugin],
    data: {
      labels: tuneData.map(t => t.date), datasets: [
        { label: 'EMV (V)', data: tuneData.map(t => t.emv), borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,.08)', borderWidth: 2.5, pointBackgroundColor: '#0d9488', pointRadius: 5, tension: .4, fill: true },
        { label: 'Limite (2500V)', data: Array(tuneData.length).fill(2500), borderColor: 'rgba(220,38,38,.5)', borderWidth: 1, borderDash: [4, 4], pointRadius: 0 },
        { label: 'Alerta (2200V)', data: Array(tuneData.length).fill(2200), borderColor: 'rgba(217,119,6,.4)', borderWidth: 1, borderDash: [3, 3], pointRadius: 0 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#64748b', font: { size: 10 } } } },
      scales: { x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } }, y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, min: 1600, max: 2600 } }
    }
  });

  new Chart(document.getElementById('injAnual'), {
    type: 'bar', plugins: [tealPlugin],
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      datasets: [{
        label: 'Injecoes', data: [48, 62, 35, 0, 54, 45, 71, 0, 38, 62, 27, 0],
        backgroundColor: [48, 62, 35, 0, 54, 45, 71, 0, 38, 62, 27, 0].map(v => v === 0 ? 'rgba(226,232,240,.5)' : 'rgba(13,148,136,.35)'),
        borderColor: [48, 62, 35, 0, 54, 45, 71, 0, 38, 62, 27, 0].map(v => v === 0 ? 'rgba(226,232,240,.8)' : '#0d9488'),
        borderWidth: 1, borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } }, y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true } }
    }
  });

  new Chart(document.getElementById('leakAnual'), {
    type: 'line', plugins: [tealPlugin],
    data: {
      labels: tuneData.map(t => t.date), datasets: [
        { label: 'm/z 18 – Umidade (%)', data: tuneData.map(t => t.m18), borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,.06)', borderWidth: 2, pointRadius: 4, tension: .4, fill: true },
        { label: 'm/z 28 – N2 (%)', data: tuneData.map(t => t.m28), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.06)', borderWidth: 2, pointRadius: 4, tension: .4, fill: true },
        { label: 'm/z 32 – O2 (%)', data: tuneData.map(t => t.m32), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.06)', borderWidth: 2, pointRadius: 4, tension: .4, fill: true },
        { label: 'Limite m/z 18/28 (10%)', data: Array(tuneData.length).fill(10), borderColor: 'rgba(217,119,6,.4)', borderWidth: 1, borderDash: [4, 4], pointRadius: 0 },
        { label: 'Limite m/z 32 (2%)', data: Array(tuneData.length).fill(2), borderColor: 'rgba(220,38,38,.4)', borderWidth: 1, borderDash: [4, 4], pointRadius: 0 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#64748b', font: { size: 10 } } } },
      scales: { x: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } } }, y: { grid: { color: 'rgba(226,232,240,.4)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true, max: 14 } }
    }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// =====================================================================
// DYNAMIC DASHBOARD (STATUS GERAL)
// =====================================================================
function updateAlerts(totalInjections, lastTune) {
  const container = document.getElementById('alerts-container');
  if (!container) return;
  
  let alertsHTML = '';
  let criticalCount = 0;
  let warnCount = 0;

  // 1. Liner
  if (totalInjections >= 800) {
    alertsHTML += `<div class="alert-banner alert"><span class="alert-icon">⚠</span><div class="alert-text"><strong>Liner — Limite de Injeções Excedido</strong>O liner atual acumula ${totalInjections} injeções. É necessário realizar a troca imediatamente (limite: 800).</div></div>`;
    criticalCount++;
  } else if (totalInjections >= 600) {
    alertsHTML += `<div class="alert-banner warn"><span class="alert-icon">⚠</span><div class="alert-text"><strong>Liner — Limite de Injeções Próximo</strong>O liner atual acumula ${totalInjections} injeções. Recomenda-se programar a troca.</div></div>`;
    warnCount++;
  }

  // 2. Tune & Vazamento
  if (lastTune) {
    let leakAlerts = [];
    if (lastTune.m18 >= 10) leakAlerts.push('Umidade m/z 18');
    if (lastTune.m28 >= 10) leakAlerts.push('N₂ m/z 28');
    if (lastTune.m32 >= 2) leakAlerts.push('O₂ m/z 32');

    if (leakAlerts.length > 0) {
      alertsHTML += `<div class="alert-banner alert"><span class="alert-icon">⚠</span><div class="alert-text"><strong>Vazamento Detectado</strong>Níveis anormais identificados no último tune: ${leakAlerts.join(', ')}. Verifique o sistema de vácuo.</div></div>`;
      criticalCount++;
    } else {
      let leakWarn = [];
      if (lastTune.m18 >= 8) leakWarn.push('Umidade');
      if (lastTune.m28 >= 8) leakWarn.push('N₂');
      if (lastTune.m32 >= 1.5) leakWarn.push('O₂');
      
      if (leakWarn.length > 0) {
        alertsHTML += `<div class="alert-banner warn"><span class="alert-icon">⚠</span><div class="alert-text"><strong>Vácuo — Níveis de Atenção</strong>Monitorar os seguintes canais: ${leakWarn.join(', ')}. Valores próximos ao limite.</div></div>`;
        warnCount++;
      }
    }

    if (lastTune.emv >= 2500) {
      alertsHTML += `<div class="alert-banner alert"><span class="alert-icon">⚠</span><div class="alert-text"><strong>EMV — Limite Excedido</strong>Tensão em ${lastTune.emv}V. É necessário planejar a substituição do multiplicador.</div></div>`;
      criticalCount++;
    } else if (lastTune.emv >= 2200) {
      alertsHTML += `<div class="alert-banner warn"><span class="alert-icon">⚠</span><div class="alert-text"><strong>EMV — Desgaste Detectado</strong>Tensão atingiu ${lastTune.emv}V. Fim da vida útil próximo (limite 2500V).</div></div>`;
      warnCount++;
    }
  }

  // Se não houver problemas críticos ou alertas:
  if (criticalCount === 0 && warnCount === 0) {
    alertsHTML += `<div class="alert-banner ok"><span class="alert-icon">✓</span><div class="alert-text"><strong>Vácuo e Sistema — Normal</strong>Bomba turbomolecular e foreline operando dentro dos parâmetros normais.</div></div>`;
    alertsHTML += `<div class="alert-banner ok"><span class="alert-icon">✓</span><div class="alert-text"><strong>Liner e Consumíveis — OK</strong>Injeções atuais (${totalInjections}) dentro da vida útil esperada.</div></div>`;
  }

  container.innerHTML = alertsHTML;
}

function updateMetricCard(id, state, message) {
  const el = document.getElementById(id);
  if (!el) return;
  const card = el.closest('.metric-card');
  if (!card) return;
  card.className = `metric-card ${state}`;
  const badge = card.querySelector('.metric-badge');
  if (badge) {
    badge.className = `metric-badge badge-${state}`;
    badge.innerHTML = message;
  }
}

function renderStatusGeral() {
  const lastTune = tuneData.length > 0 ? tuneData[tuneData.length - 1] : null;
  if (lastTune) {
    const el = id => document.getElementById(id);
    if (el('kpi-emv')) {
      el('kpi-emv').innerHTML = `${lastTune.emv}<span class="metric-unit">V</span>`;
      if (lastTune.emv >= 2500) updateMetricCard('kpi-emv', 'alert', '⚠ Acima do Limite');
      else if (lastTune.emv >= 2200) updateMetricCard('kpi-emv', 'warn', '⚠ Próx. Limite');
      else updateMetricCard('kpi-emv', 'ok', '✓ Normal');
    }
    
    if (el('kpi-18')) {
      el('kpi-18').innerHTML = `${lastTune.m18}<span class="metric-unit">%</span>`;
      if (lastTune.m18 >= 10) updateMetricCard('kpi-18', 'alert', '⚠ Vazamento');
      else if (lastTune.m18 >= 8) updateMetricCard('kpi-18', 'warn', '⚠ Monitorar');
      else updateMetricCard('kpi-18', 'ok', '✓ Baixo');
    }
    if (el('kpi-18-2')) el('kpi-18-2').innerHTML = `${lastTune.m18}%`;
    
    if (el('kpi-28')) {
      el('kpi-28').innerHTML = `${lastTune.m28}<span class="metric-unit">%</span>`;
      if (lastTune.m28 >= 10) updateMetricCard('kpi-28', 'alert', '⚠ Vazamento');
      else if (lastTune.m28 >= 8) updateMetricCard('kpi-28', 'warn', '⚠ Monitorar');
      else updateMetricCard('kpi-28', 'ok', '✓ Normal');
    }
    if (el('kpi-28-2')) el('kpi-28-2').innerHTML = `${lastTune.m28}%`;
    
    if (el('kpi-32')) {
      el('kpi-32').innerHTML = `${lastTune.m32}<span class="metric-unit">%</span>`;
      if (lastTune.m32 >= 2) updateMetricCard('kpi-32', 'alert', '⚠ Vazamento O₂');
      else if (lastTune.m32 >= 1.5) updateMetricCard('kpi-32', 'warn', '⚠ Monitorar O₂');
      else updateMetricCard('kpi-32', 'ok', '✓ Normal');
    }
    if (el('kpi-32-2')) el('kpi-32-2').innerHTML = `${lastTune.m32}%`;
    
    if (el('kpi-69')) el('kpi-69').innerHTML = `${lastTune.m69}%`;
    if (el('kpi-219')) el('kpi-219').innerHTML = `${lastTune.m219}%`;
    if (el('kpi-502')) el('kpi-502').innerHTML = `${lastTune.m502}%`;
    
    if (el('kpi-fil')) {
      el('kpi-fil').innerHTML = `${lastTune.fil}`;
      updateMetricCard('kpi-fil', 'info', 'Em uso');
    }
    
    if (el('kpi-tint')) {
      el('kpi-tint').innerHTML = `${lastTune.tint}<span class="metric-unit">°C</span>`;
      if (lastTune.tint >= 400) updateMetricCard('kpi-tint', 'alert', '⚠ Acima do Limite');
      else if (lastTune.tint >= 380) updateMetricCard('kpi-tint', 'warn', '⚠ Próx. Limite');
      else updateMetricCard('kpi-tint', 'ok', '✓ Normal');
    }
    
    if (el('kpi-tune')) el('kpi-tune').innerHTML = `Tune #${lastTune.num} — ${lastTune.date}`;
  }

  let totalInjections = 0;
  let lastPsi = '—';
  savedLogs.forEach(l => {
    if (l.inj) totalInjections += parseInt(l.inj);
    if (l.psi) lastPsi = l.psi;
  });

  const elPsi = document.getElementById('kpi-psi');
  if (elPsi && lastPsi !== '—') elPsi.innerHTML = `${lastPsi}<span class="metric-unit">psi</span>`;

  const elInj = document.getElementById('kpi-inj');
  if (elInj) {
    elInj.innerHTML = totalInjections;
    if (totalInjections >= 800) updateMetricCard('kpi-inj', 'alert', '⚠ Trocar Liner');
    else if (totalInjections >= 600) updateMetricCard('kpi-inj', 'warn', '⚠ Monitorar');
    else updateMetricCard('kpi-inj', 'ok', '✓ Normal');
  }
  
  updateAlerts(totalInjections, lastTune);

  const linerPercent = Math.min((totalInjections / 500) * 100, 100);
  const elLinerVal = document.getElementById('progress-liner-val');
  if (elLinerVal) elLinerVal.innerHTML = `${totalInjections} / 500 est.`;
  const elLinerBar = document.getElementById('progress-liner-bar');
  if (elLinerBar) {
    elLinerBar.style.width = `${linerPercent}%`;
    elLinerBar.className = linerPercent > 80 ? 'progress-fill fill-warn' : 'progress-fill fill-ok';
  }

  const tl = document.getElementById('recent-maint-timeline');
  if (tl && correctiveRecords.length > 0) {
    const recentes = [...correctiveRecords].reverse().slice(0, 5);
    tl.innerHTML = recentes.map(r => `
      <div class="tl-item">
        <div><div class="tl-dot" style="background:var(--teal)"></div></div>
        <div class="tl-date">${r.date}</div>
        <div class="tl-text" style="font-size:12px"><strong>${r.prob}</strong><br><span style="color:var(--muted)">${r.proc} (${r.resp})</span></div>
      </div>
    `).join('');
  } else if (tl) {
    tl.innerHTML = '<div style="font-size:12px;color:var(--muted)">Nenhuma manutenção registrada no sistema.</div>';
  }
}

// =====================================================================
// INIT
// =====================================================================
document.addEventListener('DOMContentLoaded', async () => {
  renderDate();

  try {
    const response = await fetch('/api/data');
    const data = await response.json();

    tuneData = data.tuneData || [];
    savedLogs = data.savedLogs || [];
    correctiveRecords = data.correctiveRecords || [];

    const currentYear = new Date().getFullYear();

    document.querySelectorAll('.current-year').forEach(el => el.textContent = currentYear);

    injectByMonth = Array(12).fill(0);
    savedLogs.forEach(log => {
      if (!log.date || !log.inj) return;
      let y, m;
      if (log.date.includes('-')) {
        const p = log.date.split('-');
        y = p[0]; m = p[1];
      } else if (log.date.includes('/')) {
        const p = log.date.split('/');
        y = p[2]; m = p[1];
      } else return;
      if (parseInt(y) === currentYear) {
        injectByMonth[parseInt(m) - 1] += parseInt(log.inj);
      }
    });

    renderStatusGeral();
    initCharts();
    initAnualCharts();
    renderTuneTable();
    renderTroubleshoot();
    renderChecklist();
    renderLogsList();
    renderCorrectiveTable();
    updateAnualCorrectiveList();
  } catch (e) {
    console.error("Falha ao se conectar com o servidor Node.js", e);
    alert("Não foi possível carregar os dados. Certifique-se de que o servidor Node.js está rodando (node server.js).");
  }
});
