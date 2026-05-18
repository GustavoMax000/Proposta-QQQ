// =====================================================================
// DATA
// =====================================================================
let tuneData = [];
let injectByMonth = [];
let columns = [];
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
// TUNE TABLE WITH SEARCH & PAGINATION
// =====================================================================
let tuneCurrentPage = 1;

function renderTuneTable() {
  const tbody = document.getElementById('tune-table-body');
  if (!tbody) return;

  // 1. Sort descending by num (or Nº Tune)
  let sorted = [...tuneData].sort((a, b) => b.num - a.num);

  // 2. Filter by search query (date)
  const query = (document.getElementById('tune-search-date')?.value || '').trim().toLowerCase();
  if (query) {
    sorted = sorted.filter(t => t.date.toLowerCase().includes(query));
  }

  // 3. Pagination limits
  const totalItems = sorted.length;
  const itemsPerPage = 15;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (tuneCurrentPage > totalPages) {
    tuneCurrentPage = totalPages;
  }
  if (tuneCurrentPage < 1) {
    tuneCurrentPage = 1;
  }

  const startIndex = (tuneCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedItems = sorted.slice(startIndex, endIndex);

  // 4. Render rows
  if (paginatedItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; color:var(--muted); padding:20px;">Nenhum registro de Tune localizado para a busca.</td></tr>`;
  } else {
    tbody.innerHTML = paginatedItems.map(t => {
      const emvClass = t.emv > 2200 ? 'alert' : t.emv > 1800 ? 'warn' : 'ok';
      const m18Class = t.m18 > 10 ? 'alert' : t.m18 > 7 ? 'warn' : 'ok';
      const m28Class = t.m28 > 10 ? 'alert' : t.m28 > 7 ? 'warn' : 'ok';
      const m32Class = t.m32 > 2 ? 'alert' : t.m32 > 1.5 ? 'warn' : 'ok';
      
      // Status dinâmico
      let statusClass = 'badge-ok';
      let statusLabel = 'OK';
      if (emvClass === 'alert' || m18Class === 'alert' || m28Class === 'alert' || m32Class === 'alert') {
        statusClass = 'badge-alert';
        statusLabel = 'CRÍTICO';
      } else if (emvClass === 'warn' || m18Class === 'warn' || m28Class === 'warn' || m32Class === 'warn') {
        statusClass = 'badge-warn';
        statusLabel = 'ATENÇÃO';
      }

      return `<tr style="cursor:pointer" onclick="openTuneDetailModal(${t.num})">
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
        <td><span class="metric-badge ${statusClass}">${statusLabel}</span></td>
      </tr>`;
    }).join('');
  }

  // 5. Render Pagination Controls
  const pagDiv = document.getElementById('tune-pagination');
  if (!pagDiv) return;

  if (totalPages <= 1) {
    pagDiv.innerHTML = '';
    return;
  }

  let pagHTML = '';
  
  // Previous button
  if (tuneCurrentPage > 1) {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px;" onclick="changeTunePage(${tuneCurrentPage - 1})">◀ Anterior</button>`;
  } else {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px; opacity:0.4; cursor:not-allowed;" disabled>◀ Anterior</button>`;
  }

  // Page Numbers (Google Style)
  for (let i = 1; i <= totalPages; i++) {
    if (i === tuneCurrentPage) {
      pagHTML += `<button class="btn btn-primary" style="padding:4px 10px; font-size:11px; min-width:30px;">${i}</button>`;
    } else {
      pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px; min-width:30px;" onclick="changeTunePage(${i})">${i}</button>`;
    }
  }

  // Next button
  if (tuneCurrentPage < totalPages) {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px;" onclick="changeTunePage(${tuneCurrentPage + 1})">Próximo ▶</button>`;
  } else {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px; opacity:0.4; cursor:not-allowed;" disabled>Próximo ▶</button>`;
  }

  pagDiv.innerHTML = pagHTML;
}

function changeTunePage(page) {
  tuneCurrentPage = page;
  renderTuneTable();
}

function onTuneSearchInput() {
  tuneCurrentPage = 1; // Reset to page 1 on new search
  renderTuneTable();
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
      ${l.col_model ? '<span style="color:var(--blue)">' + l.col_model + '</span> · ' : ''}
      <span style="color:var(--muted)">${l.obs || 'Sem obs.'}</span>
    </div>
  `).join('');
}

async function saveLog() {
  const date = document.getElementById('log-date').value;
  const op = document.getElementById('log-op').value.trim();
  const temp = document.getElementById('log-temp').value.trim();
  const sistema = document.getElementById('log-sistema').value;
  
  if (!op) { alert('O campo Operador (iniciais) é obrigatório.'); return; }
  if (!temp) { alert('O campo Temperatura Ambiente (Tamb) é obrigatório.'); return; }
  if (!sistema) { alert('O campo Sistema é obrigatório.'); return; }

  const psi = document.getElementById('log-psi').value;
  const inj = document.getElementById('log-inj').value;
  const obs = document.getElementById('log-obs').value;
  
  // Novos campos
  const he = document.getElementById('log-he').value;
  const limpinj = document.getElementById('log-limpinj').value;
  const septo = document.getElementById('log-septo').value;
  const liner = document.getElementById('log-liner').value;
  const col_model = document.getElementById('log-col-model').value;
  const corte = document.getElementById('log-corte').value || 0;
  const trpi = document.getElementById('log-trpi').value || 0;
  const limpfonte = document.getElementById('log-limpfonte').value;

  if (!date) { alert('Preencha a data do registro.'); return; }
  
  const entry = { 
    date, op, psi, inj, obs, 
    sistema, he, limpinj, septo, liner, col_model, corte, trpi, limpfonte,
    tamb: parseFloat(temp)
  };
  
  const tuneNum = document.getElementById('log-tunenum').value;
  const emvVal = document.getElementById('log-emv').value;
  const filVal = document.getElementById('log-fil').value;
  const hasTune = tuneNum && (emvVal || filVal);

  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const result = await response.json();
    savedLogs = result.savedLogs;
    renderLogsList();

    if (hasTune) {
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
    ['log-op', 'log-psi', 'log-obs', 'log-corte', 'log-trpi', 'log-emv', 'log-18', 'log-28', 'log-32', 'log-69', 'log-219', 'log-502', 'log-tinterf', 'log-col-model'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    ['log-sistema', 'log-he', 'log-limpinj', 'log-septo', 'log-liner', 'log-col', 'log-limpfonte', 'log-fil'].forEach(id => {
      const el = document.getElementById(id); if (el) el.selectedIndex = 0;
    });
    
    // Atualiza o dashboard para refletir as mudanças (ex: contador de injeções)
    renderStatusGeral();
    renderMaintenanceSchedule();
    renderColumnHistory();
    
    // Atualiza campos autoincrementados
    updateAutoIncrementedFields();
    
    alert('Registro salvo com sucesso!');
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

    // ── Light-theme color palette (mirrors CSS :root variables) ──────────
    const hex2rgb = hex => ({ r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) });
    // Primary
    const teal    = hex2rgb('#0d9488'); // --teal
    const tealDim = hex2rgb('#0f766e'); // --teal-dim
    // State colors
    const amber   = hex2rgb('#d97706'); // --amber
    const red     = hex2rgb('#dc2626'); // --red
    const green   = hex2rgb('#059669'); // --green
    const blue    = hex2rgb('#2563eb'); // --blue
    // Backgrounds
    const bgPage  = [248, 250, 252]; // --bg  #f8fafc
    const bgCard  = [255, 255, 255]; // --bg2 #ffffff
    const bgAlt   = [241, 245, 249]; // --bg3 #f1f5f9
    const bgHead  = [240, 253, 250]; // teal-tinted header strip
    // Text
    const txtMain = [15,  23,  42];  // --text  #0f172a
    const txtMuted= [100, 116, 139]; // --muted #64748b
    const txtLabel= [71,  85, 105];  // --label #475569
    // Border
    const borderC = [226, 232, 240]; // --border #e2e8f0

    // ---- PAGE 1: COVER ----
    status.textContent = 'Gerando capa do relatório...';
    await sleep(200);
    // Page background
    doc.setFillColor(...bgPage); doc.rect(0, 0, W, H, 'F');
    // Header strip — teal gradient simulation
    doc.setFillColor(teal.r, teal.g, teal.b); doc.rect(0, 0, W, 52, 'F');
    // Subtle accent bar below header
    doc.setFillColor(tealDim.r, tealDim.g, tealDim.b); doc.rect(0, 52, W, 3, 'F');

    // Title block — white text over teal header
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO ANUAL DE ACOMPANHAMENTO DE EQUIPAMENTO', 105, 18, { align: 'center' });
    doc.text('MÉTODO 5.389 · TRIAGEM IX · CÓD. EQUIP. 12E797', 105, 25, { align: 'center' });
    doc.setFontSize(26); doc.setTextColor(255, 255, 255);
    doc.text('TSQ 9610 GCxGC–MS/MS', 105, 40, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 250, 229);
    doc.text('Thermo Scientific · Triple Quadrupole GC-MS · Ionização EI', 105, 49, { align: 'center' });

    // Summary KPIs — computed from real data
    const yr = new Date().getFullYear();
    const toISO = s => {
      if (!s) return '';
      s = s.trim();
      if (s.includes('/')) { const p = s.split('/'); return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; }
      return s;
    };
    const tunesYr = tuneData.filter(t => toISO(t.date).startsWith(String(yr)));
    const logsYr  = savedLogs.filter(l => toISO(l.date).startsWith(String(yr)));
    const corrYr  = correctiveRecords.filter(r => toISO(r.date).startsWith(String(yr)));

    const totalInj  = logsYr.reduce((s,l) => s + (parseInt(l.inj)||0), 0);
    const limpFonte = logsYr.filter(l => l.limpfonte === 'SIM').length;
    const lastTune  = tunesYr.length > 0 ? tunesYr[tunesYr.length - 1] : null;
    const lastEMV   = lastTune ? lastTune.emv : '—';
    const emvStatus = lastTune && lastTune.emv > 2200 ? 'alert' : lastTune && lastTune.emv > 1800 ? 'warn' : 'ok';

    // Year badge
    doc.setFillColor(teal.r, teal.g, teal.b); doc.roundedRect(75, 60, 60, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text('Ano de Referência: ' + yr, 105, 69, { align: 'center' });

    // Info table (equipment static data)
    const infoY = 82;
    const rows = [
      ['Equipamento', 'TSQ 9610 GCxGC–MS/MS'], ['Código', '12E797'],
      ['Fabricante', 'Thermo Fisher Scientific'], ['Método', '5.389 · Triagem IX'],
      ['Gás de Arraste', 'Hélio (He) — Grau Ultra-Puro'], ['Filamentos', 'Duplo (1 e 2)'],
      ['Software', 'TSQ Series 5.0 ou superior'], ['Calibrante', 'PFTBA'],
      ['Documento', 'TSQ 9610 Hardware Manual Rev. B · Jul 2024'],
      ['Data do relatório', new Date().toLocaleDateString('pt-BR')],
    ];
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('IDENTIFICAÇÃO DO EQUIPAMENTO', 20, infoY);
    doc.setDrawColor(...borderC); doc.setLineWidth(.4); doc.line(20, infoY + 2, 190, infoY + 2);
    rows.forEach((r, i) => {
      const y = infoY + 10 + i * 8;
      if (i % 2 === 0) { doc.setFillColor(241,245,249); } else { doc.setFillColor(255,255,255); }
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...txtMuted);
      doc.text(r[0], 24, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMain);
      doc.text(r[1], 90, y);
    });

    const sumY = infoY + 100;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('RESUMO OPERACIONAL ' + yr, 20, sumY);
    doc.setDrawColor(...borderC); doc.line(20, sumY + 2, 190, sumY + 2);

    const kpiColor = (st) => st === 'ok' ? green : st === 'warn' ? amber : red;
    const kpis = [
      [String(tunesYr.length), 'Tunes Realizados', 'ok'],
      [String(totalInj), 'Total de Injeções', 'ok'],
      [String(limpFonte), 'Limpezas da Fonte', limpFonte === 0 ? 'warn' : 'ok'],
      [String(lastEMV) + (lastTune ? ' V' : ''), 'Último EMV', emvStatus],
      [String(corrYr.length), 'Manutenções Corretivas', corrYr.length > 0 ? 'alert' : 'ok'],
      [String(logsYr.length), 'Dias Registrados', 'ok'],
    ];
    kpis.forEach((k, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = 20 + col * 60, by = sumY + 8 + row * 22;
      const clr = kpiColor(k[2]);
      doc.setFillColor(...bgCard); doc.roundedRect(bx, by, 55, 18, 2, 2, 'F');
      doc.setDrawColor(clr.r, clr.g, clr.b); doc.setLineWidth(.6); doc.roundedRect(bx, by, 55, 18, 2, 2, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(clr.r, clr.g, clr.b);
      doc.text(k[0], bx + 27.5, by + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
      doc.text(k[1], bx + 27.5, by + 16.5, { align: 'center' });
    });

    // ---- PAGE 2: TUNE DATA ----
    status.textContent = 'Compilando histórico de tune...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(11, 15, 26); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(...txtMuted); doc.text('HISTÓRICO DE TUNE', 190, 10, { align: 'right' });

    doc.setFontSize(14); doc.setTextColor(...txtMain);
    doc.text('Histórico de Tune — Parâmetros Registrados', 20, 28);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
    doc.text('Calibrante PFTBA · Ionização EI · ' + tunesYr.length + ' tunes realizados em ' + yr, 20, 34);

    // Table — only current year tunes
    const th = ['Tune', 'Data', 'Operador', 'Fil', 'EMV(V)', 'T.Int(°C)', 'm/z69', 'm/z219', 'm/z502', 'm/z18', 'm/z28', 'm/z32'];
    const cols = [15, 22, 26, 12, 16, 16, 12, 16, 16, 12, 12, 12];
    let tx = 12, ty = 44;
    doc.setFillColor(241,245,249); doc.rect(10, ty - 6, 190, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(teal.r, teal.g, teal.b);
    let cx = tx;
    th.forEach((h, i) => { doc.text(h, cx, ty); cx += cols[i]; });
    tunesYr.forEach((t, ri) => {
      ty += 10;
      doc.setFillColor(ri%2===0 ? 248:255, ri%2===0 ? 250:255, ri%2===0 ? 252:255); doc.rect(10, ty - 6, 190, 9, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      const row = ['#' + t.num, t.date, t.op, 'Fil.' + t.fil, '' + t.emv, '' + t.tint, '' + t.m69, '' + t.m219, '' + t.m502, '' + t.m18, '' + t.m28, '' + t.m32];
      cx = tx;
      row.forEach((val, i) => {
        let clr = [...txtMain];
        if (i === 4 && t.emv > 2200) clr = [amber.r,amber.g,amber.b];
        if (i === 9 && t.m18 > 7) clr = [amber.r,amber.g,amber.b];
        if (i === 10 && t.m28 > 7) clr = [amber.r,amber.g,amber.b];
        if (i === 11 && t.m32 > 1.5) clr = [red.r,red.g,red.b];
        doc.setTextColor(...clr);
        doc.text(val, cx, ty); cx += cols[i];
      });
    });
    ty += 18;
    // Legend
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('LIMITES DE REFERÊNCIA', 20, ty);
    doc.setDrawColor(...borderC); doc.line(20, ty + 2, 190, ty + 2);
    const limits = [
      'EMV — Faixa normal: 1200 a 2500 V. Acima de 2500 V: considerar substituição do electron multiplier.',
      'm/z 18 (umidade) — Limite: < 10% relativo ao m/z 69. Valores altos indicam contaminação da fonte ou vazamento.',
      'm/z 28 (N₂) — Limite: < 10% relativo ao m/z 69. Valores altos indicam vazamento de ar.',
      'm/z 32 (O₂) — Limite: < 2% relativo ao m/z 69. Valores acima deste limite deterioram filamento e detector.',
      'm/z 219 e m/z 502 — Rastreiam a qualidade do tune com o calibrante PFTBA.',
    ];
    limits.forEach((l, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
      doc.text('•  ' + l, 20, ty + 10 + i * 8, { maxWidth: 170 });
    });

    // ---- PAGE 3: MAINTENANCE ----
    status.textContent = 'Gerando plano de manutenção...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(248,250,252); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(teal.r,teal.g,teal.b); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(...txtMuted); doc.text('MANUTENÇÃO PREVENTIVA', 190, 10, { align: 'right' });
    doc.setFontSize(14); doc.setTextColor(...txtMain);
    doc.text('Manutenção Preventiva — Plano e Execução', 20, 28);

    // Build maintenance items dynamically from real savedLogs data
    const lastOf = (field) => { const l = [...logsYr].reverse().find(x => x[field] === 'SIM'); return l ? l.date : 'Não registrado'; };
    const septoCnt = logsYr.reduce((s,l) => s + (parseInt(l.inj)||0), 0);
    const totalCuts = logsYr.reduce((s,l) => s + (parseFloat(l.corte)||0), 0);
    const lastSep = lastOf('septo'); const lastLin = lastOf('liner'); const lastFon = lastOf('limpfonte'); const lastHe = lastOf('he');
    const lastTuneDate = tunesYr.length > 0 ? tunesYr[tunesYr.length-1].date : 'Não registrado';
    const maintItems = [
      ['Troca de Septo', '100–200 injeções', lastSep, lastSep === 'Não registrado' ? 'ATENÇÃO' : 'OK', lastSep !== 'Não registrado' ? 'Última troca: ' + lastSep : 'Nenhum registro de troca de septo no ano.'],
      ['Troca de Liner', '400–800 injeções', lastLin, septoCnt > 600 ? 'MONITORAR' : 'OK', septoCnt + ' injeções acumuladas no ano. Limite recomendado: 600.'],
      ['Corte de Coluna', 'Por necessidade', totalCuts > 0 ? logsYr.filter(l=>parseFloat(l.corte)>0).slice(-1)[0]?.date || '—' : '—', 'OK', totalCuts > 0 ? totalCuts.toFixed(1) + ' cm total cortados em ' + yr + '.' : 'Nenhum corte registrado em ' + yr + '.'],
      ['Limpeza da Fonte de Íons', 'Trimestral / m/z18>10%', lastFon, lastFon === 'Não registrado' ? 'ATENÇÃO' : 'OK', lastFon !== 'Não registrado' ? 'Limpeza realizada em ' + lastFon + '.' : 'Nenhuma limpeza de fonte registrada em ' + yr + '.'],
      ['Troca Cilindro He', 'Por pressão', lastHe, lastHe === 'Não registrado' ? 'ATENÇÃO' : 'OK', lastHe !== 'Não registrado' ? 'Troca realizada em ' + lastHe + '.' : 'Nenhum registro de troca de He em ' + yr + '.'],
      ['Tune EI do Sistema', 'Semanal / pré-corrida', lastTuneDate, tunesYr.length === 0 ? 'ATENÇÃO' : 'OK', tunesYr.length + ' tunes realizados em ' + yr + '. Último: ' + lastTuneDate + '.'],
    ];
    let my = 40;
    doc.setFillColor(241,245,249); doc.rect(10, my, 190, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(teal.r,teal.g,teal.b);
    doc.text('COMPONENTE', 14, my + 6.5);
    doc.text('FREQUÊNCIA', 55, my + 6.5);
    doc.text('ÚLTIMA REALIZ.', 95, my + 6.5);
    doc.text('STATUS', 130, my + 6.5);
    doc.text('OBSERVAÇÕES', 150, my + 6.5);
    maintItems.forEach((m, i) => {
      my += 10;
      doc.setFillColor(248,250,252); doc.rect(10, my, 190, 20, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...txtMain);
      doc.text(m[0], 14, my + 5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtLabel);
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
    doc.setFillColor(248,250,252); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(teal.r,teal.g,teal.b); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(...txtMuted); doc.text('DIAGNÓSTICO E OCORRÊNCIAS', 190, 10, { align: 'right' });
    doc.setFontSize(14); doc.setTextColor(...txtMain);
    doc.text('Diagnósticos e Ocorrências — ' + yr, 20, 28);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
    doc.text('Baseado no TSQ 9610 Hardware Manual (1R120622-0003 Rev. B) e User Guide (1R120622-0002 Rev. B)', 20, 35);

    // Page 4 — Diagnostics with real data
    if (corrYr.length === 0) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129);
      doc.text('Sem ocorrencias de manutencao corretiva registradas para o ano de ' + yr + '.', 20, 48);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text('O sistema operou dentro dos parametros esperados. ' + tunesYr.length + ' tunes realizados. Total de ' + totalInj + ' injec. registradas.', 20, 56);
    } else {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(amber.r, amber.g, amber.b);
      doc.text(corrYr.length + ' ocorrencia(s) de manutencao corretiva registrada(s) em ' + yr + '.', 20, 48);
    }

    // Dynamic attention points derived from real data
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('PONTOS DE ATENCAO PARA ' + (yr + 1), 20, 78);
    doc.line(20, 80, 190, 80);
    const atencoes = [];
    if (septoCnt > 600) atencoes.push(['!', 'Liner com ' + septoCnt + ' injecoes acumuladas — substituir antes do proximo uso.', [amber.r, amber.g, amber.b]]);
    if (lastTune && lastTune.emv > 1800) atencoes.push(['i', 'EMV em ' + lastTune.emv + ' V (Tune #' + lastTune.num + '). Monitorar — limite: 2500 V.', [100, 116, 139]]);
    const lastM18 = lastTune ? lastTune.m18 : 0; const lastM32 = lastTune ? lastTune.m32 : 0;
    if (lastM18 > 7) atencoes.push(['!', 'm/z 18 = ' + lastM18 + '% no ultimo tune. Verificar umidade e fonte de ions.', [amber.r, amber.g, amber.b]]);
    if (lastM32 > 1.5) atencoes.push(['!', 'm/z 32 = ' + lastM32 + '% no ultimo tune — risco de dano ao filamento. Investigar vazamento imediatamente.', [red.r, red.g, red.b]]);
    if (limpFonte === 0) atencoes.push(['!', 'Nenhuma limpeza da fonte de ions registrada em ' + yr + '. Agendar para 1T/' + (yr+1) + '.', [amber.r, amber.g, amber.b]]);
    if (atencoes.length === 0) atencoes.push(['v', 'Sistema dentro dos parametros em ' + yr + '. Nenhum ponto critico detectado.', [16, 185, 129]]);
    let ay = 88;
    atencoes.forEach(a => {
      doc.setFillColor(248,250,252); doc.roundedRect(18, ay - 5, 174, 14, 2, 2, 'F');
      doc.setDrawColor(a[2][0],a[2][1],a[2][2]); doc.setLineWidth(.4); doc.roundedRect(18, ay - 5, 174, 14, 2, 2, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(a[2][0], a[2][1], a[2][2]);
      doc.text(a[0], 23, ay + 2.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...txtMuted);
      doc.text(a[1], 30, ay + 2.5, { maxWidth: 158 });
      ay += 18;
    });

    // ---- PAGE 5: ANNUAL SUMMARY + CORRECTIVE RECORDS ----
    status.textContent = 'Gerando resumo anual e registros corretivos...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(248,250,252); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(teal.r,teal.g,teal.b); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.setTextColor(255,255,255);
    doc.text('TSQ 9610 · 12E797 · RELATÓRIO ANUAL ' + yr, 20, 10);
    doc.setTextColor(...txtMuted); doc.text('ANÁLISE ANUAL E MANUTENÇÕES CORRETIVAS', 190, 10, { align: 'right' });
    doc.setFontSize(14); doc.setTextColor(...txtMain);
    doc.text('Análise Anual — Manutenções Corretivas e Recomendações ' + (yr + 1), 20, 28);

    // Corrective records
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('MANUTENÇÕES CORRETIVAS REGISTRADAS', 20, 42);
    doc.setDrawColor(30, 47, 71); doc.line(20, 44, 190, 44);

    let p5y = 50;
    if (corrYr.length === 0) {
      doc.setFillColor(241,245,249); doc.roundedRect(18, p5y, 174, 16, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(green.r, green.g, green.b);
      doc.text('Nenhuma manutencao corretiva registrada em ' + yr + '. Sistema sem falhas criticas.', 24, p5y + 10, { maxWidth: 162 });
      p5y += 24;
    } else {
      corrYr.forEach((r, i) => {
        doc.setFillColor(248,250,252); doc.roundedRect(18, p5y, 174, 30, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(amber.r, amber.g, amber.b);
        doc.text(r.date + ' — ' + r.resp + ' | Supervisão: ' + r.sup, 22, p5y + 8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...txtMain);
        doc.text('Problema: ', 22, p5y + 15);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
        doc.text(r.prob, 44, p5y + 15, { maxWidth: 148 });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r,teal.g,teal.b);
        doc.text('Ação: ', 22, p5y + 22);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
        doc.text(r.proc, 36, p5y + 22, { maxWidth: 154 });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...txtLabel);
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
    // Recommendations — generated from real user data
    const recs5 = [];
    if (septoCnt > 600) recs5.push([amber, 'URGENTE', 'Substituir liner — ' + septoCnt + ' injecoes acumuladas em ' + yr + '. Limite recomendado: 600.']);
    else recs5.push([green, 'MONITORAR', 'Liner com ' + septoCnt + ' injecoes em ' + yr + '. Dentro do limite normal.']);
    if (limpFonte === 0) recs5.push([amber, 'PLANEJAR', 'Agendar limpeza da fonte de ions para 1T/' + (yr+1) + ' — nenhuma realizada em ' + yr + '.']);
    else recs5.push([green, 'INFORMATIVO', limpFonte + ' limpeza(s) da fonte de ions realizada(s) em ' + yr + '.']);
    if (lastTune) {
      const emvTrend = tunesYr.length > 1 ? tunesYr[tunesYr.length-1].emv - tunesYr[0].emv : 0;
      recs5.push([lastTune.emv > 2200 ? amber : green, 'MONITORAR', 'EMV atual: ' + lastTune.emv + 'V. Variacao no ano: +' + emvTrend + 'V. Limite de acao: 2500V.']);
      const vac = 'm/z 28=' + lastTune.m28 + '%, m/z 32=' + lastTune.m32 + '%';
      recs5.push([(lastTune.m28 > 7 || lastTune.m32 > 1.5) ? amber : green, 'VACUO', 'Ultimo tune: ' + vac + '. ' + ((lastTune.m28 <= 7 && lastTune.m32 <= 1.5) ? 'Dentro dos limites.' : 'Verificar vazamento!')]);
    }
    if (corrYr.length > 0) recs5.push([amber, 'CORRETIVA', corrYr.length + ' manut. corretiva(s) registrada(s) em ' + yr + '. Revisar causas raiz para ' + (yr+1) + '.']);
    else recs5.push([green, 'INFORMATIVO', 'Nenhuma manutencao corretiva registrada em ' + yr + '. Sistema estavel.']);
    recs5.forEach(r => {
      doc.setFillColor(248,250,252); doc.roundedRect(18, p5y, 174, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(r[0].r, r[0].g, r[0].b);
      doc.text(r[1], 23, p5y + 9);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...txtMuted);
      doc.text(r[2], 23 + 35, p5y + 9, { maxWidth: 148 });
      p5y += 18;
    });

    // Signature block
    p5y += 10;
    doc.setFillColor(248,250,252); doc.roundedRect(18, p5y, 174, 38, 2, 2, 'F');
    doc.setDrawColor(...borderC); doc.setLineWidth(.4); doc.roundedRect(18, p5y, 174, 38, 2, 2, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...txtMuted);
    doc.text('ASSINATURAS', 105, p5y + 8, { align: 'center' });
    doc.setDrawColor(...borderC);
    doc.line(30, p5y + 22, 90, p5y + 22);
    doc.line(120, p5y + 22, 180, p5y + 22);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
    doc.text('Responsável pelo Equipamento', 60, p5y + 28, { align: 'center' });
    doc.text('Supervisão / Aprovação', 150, p5y + 28, { align: 'center' });
    doc.text('Data: ___/___/______', 60, p5y + 35, { align: 'center' });
    doc.text('Data: ___/___/______', 150, p5y + 35, { align: 'center' });

    // Footer on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(...bgAlt); doc.rect(0, H - 14, W, 14, 'F');
      doc.setDrawColor(...borderC); doc.line(20, H - 14, W - 20, H - 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
      doc.text('Relatório Anual · TSQ 9610 GCxGC–MS/MS · Código 12E797 · Método 5.389', 20, H - 5);
      doc.text('Página ' + i + ' de ' + totalPages, W - 20, H - 5, { align: 'right' });
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
  
  const existingRows = tbody.querySelectorAll('tr.corrective-record');
  existingRows.forEach(r => r.remove());
  
  if (correctiveRecords.length === 0) {
    const emptyRow = document.getElementById('corrective-empty-row');
    if (emptyRow) emptyRow.style.display = 'table-row';
    return;
  }
  
  const emptyRow = document.getElementById('corrective-empty-row');
  if (emptyRow) emptyRow.style.display = 'none';

  correctiveRecords.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'corrective-record';
    tr.style.cursor = 'pointer';
    tr.onclick = () => openCorrectiveModal(r);
    tr.innerHTML = `
      <td class="num">${r.date}</td>
      <td>${r.resp}</td>
      <td>${r.sup}</td>
      <td><div class="truncate" style="max-width:180px">${r.prob}</div></td>
      <td><div class="truncate" style="max-width:180px">${r.proc}</div></td>
      <td><div class="truncate" style="max-width:140px">${r.result}</div></td>
    `;
    tbody.appendChild(tr);
  });
}

function openCorrectiveModal(record) {
  const modal = document.getElementById('corrective-detail-modal');
  const title = document.getElementById('det-title');
  const content = document.getElementById('det-content');
  const btnDelete = document.getElementById('btn-delete-corrective');

  title.innerHTML = `Manutenção Corretiva — <span style="color:var(--teal)">${record.date}</span>`;
  content.innerHTML = `
    <div style="margin-bottom:16px"><strong style="color:var(--muted)">Responsável:</strong> ${record.resp} &nbsp; | &nbsp; <strong style="color:var(--muted)">Supervisão:</strong> ${record.sup}</div>
    <div style="margin-bottom:12px; background:var(--bg3); padding:12px; border-radius:6px;">
      <strong style="color:var(--amber); display:block; margin-bottom:4px">Problema / Causa:</strong>
      ${record.prob}
    </div>
    <div style="margin-bottom:12px; background:var(--bg3); padding:12px; border-radius:6px;">
      <strong style="color:var(--teal); display:block; margin-bottom:4px">Ação Corretiva:</strong>
      ${record.proc}
    </div>
    <div style="background:var(--bg3); padding:12px; border-radius:6px;">
      <strong style="color:var(--muted); display:block; margin-bottom:4px">Resultado:</strong>
      ${record.result}
    </div>
  `;

  btnDelete.onclick = () => deleteCorrective(record.id);
  modal.classList.add('show');
}

function closeCorrectiveModal() {
  document.getElementById('corrective-detail-modal').classList.remove('show');
}

// =====================================================================
// TUNE DETAILS MODAL
// =====================================================================
function openTuneDetailModal(tuneNum) {
  const tune = tuneData.find(t => t.num === tuneNum);
  if (!tune) {
    alert('Registro de Tune não encontrado.');
    return;
  }

  // Encontrar Registro Diário Correspondente
  const toISO = (dStr) => {
    if (!dStr) return '';
    let parts;
    dStr = dStr.trim();
    if (dStr.includes('-')) {
      parts = dStr.split('-');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (dStr.includes('/')) {
      parts = dStr.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dStr;
  };
  const tuneIsoDate = toISO(tune.date);
  const matchedLog = savedLogs.find(l => toISO(l.date) === tuneIsoDate);

  const modal = document.getElementById('tune-detail-modal');
  const title = document.getElementById('tune-det-title');
  const content = document.getElementById('tune-det-content');

  title.innerHTML = `Histórico de Tune — <span style="color:var(--teal)">Tune #${tune.num}</span>`;

  // Status Classes & Labels
  const emvClass = tune.emv > 2200 ? 'alert' : tune.emv > 1800 ? 'warn' : 'ok';
  const m18Class = tune.m18 > 10 ? 'alert' : tune.m18 > 7 ? 'warn' : 'ok';
  const m28Class = tune.m28 > 10 ? 'alert' : tune.m28 > 7 ? 'warn' : 'ok';
  const m32Class = tune.m32 > 2 ? 'alert' : tune.m32 > 1.5 ? 'warn' : 'ok';

  const emvLabel = tune.emv > 2200 ? 'Substituir Multiplicador' : tune.emv > 1800 ? 'Monitorar Desgaste' : 'Normal';
  const m18Label = tune.m18 > 10 ? 'Umidade Elevada' : tune.m18 > 7 ? 'Atenção' : 'Baixo';
  const m28Label = tune.m28 > 10 ? 'Vazamento de Ar' : tune.m28 > 7 ? 'Atenção' : 'Normal';
  const m32Label = tune.m32 > 2 ? 'Vazamento O₂ Crítico' : tune.m32 > 1.5 ? 'Atenção O₂' : 'Normal';

  // Format Date for Display
  const formatDisplayDate = (dStr) => {
    if (!dStr) return '—';
    if (dStr.includes('-')) {
      const p = dStr.split('-');
      return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return dStr;
  };

  // Build Tune Column HTML
  let tuneHTML = `
    <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border)">
      <h3 style="color:var(--teal); margin-top:0; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:8px; font-size:15px; display:flex; justify-content:space-between; align-items:center;">
        <span>📊 Parâmetros do Tune</span>
        <span class="metric-badge badge-ok" style="font-size:11px">Tune Realizado</span>
      </h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div>
          <span style="color:var(--muted); font-size:11px; display:block;">DATA DO TUNE</span>
          <strong style="color:var(--text); font-size:13px;">${formatDisplayDate(tune.date)}</strong>
        </div>
        <div>
          <span style="color:var(--muted); font-size:11px; display:block;">OPERADOR</span>
          <strong style="color:var(--text); font-size:13px;">${tune.op || '—'}</strong>
        </div>
        <div>
          <span style="color:var(--muted); font-size:11px; display:block;">FILAMENTO ACIONADO</span>
          <strong style="color:var(--text); font-size:13px;">Filamento ${tune.fil}</strong>
        </div>
        <div>
          <span style="color:var(--muted); font-size:11px; display:block;">TEMP. INTERFACE</span>
          <strong style="color:var(--text); font-size:13px;">${tune.tint || '—'} °C</strong>
        </div>
      </div>

      <!-- EMV KPI Card -->
      <div class="metric-card ${emvClass}" style="padding:12px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="metric-title" style="font-size:12px;">EMV (Tensão do Multiplicador)</span>
          <span class="metric-badge badge-${emvClass}" style="font-size:10px;">${emvLabel}</span>
        </div>
        <div class="metric-value" style="font-size:24px; margin-top:4px;">${tune.emv}<span class="metric-unit">V</span></div>
      </div>

      <!-- Abundances Calibrante PFTBA -->
      <h4 style="color:var(--text); margin-top:0; margin-bottom:8px; font-size:12px; font-weight:600;">Abundâncias PFTBA (Calibrante)</h4>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:16px;">
        <div style="background:var(--bg3); padding:8px; border-radius:6px; text-align:center;">
          <div style="font-size:10px; color:var(--muted)">m/z 69</div>
          <div style="font-size:13px; font-weight:bold; color:var(--text)">${tune.m69}%</div>
          <div style="font-size:9px; color:var(--label)">Pico Base</div>
        </div>
        <div style="background:var(--bg3); padding:8px; border-radius:6px; text-align:center;">
          <div style="font-size:10px; color:var(--muted)">m/z 219</div>
          <div style="font-size:13px; font-weight:bold; color:var(--text)">${tune.m219}%</div>
          <div style="font-size:9px; color:var(--label)">Relativo</div>
        </div>
        <div style="background:var(--bg3); padding:8px; border-radius:6px; text-align:center;">
          <div style="font-size:10px; color:var(--muted)">m/z 502</div>
          <div style="font-size:13px; font-weight:bold; color:var(--text)">${tune.m502}%</div>
          <div style="font-size:9px; color:var(--label)">Relativo</div>
        </div>
      </div>

      <!-- Diagnostic Information -->
      <h4 style="color:var(--text); margin-top:0; margin-bottom:8px; font-size:12px; font-weight:600;">Canais de Diagnóstico & Vácuo</h4>
      <div style="display:grid; grid-template-columns:1fr; gap:8px;">
        <div class="indicator-row" style="background:var(--bg3); padding:6px 10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px;"><strong style="color:var(--text)">m/z 18 (Umidade)</strong> <span style="color:var(--muted); font-size:10px;">(Limite: &lt;10%)</span></span>
          <span class="metric-badge badge-${m18Class}" style="font-size:10px; min-width:60px; text-align:center;">${tune.m18}% · ${m18Label}</span>
        </div>
        <div class="indicator-row" style="background:var(--bg3); padding:6px 10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px;"><strong style="color:var(--text)">m/z 28 (Nitrogênio)</strong> <span style="color:var(--muted); font-size:10px;">(Limite: &lt;10%)</span></span>
          <span class="metric-badge badge-${m28Class}" style="font-size:10px; min-width:60px; text-align:center;">${tune.m28}% · ${m28Label}</span>
        </div>
        <div class="indicator-row" style="background:var(--bg3); padding:6px 10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px;"><strong style="color:var(--text)">m/z 32 (Oxigênio)</strong> <span style="color:var(--muted); font-size:10px;">(Limite: &lt;2%)</span></span>
          <span class="metric-badge badge-${m32Class}" style="font-size:10px; min-width:60px; text-align:center;">${tune.m32}% · ${m32Label}</span>
        </div>
      </div>
    </div>
  `;

  // Build Log Column HTML
  let logHTML = '';
  if (matchedLog) {
    // Reconstruir checklist de manutenções preventivas do dia
    let preventives = [];
    if (matchedLog.he === 'SIM') preventives.push('Troca Cilindro Hélio');
    if (matchedLog.limpinj === 'SIM') preventives.push('Limpeza do Injetor');
    if (matchedLog.septo === 'SIM') preventives.push('Substituição de Septo');
    if (matchedLog.liner === 'SIM') preventives.push('Substituição de Liner');
    if (matchedLog.limpfonte === 'SIM') preventives.push('Limpeza da Fonte de Íons');
    if (matchedLog.corte && parseFloat(matchedLog.corte) > 0) preventives.push(`Corte de Coluna (${matchedLog.corte} cm)`);

    logHTML = `
      <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border)">
        <h3 style="color:var(--teal); margin-top:0; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:8px; font-size:15px; display:flex; justify-content:space-between; align-items:center;">
          <span>📝 Registro Diário Associado</span>
          <span class="metric-badge badge-ok" style="font-size:11px">Localizado</span>
        </h3>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
          <div>
            <span style="color:var(--muted); font-size:11px; display:block;">OPERADOR DIÁRIO</span>
            <strong style="color:var(--text); font-size:13px;">${matchedLog.op || '—'}</strong>
          </div>
          <div>
            <span style="color:var(--muted); font-size:11px; display:block;">SISTEMA OPERACIONAL</span>
            <strong style="color:var(--text); font-size:13px;">${matchedLog.sistema || 'Normal'}</strong>
          </div>
          <div>
            <span style="color:var(--muted); font-size:11px; display:block;">PRESSÃO INJETOR (psi)</span>
            <strong style="color:var(--text); font-size:13px;">${matchedLog.psi ? matchedLog.psi + ' psi' : '—'}</strong>
          </div>
          <div>
            <span style="color:var(--muted); font-size:11px; display:block;">TEMP. AMBIENTE (Tamb)</span>
            <strong style="color:var(--text); font-size:13px;">${matchedLog.tamb ? matchedLog.tamb + ' °C' : '23 °C'}</strong>
          </div>
          <div>
            <span style="color:var(--muted); font-size:11px; display:block;">INJEÇÕES REGISTRADAS</span>
            <strong style="color:var(--text); font-size:13px;">${matchedLog.inj || 0} injeções</strong>
          </div>
          <div>
            <span style="color:var(--muted); font-size:11px; display:block;">tR PADRÃO INTERNO (PI)</span>
            <strong style="color:var(--text); font-size:13px;">${matchedLog.trpi ? matchedLog.trpi + ' min' : '—'}</strong>
          </div>
        </div>

        ${matchedLog.col_model ? `
          <div style="background:var(--bg3); padding:10px; border-radius:6px; margin-bottom:16px; border-left:3px solid var(--blue)">
            <span style="color:var(--muted); font-size:10px; display:block;">COLUNA CROMATOGRÁFICA EM USO</span>
            <strong style="color:var(--blue); font-size:12px;">${matchedLog.col_model}</strong>
            ${matchedLog.corte ? `<span style="color:var(--text); font-size:11px; margin-left:10px;">(Corte: -${matchedLog.corte} cm)</span>` : ''}
          </div>
        ` : ''}

        <!-- checklist preventives -->
        <h4 style="color:var(--text); margin-top:0; margin-bottom:8px; font-size:12px; font-weight:600;">Intervenções Realizadas no Dia</h4>
        <div style="margin-bottom:16px;">
          {PREVENTIVE_ITEMS_HTML}
        </div>

        <h4 style="color:var(--text); margin-top:0; margin-bottom:4px; font-size:12px; font-weight:600;">Observações do Operador</h4>
        <div style="background:var(--bg3); padding:10px; border-radius:6px; font-size:12px; color:var(--label); font-style:italic; line-height:1.4; border:1px solid var(--border)">
          ${matchedLog.obs || 'Nenhuma ocorrência registrada no dia.'}
        </div>
      </div>
    `;

    // Render list of preventive items beautifully
    let listHTML = '';
    if (preventives.length > 0) {
      listHTML = preventives.map(p => `
        <div style="display:inline-flex; align-items:center; background:rgba(13,148,136,.12); color:var(--teal); padding:4px 8px; border-radius:4px; margin-right:6px; margin-bottom:6px; font-size:11px; font-weight:500;">
          <span style="margin-right:4px;">✓</span> ${p}
        </div>
      `).join('');
    } else {
      listHTML = '<div style="font-size:11px; color:var(--muted)">Nenhuma manutenção preventiva realizada neste dia.</div>';
    }
    logHTML = logHTML.replace('{PREVENTIVE_ITEMS_HTML}', listHTML);

  } else {
    logHTML = `
      <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; height:100%; min-height:300px;">
        <span style="font-size:40px; margin-bottom:12px;">📝</span>
        <h3 style="color:var(--muted); margin:0 0 8px 0; font-size:16px;">Sem Registro Diário Correspondente</h3>
        <p style="color:var(--label); font-size:12px; max-width:280px; margin:0 0 16px 0; line-height:1.4;">
          Nenhuma folha de Registro Diário foi preenchida para a data de <strong>${formatDisplayDate(tune.date)}</strong>.
        </p>
        <button class="btn btn-outline" style="font-size:11px; padding:4px 12px;" onclick="showPageWithTuneData('${tune.date}', ${tune.num})">
          + Criar Registro Diário
        </button>
      </div>
    `;
  }

  // Assemble into 2 columns grid
  content.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
      ${tuneHTML}
      ${logHTML}
    </div>
  `;

  modal.classList.add('show');
}

function closeTuneDetailModal() {
  document.getElementById('tune-detail-modal').classList.remove('show');
}

function showPageWithTuneData(tuneDate, tuneNum) {
  closeTuneDetailModal();
  showPage('log');
  
  const toISO = (dStr) => {
    if (!dStr) return '';
    let parts;
    dStr = dStr.trim();
    if (dStr.includes('-')) {
      parts = dStr.split('-');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (dStr.includes('/')) {
      parts = dStr.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dStr;
  };

  const dateInput = document.getElementById('log-date');
  if (dateInput) {
    // Temporarily enable it to write, then keep it disabled if it is locked
    dateInput.disabled = false;
    dateInput.value = toISO(tuneDate);
    dateInput.disabled = true;
  }

  const tuneNumInput = document.getElementById('log-tunenum');
  if (tuneNumInput) {
    tuneNumInput.value = tuneNum;
  }
}

async function deleteCorrective(id) {
  if (!confirm('Deseja realmente excluir este registro de manutenção? Esta ação não pode ser desfeita.')) return;
  
  try {
    const response = await fetch(`/api/corrective/${id}`, { method: 'DELETE' });
    const result = await response.json();
    correctiveRecords = result.correctiveRecords;
    renderCorrectiveTable();
    updateAnualCorrectiveList();
    closeCorrectiveModal();
    renderStatusGeral();
  } catch (e) {
    console.error(e);
    alert('Erro ao excluir registro.');
  }
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
// =====================================================================
// COLUMNS MANAGEMENT
// =====================================================================
function openColumnModal() {
  document.getElementById('column-modal').classList.add('show');
  document.getElementById('col-install-date').value = new Date().toISOString().split('T')[0];
}

function closeColumnModal() {
  document.getElementById('column-modal').classList.remove('show');
}

async function saveColumn() {
  const type = document.getElementById('col-type').value;
  const model = document.getElementById('col-model').value.trim();
  const serial = document.getElementById('col-serial').value.trim();
  const install_date = document.getElementById('col-install-date').value;
  const initial_length = parseFloat(document.getElementById('col-initial-length').value || 0);
  const status = document.getElementById('col-status').value;

  if (!model || !install_date) { alert('Modelo e Data são obrigatórios.'); return; }

  const entry = { type, model, serial, install_date, initial_length, status };

  try {
    const response = await fetch('/api/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erro desconhecido');
    }
    columns = result.columns || [];
    renderColumnHistory();
    updateColumnSelects();
    closeColumnModal();
    alert('Coluna cadastrada com sucesso!');
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar coluna: ' + e.message);
  }
}

function renderColumnHistory() {
  const tbody = document.getElementById('column-history-body');
  if (!tbody) return;

  tbody.innerHTML = columns.map(c => {
    // Calcular cortes totais para esta coluna
    const totalCuts = savedLogs
      .filter(l => l.col_model === c.model)
      .reduce((sum, l) => sum + (parseFloat(l.corte) || 0), 0);
    
    const remaining = c.initial_length - (totalCuts / 100); // cortes em cm, comp em m
    const statusClass = c.status === 'Em uso' ? 'badge-ok' : c.status === 'Arquivada' ? 'badge-alert' : 'badge-info';

    return `
      <tr>
        <td>${c.type}</td>
        <td class="num">${c.model}</td>
        <td class="num">${c.serial || '—'}</td>
        <td class="num">${c.install_date}</td>
        <td class="num ok">${totalCuts} cm</td>
        <td class="num"><strong>${remaining.toFixed(2)} m</strong></td>
        <td><span class="metric-badge ${statusClass}">${c.status}</span></td>
        <td><button class="btn btn-outline" style="padding:2px 8px" onclick="deleteColumn(${c.id})">×</button></td>
      </tr>
    `;
  }).join('');
}

async function deleteColumn(id) {
  if (!confirm('Deseja excluir esta coluna?')) return;
  try {
    const response = await fetch(`/api/columns/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erro ao excluir');
    }
    columns = result.columns || [];
    renderColumnHistory();
    updateColumnSelects();
  } catch (e) { 
    console.error(e); 
    alert('Erro ao excluir coluna: ' + e.message);
  }
}

function updateColumnSelects() {
  const sel = document.getElementById('log-col-model');
  if (!sel) return;
  const activeCols = columns.filter(c => c.status === 'Em uso');
  sel.innerHTML = '<option value="">— Selecione uma coluna —</option>' + 
    activeCols.map(c => `<option value="${c.model}">${c.model} (${c.type})</option>`).join('');
}

function updateAutoIncrementedFields() {
  // 1. Temperatura ambiente predefinida
  const elTemp = document.getElementById('log-temp');
  if (elTemp && !elTemp.value) elTemp.value = '23';

  // 2. Injeções autoincrementadas (total + 1)
  let totalInjections = 0;
  savedLogs.forEach(l => {
    if (l.inj) totalInjections += parseInt(l.inj);
  });
  const elInj = document.getElementById('log-inj');
  if (elInj) elInj.value = totalInjections + 1;

  // 3. Nº do Tune autoincrementado
  const nextTuneNum = tuneData.length > 0 ? Math.max(...tuneData.map(t => t.num || 0)) + 1 : 1;
  const elTuneNum = document.getElementById('log-tunenum');
  if (elTuneNum) elTuneNum.value = nextTuneNum;
}

// =====================================================================
// DYNAMIC MAINTENANCE CALENDAR
// =====================================================================
function renderMaintenanceSchedule() {
  const tbody = document.getElementById('maintenance-schedule-body');
  if (!tbody) return;

  const items = [
    { id: 'septo', label: 'Septo do injetor', freq: '100–200 injeções', limit: 150 },
    { id: 'liner', label: 'Liner do injetor', freq: '400–800 injeções', limit: 600 },
    { id: 'limpfonte', label: 'Limpeza da fonte', freq: 'Trimestral / m/z18>10%', limit: 90 }, // dias
    { id: 'he', label: 'Troca Cilindro He', freq: 'Por pressão', limit: 0 },
    { id: 'tune', label: 'Tune completo', freq: 'Semanal / pré-corrida', limit: 7 } // dias
  ];

  tbody.innerHTML = items.map(item => {
    let lastDate = 'Não registrado';
    let nextInfo = '—';
    let status = 'ok';
    let statusLabel = 'OK';

    // Encontrar último registro desta manutenção
    const lastLog = [...savedLogs].reverse().find(l => l[item.id] === 'SIM');
    
    if (lastLog) {
      lastDate = lastLog.date;
      
      // Cálculo de injeções desde então
      if (item.id === 'septo' || item.id === 'liner') {
        const logsSince = savedLogs.filter(l => new Date(l.date) >= new Date(lastLog.date));
        const totalInj = logsSince.reduce((sum, l) => sum + (parseInt(l.inj) || 0), 0);
        nextInfo = `${totalInj} / ${item.limit} inj.`;
        if (totalInj >= item.limit) { status = 'alert'; statusLabel = 'TROCAR'; }
        else if (totalInj >= item.limit * 0.8) { status = 'warn'; statusLabel = 'Monitorar'; }
      } 
      // Cálculo de dias
      else if (item.limit > 0) {
        const diffDays = Math.floor((new Date() - new Date(lastLog.date)) / (1000*60*60*24));
        nextInfo = `${diffDays} / ${item.limit} dias`;
        if (diffDays >= item.limit) { status = 'alert'; statusLabel = 'ATRASADO'; }
        else if (diffDays >= item.limit * 0.8) { status = 'warn'; statusLabel = 'Perto'; }
      }
    } else if (item.limit > 0) {
      status = 'warn';
      statusLabel = 'Verificar';
    }

    return `
      <tr>
        <td>${item.label}</td>
        <td>${item.freq}</td>
        <td class="num">${lastDate}</td>
        <td class="num ${status === 'ok' ? '' : status}">${nextInfo}</td>
        <td><span class="metric-badge badge-${status}">${statusLabel}</span></td>
      </tr>
    `;
  }).join('');
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
    columns = data.columns || [];

    const currentYear = new Date().getFullYear();

    document.querySelectorAll('.current-year').forEach(el => el.textContent = currentYear);

    // Calcular injeções por mês
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
    
    // Novas funções
    renderColumnHistory();
    updateColumnSelects();
    renderMaintenanceSchedule();
    updateAutoIncrementedFields();
    
  } catch (e) {
    console.error("Falha ao se conectar com o servidor Node.js", e);
    alert("Não foi possível carregar os dados. Certifique-se de que o servidor Node.js está rodando.");
  }
});
