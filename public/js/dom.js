// DOM manipulation and UI rendering module.
// Generates pages, forms, tables, and modals dynamically.

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const toISO = (dStr) => {
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

export const formatDisplayDate = (dStr) => {
  if (!dStr) return '—';
  if (dStr.includes('-')) {
    const p = dStr.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  return dStr;
};

// 1. HUB VIEW
export function renderHub(equipments, onOpenEquipment) {
  const grid = document.getElementById('hub-equipments-grid');
  if (!grid) return;
  grid.innerHTML = '';

  equipments.forEach(eq => {
    const card = document.createElement('div');
    card.className = 'hub-card';
    card.onclick = () => onOpenEquipment(eq.id, eq.name, eq.equipment_type);

    let statusClass = 'status-dot';
    let statusLabel = 'Operacional';
    let statusColor = 'var(--green)';

    if (eq.status === 'offline') {
      const offDate = new Date(eq.offDate);
      offDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - offDate) / (1000 * 60 * 60 * 24)) || 0;
      statusLabel = `Desligado (há ${diffDays} dias)`;
      statusColor = 'var(--red)';
      statusClass = 'status-dot alert-dot';
    } else if (eq.status === 'noop') {
      statusLabel = 'Não Operacional';
      statusColor = 'var(--red)';
      statusClass = 'status-dot alert-dot';
    } else if (eq.status === 'alert') {
      statusLabel = 'Em Alerta';
      statusColor = 'var(--amber)';
      statusClass = 'status-dot warn-dot';
    }

    const imgName = eq.equipment_type === 'generic-hplc' 
      ? 'Salinan-GCMSMS-TSQ-9610.png' // Use same icon or fallback
      : 'Salinan-GCMSMS-TSQ-9610.png';

    let statusBg = 'rgba(5, 150, 105, 0.1)';
    if (eq.status === 'offline' || eq.status === 'noop') {
      statusBg = 'rgba(220, 38, 38, 0.1)';
    } else if (eq.status === 'alert') {
      statusBg = 'rgba(217, 119, 6, 0.1)';
    }

    const deleteBtn = eq.id > 1 ? `
      <button class="btn-delete-card" onclick="event.stopPropagation(); window.deleteEquipment(${eq.id}, '${eq.name.replace(/'/g, "\\'")}')" title="Excluir Equipamento" style="position:absolute; top:12px; right:12px; background:none; border:none; color:var(--muted); cursor:pointer; font-size:16px;">🗑</button>
    ` : '';

    card.innerHTML = `
      ${deleteBtn}
      <div class="hub-card-icon">
        <img src="assets/${imgName}" alt="${eq.name}" style="max-width: 100%; height: auto;">
      </div>
      <div class="hub-card-title">${eq.name}</div>
      <div class="hub-card-desc">${eq.model}</div>
      <div class="hub-card-status" style="color: ${statusColor}; background: ${statusBg}">
        <span class="${statusClass}" style="background: ${statusColor}; ${eq.status !== 'ok' ? 'animation:none;' : ''}"></span>
        ${statusLabel}
      </div>
    `;
    grid.appendChild(card);
  });
}

// 2. SIDEBAR NAVIGATION CONTROLLER
export function renderSidebar(config) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Set equipment info in logo area
  const equipCode = sidebar.querySelector('.equip-code');
  const equipName = sidebar.querySelector('.equip-name');
  const methodTag = sidebar.querySelector('.method-tag');

  if (equipCode) equipCode.textContent = config.details.tags[1] || 'Cód. —';
  if (equipName) equipName.innerHTML = config.details.model.replace(' ', '<br>');
  if (methodTag) methodTag.textContent = config.details.tags[2] || 'Método —';

  // Toggle pages list visibility depending on equipment type
  const tuneMenuItem = sidebar.querySelector('[onclick="showPage(\'tune\')"]');
  const diagnosticMenuItem = sidebar.querySelector('[onclick="showPage(\'troubleshoot\')"]');

  if (tuneMenuItem) tuneMenuItem.style.display = config.hasTune ? 'flex' : 'none';
  if (diagnosticMenuItem) diagnosticMenuItem.style.display = config.hasTroubleshoot ? 'flex' : 'none';

  // Set vacuum integrity panel display in DOM
  const vacPanel = document.querySelector('#page-status .card:nth-child(2)'); // Leakage panel
  const tuneChartCard = document.querySelector('#page-status .card.mb24'); // EMV Chart card
  
  if (vacPanel) {
    vacPanel.style.display = config.hasVacuumIntegrity ? 'block' : 'none';
  }
  if (tuneChartCard) {
    tuneChartCard.style.display = config.hasTune ? 'block' : 'none';
  }
}

// 3. STATUS GERAL DASHBOARD
export function renderStatusGeral(logs, tunes, config) {
  // A. Update Hero details
  const heroModel = document.querySelector('.hero-model');
  const heroDesc = document.querySelector('.hero-desc');
  const heroTags = document.querySelector('.hero-tags');
  const heroSpecs = document.querySelector('.hero-specs');

  if (heroModel) heroModel.innerHTML = `${config.details.model.split(' ')[0]} <span>${config.details.model.split(' ').slice(1).join(' ')}</span>`;
  if (heroDesc) heroDesc.textContent = config.details.description;
  if (heroTags) {
    heroTags.innerHTML = config.details.tags.map((t, idx) => `
      <span class="tag ${idx < 2 ? 'highlight' : ''}">${t}</span>
    `).join('');
  }
  if (heroSpecs) {
    heroSpecs.innerHTML = config.details.specs.map(s => `
      <div class="spec-item">
        <div class="spec-label">${s.label}</div>
        <div class="spec-val">${s.value}</div>
      </div>
    `).join('');
  }

  // B. Compute accumulated values (like liner injections)
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const lastTune = tunes.length > 0 ? tunes[tunes.length - 1] : null;

  let replaceField = 'liner';
  if (config.details.model.includes('HPLC')) {
    replaceField = 'frit';
  }

  const revLogs = [...logs].reverse();
  const lastSwapIndex = revLogs.findIndex(l => l[replaceField] === 'SIM');
  const logsSinceSwap = lastSwapIndex !== -1 ? revLogs.slice(0, lastSwapIndex + 1) : logs;
  const accumulatedInjections = logsSinceSwap.reduce((sum, l) => sum + (parseInt(l.inj) || 0), 0);

  // C. Build KPIs list dynamically
  const kpisContainer = document.getElementById('alerts-section');
  if (!kpisContainer) return;

  // Render KPIs grid container if it is not present
  let kpiGrid = document.getElementById('status-kpis-grid');
  if (!kpiGrid) {
    kpiGrid = document.createElement('div');
    kpiGrid.id = 'status-kpis-grid';
    kpiGrid.className = 'grid-4 mb24';
    kpisContainer.parentNode.insertBefore(kpiGrid, kpisContainer.nextSibling.nextSibling); // Insert after title
  }
  kpiGrid.innerHTML = '';

  const statsMap = {
    linerInjections: accumulatedInjections,
    inj: lastLog ? lastLog.inj : 0,
    sistema: lastLog ? lastLog.sistema : 'Sim',
    tamb: lastLog ? lastLog.tamb : null,
    ...(lastLog || {}),
    ...(lastTune || {})
  };

  config.kpis.forEach(kpi => {
    let rawVal = statsMap[kpi.field];
    let displayVal = '—';
    if (rawVal !== undefined && rawVal !== null) {
      displayVal = rawVal + (kpi.unit ? `<span class="metric-unit">${kpi.unit}</span>` : '');
    }

    // Determine status color state
    let state = 'ok';
    let badgeText = '✓ Normal';

    const rules = config.statusRules || {};
    const checkCondition = (rule) => {
      const val = statsMap[rule.field];
      if (val === undefined || val === null) return false;
      if (rule.operator === '>=') return parseFloat(val) >= rule.value;
      if (rule.operator === '<=') return parseFloat(val) <= rule.value;
      if (rule.operator === '==') return val == rule.value;
      return false;
    };

    // Evaluate rules specifically for this KPI field
    const criticalRule = (rules.noop || []).find(r => r.field === kpi.field || (kpi.field === 'linerInjections' && r.field === 'linerInjections'));
    const warningRule = (rules.alert || []).find(r => r.field === kpi.field || (kpi.field === 'linerInjections' && r.field === 'linerInjections'));

    if (criticalRule && checkCondition(criticalRule)) {
      state = 'alert';
      badgeText = '❌ Crítico';
    } else if (warningRule && checkCondition(warningRule)) {
      state = 'warn';
      badgeText = '⚠ Monitorar';
    }

    const card = document.createElement('div');
    card.className = `metric-card ${state}`;
    card.innerHTML = `
      <div class="metric-label">${kpi.label}</div>
      <div class="metric-value">${displayVal}</div>
      <div class="metric-sub">${kpi.limit || 'Última leitura'}</div>
      <div class="metric-badge badge-${state}">${badgeText}</div>
    `;
    kpiGrid.appendChild(card);
  });

  // D. Render Active Alerts
  renderActiveAlerts(statsMap, config);

  // E. Render component health progress bars
  renderComponentHealth(accumulatedInjections, logs, config);

  // F. Render Vacuum Integrity details
  if (config.hasVacuumIntegrity && lastTune) {
    const fields = ['m18', 'm28', 'm32', 'm69', 'm219', 'm502'];
    fields.forEach(f => {
      const el = document.getElementById(`kpi-${f}`);
      const el2 = document.getElementById(`kpi-${f}-2`);
      const val = lastTune[f] !== undefined ? lastTune[f] + '%' : '—';
      if (el) el.innerHTML = val;
      if (el2) el2.innerHTML = val;
    });

    const tuneTimeEl = document.getElementById('kpi-tune');
    if (tuneTimeEl) tuneTimeEl.textContent = `Tune #${lastTune.num} em ${lastTune.date}`;
  }

  // G. Update sidebar status panel
  const sbPill = document.getElementById('sidebar-status-pill');
  const sbDot = document.getElementById('sidebar-status-dot');
  const sbText = document.getElementById('sidebar-status-text');
  if (sbPill && sbDot && sbText) {
    let overallStatus = 'ok';
    let statusLabel = 'Operacional';
    const reasons = [];
    
    // Evaluate if any rule triggers critical/warning
    const rules = config.statusRules || {};
    const checkRule = (rule) => {
      const val = statsMap[rule.field];
      if (val === undefined || val === null) return false;
      let triggered = false;
      if (rule.operator === '>=') triggered = parseFloat(val) >= rule.value;
      else if (rule.operator === '<=') triggered = parseFloat(val) <= rule.value;
      else if (rule.operator === 'in') triggered = rule.values.includes(val);
      
      if (triggered) {
        const kpi = config.kpis.find(k => k.field === rule.field);
        const fieldLabel = kpi ? kpi.label : rule.field;
        const unit = kpi ? kpi.unit || '' : '';
        reasons.push(`${fieldLabel}: ${val}${unit} (limite: ${rule.operator} ${rule.value}${unit})`);
        return true;
      }
      return false;
    };

    if (statsMap.sistema && (statsMap.sistema === 'Não' || statsMap.sistema === 'Nao' || statsMap.sistema.toLowerCase().startsWith('n'))) {
      overallStatus = 'offline';
      statusLabel = 'Desligado';
      reasons.push('Equipamento desligado pelo operador no registro diário.');
    } else {
      if (rules.noop) {
        rules.noop.forEach(checkRule);
      }
      if (reasons.length > 0) {
        overallStatus = 'noop';
        statusLabel = 'Não Operacional';
      } else {
        if (rules.alert) {
          rules.alert.forEach(checkRule);
        }
        if (reasons.length > 0) {
          overallStatus = 'alert';
          statusLabel = 'Alerta';
        }
      }
    }

    sbPill.className = 'status-pill';
    sbDot.className = 'status-dot';

    let tooltipText = '';
    if (overallStatus === 'ok') {
      tooltipText = 'Sistema operacional. Todos os parâmetros sob controle.';
    } else {
      tooltipText = `Status: ${statusLabel}\nMotivo(s):\n` + reasons.map(r => `• ${r}`).join('\n');
    }

    const statusContainer = sbPill.closest('.sidebar-status');
    if (statusContainer) {
      statusContainer.setAttribute('title', tooltipText);
      statusContainer.style.cursor = 'help';
    }

    if (overallStatus === 'offline' || overallStatus === 'noop') {
      sbPill.classList.add('alert');
      sbDot.classList.add('alert');
      sbText.textContent = statusLabel;
    } else if (overallStatus === 'alert') {
      sbPill.classList.add('warn');
      sbDot.classList.add('warn');
      sbText.textContent = statusLabel;
    } else {
      sbText.textContent = 'Operacional';
    }
  }
}

function renderActiveAlerts(statsMap, config) {
  const container = document.getElementById('alerts-container');
  if (!container) return;

  let alertsHTML = '';
  let criticalCount = 0;
  let warnCount = 0;

  if (statsMap.sistema && (statsMap.sistema === 'Não' || statsMap.sistema === 'Nao' || statsMap.sistema.toLowerCase().startsWith('n'))) {
    alertsHTML += `
      <div class="alert-banner alert">
        <span class="alert-icon">❌</span>
        <div class="alert-text">
          <strong>Equipamento Desligado</strong>
          O último registro diário indicou que o sistema foi desligado. Verifique os procedimentos de reinicialização.
        </div>
      </div>
    `;
    criticalCount++;
  }

  // Iterate over status rules
  const rules = config.statusRules || {};
  const checkRule = (rule) => {
    const val = statsMap[rule.field];
    if (val === undefined || val === null) return false;
    if (rule.operator === '>=') return parseFloat(val) >= rule.value;
    if (rule.operator === '<=') return parseFloat(val) <= rule.value;
    return false;
  };

  if (rules.noop) {
    rules.noop.forEach(rule => {
      if (checkRule(rule)) {
        let label = rule.field === 'linerInjections' ? 'Injeções no Liner' : rule.field.toUpperCase();
        alertsHTML += `
          <div class="alert-banner alert">
            <span class="alert-icon">⚠</span>
            <div class="alert-text">
              <strong>Métrica Crítica — ${label} Excedido</strong>
              O valor atual (${statsMap[rule.field]}) atingiu ou ultrapassou o limite crítico de ${rule.value}.
            </div>
          </div>
        `;
        criticalCount++;
      }
    });
  }

  if (rules.alert) {
    rules.alert.forEach(rule => {
      if (checkRule(rule)) {
        // Only show warning if it has not already triggered critical
        const hasCritical = rules.noop && rules.noop.some(r => r.field === rule.field && checkRule(r));
        if (!hasCritical) {
          let label = rule.field === 'linerInjections' ? 'Injeções no Liner' : rule.field.toUpperCase();
          alertsHTML += `
            <div class="alert-banner warn">
              <span class="alert-icon">⚠</span>
              <div class="alert-text">
                <strong>Métrica em Alerta — ${label} Elevado</strong>
                O valor atual (${statsMap[rule.field]}) ultrapassou o limite de atenção de ${rule.value}.
              </div>
            </div>
          `;
          warnCount++;
        }
      }
    });
  }

  if (criticalCount === 0 && warnCount === 0) {
    alertsHTML = `
      <div class="alert-banner ok">
        <span class="alert-icon">✓</span>
        <div class="alert-text">
          <strong>Sistemas Operacionais Conformes</strong>
          Todos os parâmetros e limites analíticos do equipamento estão dentro da normalidade.
        </div>
      </div>
    `;
  }

  container.innerHTML = alertsHTML;
}

function renderComponentHealth(linerInjections, logs, config) {
  const container = document.querySelector('#page-status .card .progress-bar-wrap');
  if (!container) return;
  const parentCard = container.parentNode;
  
  // Clear previous progress bars
  parentCard.innerHTML = '<div class="card-title">Vida Útil de Componentes</div>';

  const schedule = config.maintenanceSchedule || [];
  schedule.forEach(item => {
    let limit = 800;
    let current = 0;
    let label = item.component;

    if (item.check === 'log:liner') {
      current = linerInjections;
      limit = 800;
      label = `Liner (injeções: ${current} / ${limit})`;
    } else if (item.check === 'log:corte') {
      const year = new Date().getFullYear();
      const logsYr = logs.filter(l => toISO(l.date).startsWith(String(year)));
      current = logsYr.reduce((sum, l) => sum + (parseFloat(l.corte) || 0), 0);
      limit = 100; // arbitrary max scale
      label = `Corte da coluna 1D (${current} cm cortados este ano)`;
    } else {
      // General preventives
      const field = item.check.split(':')[1];
      const last = logs.filter(l => l[field] === 'SIM').pop();
      label = `${item.component} (Último registro: ${last ? last.date : '—'})`;
      current = last ? 100 : 0;
      limit = 100;
    }

    const pct = Math.min(100, Math.floor((current / limit) * 100));
    const fillClass = pct >= 90 ? 'fill-red' : pct >= 70 ? 'fill-warn' : 'fill-teal';

    const barWrap = document.createElement('div');
    barWrap.className = 'progress-bar-wrap';
    barWrap.innerHTML = `
      <div class="progress-header">
        <span class="progress-title">${label}</span>
        <span class="progress-val" style="color:${pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)'}">${pct}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
      </div>
    `;
    parentCard.appendChild(barWrap);
  });
}

// 4. CHECKLIST
export function renderChecklist(config) {
  const c = document.getElementById('check-items');
  if (!c) return;
  
  c.innerHTML = config.checklist.map((item, i) => `
    <div class="indicator-row" style="cursor:pointer" onclick="window.toggleCheck(${i}, this)">
      <span class="ind-name" id="chk-label-${i}">${item}</span>
      <span id="chk-ico-${i}" style="color:var(--muted)">○</span>
    </div>
  `).join('');

  const counter = document.getElementById('check-count');
  if (counter) counter.textContent = `0/${config.checklist.length}`;
  const bar = document.getElementById('check-bar');
  if (bar) bar.style.width = '0%';
}

// 5. TROUBLESHOOTING GUIDE
export function renderTroubleshoot(config) {
  const c = document.getElementById('trouble-container');
  if (!c) return;

  const items = config.troubleshoot || [];
  c.innerHTML = items.map((item, i) => `
    <div class="trouble-item">
      <div class="trouble-header" onclick="window.toggleTrouble(${i})">
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

// 6. DYNAMIC LOG FORM BUILDER
export function renderLogForm(config, lastLog, columns) {
  const dynamicContainer = document.getElementById('dynamic-log-form-fields');
  if (!dynamicContainer) return;
  dynamicContainer.innerHTML = '';

  // Filter out core columns (date, op, sistema, inj, tamb, obs) which are handled separately/manually
  const coreFields = ['date', 'op', 'sistema', 'inj', 'tamb', 'obs'];
  const customFields = config.logFields.filter(f => !coreFields.includes(f.id));

  customFields.forEach(f => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = `form-field ${f.type === 'textarea' ? 'form-full' : ''}`;
    
    let inputHTML = '';
    const lastVal = lastLog ? lastLog[f.id] : '';

    if (f.type === 'number') {
      inputHTML = `<input type="number" id="log-${f.id}" step="${f.step || 'any'}" placeholder="${f.placeholder || ''}" value="${lastVal || ''}">`;
    } else if (f.type === 'select') {
      inputHTML = `
        <select id="log-${f.id}">
          <option value="">— Selecione —</option>
          ${f.options.map(opt => `<option value="${opt}" ${lastVal === opt ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
      `;
    } else if (f.type === 'select_column') {
      inputHTML = `
        <select id="log-${f.id}">
          <option value="">— Selecione uma coluna —</option>
          ${columns.map(c => `<option value="${c.model} (${c.serial})" ${lastVal && lastVal.includes(c.serial) ? 'selected' : ''}>${c.type} - ${c.model} (${c.serial})</option>`).join('')}
        </select>
      `;
    } else {
      inputHTML = `<input type="text" id="log-${f.id}" placeholder="${f.placeholder || ''}" value="${lastVal || ''}">`;
    }

    fieldDiv.innerHTML = `
      <label>${f.label}</label>
      ${inputHTML}
    `;
    dynamicContainer.appendChild(fieldDiv);
  });

  // Draw Tune Form section if tune is supported
  const tuneCard = document.getElementById('log-tune-card');
  if (tuneCard) {
    tuneCard.style.display = config.hasTune ? 'block' : 'none';
    if (config.hasTune) {
      renderTuneFormFields(config.tuneFields);
    }
  }
}

function renderTuneFormFields(tuneFields) {
  const fieldsContainer = document.getElementById('log-tune-fields-container');
  if (!fieldsContainer) return;
  fieldsContainer.innerHTML = '';

  // Always pre-render Tune number
  const numField = document.createElement('div');
  numField.className = 'form-field';
  numField.innerHTML = `
    <label>Nº do Tune</label>
    <input type="number" id="log-tunenum" placeholder="—" readonly>
  `;
  fieldsContainer.appendChild(numField);

  tuneFields.forEach(f => {
    if (f.id === 'num') return;
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-field';

    let inputHTML = '';
    if (f.type === 'select') {
      inputHTML = `
        <select id="log-${f.id}" disabled>
          <option value="">—</option>
          ${f.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      `;
    } else {
      inputHTML = `<input type="number" id="log-${f.id}" step="${f.step || 'any'}" placeholder="${f.placeholder || ''}" disabled>`;
    }

    fieldDiv.innerHTML = `
      <label>${f.label}</label>
      ${inputHTML}
    `;
    fieldsContainer.appendChild(fieldDiv);
  });
}

// 7. PREVENTIVE MAINTENANCE SCHEDULE
export function renderMaintenanceSchedule(logs, config) {
  const tbody = document.getElementById('maintenance-schedule-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const schedule = config.maintenanceSchedule || [];
  
  schedule.forEach(item => {
    let lastDate = 'Não registrado';
    let statusLabel = 'Pendente';
    let statusClass = 'badge-alert';

    if (item.check && item.check.startsWith('log:')) {
      const field = item.check.split(':')[1];
      const match = [...logs].reverse().find(l => l[field] === 'SIM');
      if (match) {
        lastDate = match.date;
        statusLabel = 'Realizado';
        statusClass = 'badge-ok';
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.component}</strong></td>
      <td>${item.frequency}</td>
      <td class="num">${lastDate}</td>
      <td class="num">—</td>
      <td><span class="metric-badge ${statusClass}">${statusLabel}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// 8. CHROMATOGRAPHIC COLUMNS HISTORY
export function renderColumnHistory(columns, onDeleteColumn) {
  const tbody = document.getElementById('column-history-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (columns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--muted); padding:20px;">Nenhuma coluna cromatográfica cadastrada.</td></tr>`;
    return;
  }

  columns.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.type}</strong></td>
      <td>${c.model}</td>
      <td class="num">${c.serial}</td>
      <td>${c.project || '—'}</td>
      <td class="num">${c.install_date}</td>
      <td class="num">${c.initial_length} m</td>
      <td class="num">${c.initial_length} m</td>
      <td><span class="metric-badge ${c.status === 'Em uso' ? 'badge-ok' : c.status === 'Reserva' ? 'badge-info' : 'badge-warn'}">${c.status}</span></td>
      <td><div class="truncate" style="max-width:150px" title="${c.obs || ''}">${c.obs || '—'}</div></td>
      <td style="text-align:center;">
        <button class="btn btn-outline" style="padding:2px 8px; font-size:10px; border-color:var(--red); color:var(--red);" onclick="window.deleteColumn(${c.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 9. CORRECTIVE RECORD LOGS
export function renderCorrectiveTable(records, onOpenDetail) {
  const tbody = document.getElementById('corrective-body');
  if (!tbody) return;

  // Clear older dynamic rows
  const dynRows = tbody.querySelectorAll('tr.corrective-record');
  dynRows.forEach(r => r.remove());

  const emptyRow = document.getElementById('corrective-empty-row');

  if (records.length === 0) {
    if (emptyRow) emptyRow.style.display = 'table-row';
    return;
  }

  if (emptyRow) emptyRow.style.display = 'none';

  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'corrective-record';
    tr.style.cursor = 'pointer';
    tr.onclick = () => onOpenDetail(r);
    tr.innerHTML = `
      <td class="num">${r.date}</td>
      <td>${r.resp}</td>
      <td>${r.sup}</td>
      <td><div class="truncate" style="max-width:180px" title="${r.prob}">${r.prob}</div></td>
      <td><div class="truncate" style="max-width:180px" title="${r.proc}">${r.proc}</div></td>
      <td><div class="truncate" style="max-width:140px" title="${r.result}">${r.result}</div></td>
    `;
    tbody.appendChild(tr);
  });
}

// 10. DAILY LOGS LIST
export function renderFullLogsList(logs, tunes, onOpenDetail) {
  const tbody = document.getElementById('full-logs-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const query = (document.getElementById('log-search-date')?.value || '').trim().toLowerCase();
  let filtered = [...logs];
  if (query) {
    filtered = filtered.filter(l => l.date.includes(query));
  }

  // Sort descending
  filtered.sort((a,b) => new Date(toISO(b.date)) - new Date(toISO(a.date)) || b.id - a.id);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--muted); padding:20px;">Nenhum registro localizado.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const hasTune = tunes.some(t => toISO(t.date) === toISO(l.date));
    
    // Extrapolate preventives text list
    let preventives = [];
    const fields = ['he', 'collision_gas', 'limpinj', 'septo', 'liner', 'limpfonte', 'trocaoleo'];
    fields.forEach(f => {
      if (l[f] === 'SIM') preventives.push(f.toUpperCase());
    });
    if (l.corte && parseFloat(l.corte) > 0) preventives.push(`CORTE (${l.corte}cm)`);
    
    const prevStr = preventives.length > 0 ? preventives.join(', ') : '—';
    const isNormal = l.sistema === 'Sim' || l.sistema === 'Normal';

    return `
      <tr style="cursor:pointer;" onclick="window.openLogDetailModal(${l.id})">
        <td style="padding:10px; font-weight:bold; color:var(--teal);">${l.date}</td>
        <td style="padding:10px;">${l.op || '—'}</td>
        <td style="padding:10px;">
          <span class="metric-badge badge-${isNormal ? 'ok' : 'alert'}" style="margin-top:0;">
            ${l.sistema || 'Sim'}
          </span>
        </td>
        <td style="padding:10px; font-family:Space Mono, monospace;">${l.tamb || '—'} °C</td>
        <td style="padding:10px; font-family:Space Mono, monospace;">${l.psi || l.pressure || '—'}</td>
        <td style="padding:10px; font-family:Space Mono, monospace;">${l.inj || '0'}</td>
        <td style="padding:10px; color:var(--blue);">${l.col_model || '—'}</td>
        <td style="padding:10px; color:var(--muted);">${prevStr}</td>
        <td style="padding:10px; text-align:center;">
          ${hasTune ? '<span style="color:var(--teal); font-size:16px;">⚡</span>' : '<span style="color:var(--muted); font-size:12px;">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

// 11. ANNUAL ANALYSIS PAGE
export function updateAnalysisPage(logs, tunes, records, selectedYear, config) {
  const parseYear = s => {
    if (!s) return null;
    const m = String(s).trim().match(/\b(20\d{2})\b/);
    return m ? parseInt(m[1]) : null;
  };

  const tunesYr = tunes.filter(t => parseYear(t.date) === selectedYear);
  const logsYr = logs.filter(l => parseYear(l.date) === selectedYear);
  const corrYr = records.filter(r => parseYear(r.date) === selectedYear);

  const totalInj = logsYr.reduce((s, l) => s + (parseInt(l.inj) || 0), 0);
  const totalTunes = tunesYr.length;
  const totalCorr = corrYr.length;

  let availability = 100 - (totalCorr * 2.5);
  const systemFailDays = logsYr.filter(l => l.sistema === 'Falha' || l.sistema === 'Manutenção').length;
  availability = Math.max(0, Math.min(100, availability - (systemFailDays * 1.5)));

  // Update DOM cards
  document.getElementById('analysis-val-inj').textContent = totalInj;
  document.getElementById('analysis-val-tunes').textContent = totalTunes;
  document.getElementById('analysis-val-corr').textContent = totalCorr;
  document.getElementById('analysis-val-disp').innerHTML = `${availability.toFixed(1)}<span class="metric-unit">%</span>`;

  // Hide Tune section in analysis page if not applicable
  const emvCard = document.getElementById('emvAnual').closest('.card');
  const leakCard = document.getElementById('leakAnual').closest('.card');
  
  if (emvCard) emvCard.style.display = config.hasTune ? 'block' : 'none';
  if (leakCard) leakCard.style.display = config.hasTune ? 'block' : 'none';

  // Render dynamic recommendations list
  const recsContainer = document.getElementById('analysis-recommendations');
  if (recsContainer) {
    recsContainer.innerHTML = '';
    const recs = [];

    if (totalInj >= 800) recs.push({ type: 'alert', icon: '⚠', text: '<strong>Substituir frita/liner do injetor</strong> — Alto número de injeções no período.' });
    else if (totalInj >= 600) recs.push({ type: 'warn', icon: '⚠', text: '<strong>Programar preventiva de consumíveis</strong> — Injeções aproximando do limite.' });
    else recs.push({ type: 'ok', icon: '✓', text: '<strong>Consumíveis do injetor em conformidade</strong>.' });

    if (config.hasTune && tunesYr.length > 0) {
      const lastEMV = tunesYr[tunesYr.length - 1].emv;
      if (lastEMV >= 2500) recs.push({ type: 'alert', icon: '⚠', text: `<strong>Substituir multiplicador (EMV: ${lastEMV}V)</strong> — Vida útil esgotada.` });
      else if (lastEMV >= 2200) recs.push({ type: 'warn', icon: '⚠', text: `<strong>Programar troca do multiplicador</strong> (EMV em ${lastEMV}V).` });
    }

    if (totalCorr > 0) recs.push({ type: 'warn', icon: '🔧', text: `<strong>Avaliar causas de falhas corretivas</strong> — ${totalCorr} ocorrências.` });
    else recs.push({ type: 'ok', icon: '✓', text: '<strong>Sem ocorrências corretivas críticas no período</strong>.' });

    recsContainer.innerHTML = recs.map(r => `
      <div class="alert-banner ${r.type}" style="margin:0">
        <span class="alert-icon">${r.icon}</span>
        <div class="alert-text">${r.text}</div>
      </div>
    `).join('');
  }
}

// 12. BOOKINGS CALENDAR
export function renderBookingCalendar(bookings, year, month, onDayClick) {
  const container = document.querySelector('.booking-calendar-grid');
  if (!container) return;
  container.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Draw header days
  weekDays.forEach(day => {
    const el = document.createElement('div');
    el.className = 'calendar-day-header';
    el.textContent = day;
    container.appendChild(el);
  });

  // Empty cells for alignment
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'calendar-day-cell empty';
    container.appendChild(el);
  }

  // Active days cells
  for (let d = 1; d <= totalDays; d++) {
    const el = document.createElement('div');
    el.className = 'calendar-day-cell';
    el.innerHTML = `<span class="day-num">${d}</span>`;
    
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Find bookings on this day
    const dayBookings = bookings.filter(b => {
      const start = toISO(b.start_date);
      const end = toISO(b.end_date);
      return cellDateStr >= start && cellDateStr <= end;
    });

    dayBookings.forEach(b => {
      const tag = document.createElement('div');
      tag.className = 'calendar-event-tag';
      tag.textContent = b.operator;
      tag.title = `${b.requester} (${b.start_date} a ${b.end_date})`;
      el.appendChild(tag);
    });

    el.onclick = () => onDayClick(cellDateStr, dayBookings);
    container.appendChild(el);
  }
}

// 13. BOOKINGS LIST
export function renderBookingsList(bookings, page, onDeleteBooking) {
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">Nenhuma reserva ativa cadastrada para este mês.</td></tr>`;
    return;
  }

  const itemsPerPage = 8;
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = bookings.slice(startIndex, startIndex + itemsPerPage);

  paginated.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:10px;"><strong>${b.start_date}</strong> a <strong>${b.end_date}</strong></td>
      <td style="padding:10px;">${b.requester}</td>
      <td style="padding:10px; font-family:Space Mono, monospace;">${b.operator}</td>
      <td style="padding:10px; color:var(--muted);"><div class="truncate" style="max-width:150px" title="${b.obs || ''}">${b.obs || '—'}</div></td>
      <td style="padding:10px; text-align:center;">
        <button class="btn btn-outline" style="padding:2px 8px; font-size:10px; border-color:var(--red); color:var(--red);" onclick="window.deleteBooking(${b.id})">Cancelar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 14. TUNE TABLE WITH SEARCH & PAGINATION
export function renderTuneTable(tuneData, page = 1) {
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

  let currentPage = page;
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
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

      return `<tr style="cursor:pointer" onclick="window.openTuneDetailModal(${t.num})">
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
  if (currentPage > 1) {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px;" onclick="window.changeTunePage(${currentPage - 1})">◀ Anterior</button>`;
  } else {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px; opacity:0.4; cursor:not-allowed;" disabled>◀ Anterior</button>`;
  }

  // Page Numbers (Google Style)
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      pagHTML += `<button class="btn btn-primary" style="padding:4px 10px; font-size:11px; min-width:30px;">${i}</button>`;
    } else {
      pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px; min-width:30px;" onclick="window.changeTunePage(${i})">${i}</button>`;
    }
  }

  // Next button
  if (currentPage < totalPages) {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px;" onclick="window.changeTunePage(${currentPage + 1})">Próximo ▶</button>`;
  } else {
    pagHTML += `<button class="btn btn-outline" style="padding:4px 10px; font-size:11px; opacity:0.4; cursor:not-allowed;" disabled>Próximo ▶</button>`;
  }

  pagDiv.innerHTML = pagHTML;
}
