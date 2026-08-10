import * as api from './api.js';
import * as dom from './dom.js';
import * as charts from './charts.js';
import * as pdf from './pdf.js';
import { toISO, formatDisplayDate } from './dom.js';

// Application State
let currentEquipmentId = null;
let currentEquipmentType = null;
let equipmentsList = [];
let equipmentsConfig = {};

let tuneData = [];
let injectByMonth = [];
let savedLogs = [];
let correctiveRecords = [];
let columns = [];
let bookingsData = [];

let calendarCurrentYear = new Date().getFullYear();
let calendarCurrentMonth = new Date().getMonth();
let bookingCurrentPage = 1;
let bookingSearchMonth = '';
let tuneCurrentPage = 1;

// =====================================================================
// AUTH & STATE MANAGEMENT
// =====================================================================
function checkAuthState() {
  const token = sessionStorage.getItem('token');
  const username = sessionStorage.getItem('username');
  const userText = document.getElementById('hub-user-name');
  const btnLogin = document.getElementById('btn-login-hub');
  const btnLogout = document.getElementById('btn-logout-hub');

  if (token && username) {
    if (userText) userText.textContent = `Logado como: ${username}`;
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'inline-block';
  } else {
    if (userText) userText.textContent = 'Não logado';
    if (btnLogin) btnLogin.style.display = 'inline-block';
    if (btnLogout) btnLogout.style.display = 'none';
  }
}

function isUserAuthorized() {
  const token = sessionStorage.getItem('token');
  return !!token;
}

function openLoginModal() {
  document.getElementById('login-modal').style.display = 'flex';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function closeLoginModal() {
  document.getElementById('login-modal').style.display = 'none';
}

async function performLogin() {
  const u = document.getElementById('login-username').value;
  const p = document.getElementById('login-password').value;

  try {
    const data = await api.login(u, p);
    if (data.success) {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('username', data.username);
      sessionStorage.setItem('permissions', JSON.stringify(data.permissions));
      closeLoginModal();
      checkAuthState();
    } else {
      document.getElementById('login-error').textContent = data.error || 'Erro no login.';
      document.getElementById('login-error').style.display = 'block';
    }
  } catch (e) {
    document.getElementById('login-error').textContent = 'Erro ao contatar o servidor.';
    document.getElementById('login-error').style.display = 'block';
  }
}

function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('permissions');
  checkAuthState();
  showHub();
}

// =====================================================================
// NAVIGATION & PAGE ROUTING
// =====================================================================
function showPage(page) {
  closeMobileSidebar();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'" + page + "'")) {
      n.classList.add('active');
    }
  });

  // Handle specific page triggers
  if (page === 'booking') {
    switchBookingTab('list');
  } else if (page === 'log') {
    switchLogTab('form');
    updateAutoIncrementedFields();
  } else if (page === 'maintenance') {
    dom.renderMaintenanceSchedule(savedLogs, getActiveConfig());
  } else if (page === 'analise') {
    updateAnalysisPage();
  }
}

function showHub() {
  closeMobileSidebar();
  currentEquipmentId = null;
  currentEquipmentType = null;
  document.getElementById('hub-view').classList.add('active');
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display = 'none';
  charts.destroyCharts();
  loadHub();
}

async function loadHub() {
  try {
    equipmentsList = await api.getEquipments();
    dom.renderHub(equipmentsList, openEquipment);
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar lista de equipamentos.');
  }
}

function getActiveConfig() {
  return equipmentsConfig[currentEquipmentType] || equipmentsConfig['tsq-9610'];
}

async function openEquipment(id, name, type) {
  currentEquipmentId = id;
  currentEquipmentType = type;

  document.getElementById('hub-view').classList.remove('active');
  document.getElementById('sidebar').style.display = 'block';
  document.getElementById('main').style.display = 'block';

  // Set title and method properties
  const config = getActiveConfig();
  dom.renderSidebar(config);

  try {
    const data = await api.getEquipmentData(id);
    tuneData = data.tuneData || [];
    injectByMonth = data.injectByMonth || [];
    savedLogs = data.savedLogs || [];
    correctiveRecords = data.correctiveRecords || [];
    columns = data.columns || [];
    bookingsData = data.bookings || [];

    // Render Sub-Components
    dom.renderStatusGeral(savedLogs, tuneData, config);
    dom.renderChecklist(config);
    dom.renderTroubleshoot(config);
    dom.renderMaintenanceSchedule(savedLogs, config);
    dom.renderColumnHistory(columns);
    dom.renderCorrectiveTable(correctiveRecords, openCorrectiveModal);
    dom.renderFullLogsList(savedLogs, tuneData);
    tuneCurrentPage = 1;
    dom.renderTuneTable(tuneData, tuneCurrentPage);
    dom.renderLogForm(config, savedLogs[savedLogs.length - 1], columns);
    dom.renderBookingCalendar(bookingsData, calendarCurrentYear, calendarCurrentMonth, onDayClick);
    dom.renderBookingsList(bookingsData, bookingCurrentPage, deleteBooking);

    // Mini sidebar calendar
    renderSidebarCalendar();

    // Populate years and update analysis page
    populateAnalysisYears();
    updateAnalysisPage();

    // Plot charts
    charts.initCharts(tuneData, injectByMonth, config);

    // Go to status page
    showPage('status');
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar dados do equipamento.');
    showHub();
  }
}

// =====================================================================
// REGISTRO DIÁRIO & TUNE FORM SUBMISSIONS
// =====================================================================
function switchLogTab(tab) {
  const formBtn = document.getElementById('log-tab-form-btn');
  const listBtn = document.getElementById('log-tab-list-btn');
  const formContent = document.getElementById('log-tab-form-content');
  const listContent = document.getElementById('log-tab-list-content');

  if (formBtn && listBtn && formContent && listContent) {
    if (tab === 'form') {
      formBtn.classList.add('active');
      formBtn.style.color = 'var(--teal)';
      formBtn.style.borderBottom = '2px solid var(--teal)';
      formBtn.style.fontWeight = '600';

      listBtn.classList.remove('active');
      listBtn.style.color = 'var(--muted)';
      listBtn.style.borderBottom = '2px solid transparent';
      listBtn.style.fontWeight = '500';

      formContent.style.display = 'block';
      listContent.style.display = 'none';
    } else {
      listBtn.classList.add('active');
      listBtn.style.color = 'var(--teal)';
      listBtn.style.borderBottom = '2px solid var(--teal)';
      listBtn.style.fontWeight = '600';

      formBtn.classList.remove('active');
      formBtn.style.color = 'var(--muted)';
      formBtn.style.borderBottom = '2px solid transparent';
      formBtn.style.fontWeight = '500';

      formContent.style.display = 'none';
      listContent.style.display = 'block';

      dom.renderFullLogsList(savedLogs, tuneData);
    }
  }
}

function toggleTuneFields() {
  const checkbox = document.getElementById('log-has-tune-checkbox');
  const container = document.getElementById('log-tune-fields-container');
  if (!checkbox || !container) return;

  const inputs = container.querySelectorAll('input, select');
  if (checkbox.checked) {
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
    inputs.forEach(input => input.removeAttribute('disabled'));
  } else {
    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';
    inputs.forEach(input => {
      if (input.id !== 'log-tunenum') {
        input.setAttribute('disabled', 'true');
        input.value = '';
      } else {
        input.setAttribute('disabled', 'true');
      }
    });
  }
}

function updateAutoIncrementedFields() {
  const config = getActiveConfig();
  const elTemp = document.getElementById('log-temp');
  if (elTemp && !elTemp.value) elTemp.value = '23';

  if (config.hasTune) {
    const nextTuneNum = tuneData.length > 0 ? Math.max(...tuneData.map(t => t.num || 0)) + 1 : 1;
    const elTuneNum = document.getElementById('log-tunenum');
    if (elTuneNum) elTuneNum.value = nextTuneNum;
  }
}

async function saveLog() {
  if (!isUserAuthorized()) return openLoginModal();

  const config = getActiveConfig();
  const date = document.getElementById('log-date').value;
  const op = document.getElementById('log-op').value.trim();
  const temp = document.getElementById('log-temp').value.trim();
  const sistema = document.getElementById('log-sistema').value;
  const inj = document.getElementById('log-inj').value.trim();
  const obs = document.getElementById('log-obs').value.trim();

  if (!op) { alert('O campo Operador (iniciais) é obrigatório.'); return; }
  if (!temp) { alert('O campo Temperatura Ambiente (Tamb) é obrigatório.'); return; }
  if (!sistema) { alert('O campo Sistema é obrigatório.'); return; }

  // Extract dynamic parameters
  const payload = {
    equipment_id: currentEquipmentId,
    date,
    op,
    sistema,
    inj: parseInt(inj) || 0,
    tamb: parseFloat(temp),
    obs
  };

  config.logFields.forEach(f => {
    // Skip core fields
    if (['date', 'op', 'sistema', 'inj', 'tamb', 'obs'].includes(f.id)) return;
    const el = document.getElementById(`log-${f.id}`);
    if (el) {
      if (f.type === 'number') {
        payload[f.id] = el.value !== '' ? parseFloat(el.value) : null;
      } else {
        payload[f.id] = el.value;
      }
    }
  });

  const hasTune = config.hasTune && document.getElementById('log-has-tune-checkbox').checked;

  if (hasTune) {
    const filVal = document.getElementById('log-fil').value;
    const emvVal = document.getElementById('log-emv').value;
    if (!filVal) { alert('Selecione o Filamento.'); return; }
    if (!emvVal) { alert('Informe a tensão de EMV.'); return; }
  }

  try {
    const logRes = await api.saveLog(payload);
    savedLogs = logRes.savedLogs;

    if (hasTune) {
      const tuneNum = document.getElementById('log-tunenum').value;
      const tunePayload = {
        equipment_id: currentEquipmentId,
        num: parseInt(tuneNum),
        date: date,
        op: op
      };
      config.tuneFields.forEach(f => {
        if (f.id === 'num') return;
        const el = document.getElementById(`log-${f.id}`);
        if (el) {
          tunePayload[f.id] = el.value !== '' ? parseFloat(el.value) : null;
        }
      });

      const tuneRes = await api.saveTune(tunePayload);
      tuneData = tuneRes.tuneData;
    }

    // Dynamic in-memory UI update (No page reload)
    dom.renderStatusGeral(savedLogs, tuneData, config);
    dom.renderMaintenanceSchedule(savedLogs, config);
    dom.renderFullLogsList(savedLogs, tuneData);
    if (config.hasTune) {
      dom.renderTuneTable(tuneData, tuneCurrentPage);
    }
    dom.renderLogForm(config, savedLogs[savedLogs.length - 1], columns);
    charts.initCharts(tuneData, injectByMonth, config);
    populateAnalysisYears();
    updateAnalysisPage();

    alert('Registro salvo com sucesso!');
    showPage('status');
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar o registro diário: ' + err.message);
  }
}

// =====================================================================
// COLUMNS & BOOKINGS OPERATIONS
// =====================================================================
function openColumnModal() {
  document.getElementById('column-modal').classList.add('show');
  document.getElementById('col-install-date').value = new Date().toISOString().split('T')[0];
  ['col-model', 'col-serial', 'col-project', 'col-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function closeColumnModal() {
  document.getElementById('column-modal').classList.remove('show');
}

async function saveColumn() {
  if (!isUserAuthorized()) return openLoginModal();
  
  const type = document.getElementById('col-type').value;
  const model = document.getElementById('col-model').value.trim();
  const serial = document.getElementById('col-serial').value.trim();
  const install_date = document.getElementById('col-install-date').value;
  const initial_length = parseFloat(document.getElementById('col-initial-length').value || 30);
  const status = document.getElementById('col-status').value;
  const project = document.getElementById('col-project').value.trim();
  const obs = document.getElementById('col-obs').value.trim();

  if (!model || !install_date) {
    alert('Os campos de modelo e data são obrigatórios.');
    return;
  }

  try {
    const colRes = await api.saveColumn({
      equipment_id: currentEquipmentId,
      type, model, serial, install_date, initial_length, status, project, obs
    });
    columns = colRes.columns;
    
    dom.renderColumnHistory(columns, deleteColumn);
    dom.renderLogForm(getActiveConfig(), savedLogs[savedLogs.length - 1], columns);
    closeColumnModal();
    alert('Coluna cadastrada com sucesso!');
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar coluna: ' + err.message);
  }
}

async function deleteColumn(id) {
  if (!isUserAuthorized()) return openLoginModal();
  if (!confirm('Deseja realmente excluir esta coluna?')) return;

  try {
    const colRes = await api.deleteColumn(id, currentEquipmentId);
    columns = colRes.columns;
    dom.renderColumnHistory(columns, deleteColumn);
    dom.renderLogForm(getActiveConfig(), savedLogs[savedLogs.length - 1], columns);
  } catch (err) {
    console.error(err);
    alert('Erro ao excluir coluna.');
  }
}

function switchBookingTab(tab) {
  const formBtn = document.getElementById('booking-tab-form-btn');
  const listBtn = document.getElementById('booking-tab-list-btn');
  const formContent = document.getElementById('booking-tab-form-content');
  const listContent = document.getElementById('booking-tab-list-content');

  if (formBtn && listBtn && formContent && listContent) {
    if (tab === 'form') {
      formBtn.classList.add('active');
      formBtn.style.color = 'var(--teal)';
      formBtn.style.borderBottom = '2px solid var(--teal)';
      formBtn.style.fontWeight = '600';

      listBtn.classList.remove('active');
      listBtn.style.color = 'var(--muted)';
      listBtn.style.borderBottom = '2px solid transparent';
      listBtn.style.fontWeight = '500';

      formContent.style.display = 'block';
      listContent.style.display = 'none';
    } else {
      listBtn.classList.add('active');
      listBtn.style.color = 'var(--teal)';
      listBtn.style.borderBottom = '2px solid var(--teal)';
      listBtn.style.fontWeight = '600';

      formBtn.classList.remove('active');
      formBtn.style.color = 'var(--muted)';
      formBtn.style.borderBottom = '2px solid transparent';
      formBtn.style.fontWeight = '500';

      formContent.style.display = 'none';
      listContent.style.display = 'block';

      dom.renderBookingCalendar(bookingsData, calendarCurrentYear, calendarCurrentMonth, onDayClick);
      dom.renderBookingsList(bookingsData, bookingCurrentPage, deleteBooking);
    }
  }
}

function prevBookingMonth() {
  calendarCurrentMonth--;
  if (calendarCurrentMonth < 0) {
    calendarCurrentMonth = 11;
    calendarCurrentYear--;
  }
  dom.renderBookingCalendar(bookingsData, calendarCurrentYear, calendarCurrentMonth, onDayClick);
}

function nextBookingMonth() {
  calendarCurrentMonth++;
  if (calendarCurrentMonth > 11) {
    calendarCurrentMonth = 0;
    calendarCurrentYear++;
  }
  dom.renderBookingCalendar(bookingsData, calendarCurrentYear, calendarCurrentMonth, onDayClick);
}

async function saveBooking() {
  if (!isUserAuthorized()) return openLoginModal();

  const start_date = document.getElementById('book-start-date').value;
  const end_date = document.getElementById('book-end-date').value;
  const operator = document.getElementById('book-operator').value.trim().toUpperCase();
  const requester = document.getElementById('book-requester').value.trim();
  const obs = document.getElementById('book-obs').value.trim();

  if (!start_date || !end_date || !operator || !requester) {
    alert("Por favor, preencha todos os campos obrigatórios (*).");
    return;
  }

  try {
    const bookRes = await api.saveBooking({
      equipment_id: currentEquipmentId,
      start_date, end_date, operator, requester, obs
    });
    bookingsData = bookRes.bookings;
    
    // Reset inputs
    ['book-start-date', 'book-end-date', 'book-operator', 'book-requester', 'book-obs'].forEach(id => {
      document.getElementById(id).value = '';
    });

    alert("Reserva de equipamento registrada com sucesso!");
    switchBookingTab('list');
    renderSidebarCalendar();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteBooking(id) {
  if (!isUserAuthorized()) return openLoginModal();
  if (!confirm('Deseja cancelar esta reserva?')) return;

  try {
    const bookRes = await api.deleteBooking(id, currentEquipmentId);
    bookingsData = bookRes.bookings;
    dom.renderBookingCalendar(bookingsData, calendarCurrentYear, calendarCurrentMonth, onDayClick);
    dom.renderBookingsList(bookingsData, bookingCurrentPage, deleteBooking);
    renderSidebarCalendar();
    closeBookingDetailModal();
  } catch (err) {
    console.error(err);
    alert('Erro ao cancelar reserva.');
  }
}

function renderSidebarCalendar() {
  dom.renderBookingCalendar(bookingsData, new Date().getFullYear(), new Date().getMonth(), onDayClick);
  // Transfer outer grid to sidebar container
  const grid = document.querySelector('.booking-calendar-grid');
  const sidebarContainer = document.getElementById('sidebar-calendar-container');
  if (grid && sidebarContainer) {
    const clone = grid.cloneNode(true);
    // simplify clone to draw dots only
    sidebarContainer.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'sidebar-calendar-title';
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    label.textContent = `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;
    sidebarContainer.appendChild(label);

    const miniGrid = document.createElement('div');
    miniGrid.className = 'sidebar-calendar-grid';
    // Days headers
    miniGrid.innerHTML = `
      <div class="sidebar-calendar-header-day">D</div>
      <div class="sidebar-calendar-header-day">S</div>
      <div class="sidebar-calendar-header-day">T</div>
      <div class="sidebar-calendar-header-day">Q</div>
      <div class="sidebar-calendar-header-day">Q</div>
      <div class="sidebar-calendar-header-day">S</div>
      <div class="sidebar-calendar-header-day">S</div>
    `;

    // Empty cells for first day of month alignment
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
    const totalDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      miniGrid.innerHTML += '<div class="sidebar-calendar-day-cell empty"></div>';
    }

    const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    for (let d = 1; d <= totalDays; d++) {
      const cellDateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isBooked = bookingsData.some(b => cellDateStr >= toISO(b.start_date) && cellDateStr <= toISO(b.end_date));
      const isToday = todayISO === cellDateStr;
      
      miniGrid.innerHTML += `
        <div class="sidebar-calendar-day-cell ${isBooked ? 'booked' : ''} ${isToday ? 'today' : ''}">
          ${d}
        </div>
      `;
    }
    sidebarContainer.appendChild(miniGrid);
  }
}

function onDayClick(dateStr, dayBookings) {
  if (dayBookings.length === 0) return;
  const b = dayBookings[0];
  const modal = document.getElementById('booking-detail-modal');
  const content = document.getElementById('booking-det-content');
  const deleteBtn = document.getElementById('btn-delete-booking');

  if (modal && content) {
    const period = b.start_date === b.end_date ? formatDisplayDate(b.start_date) : `${formatDisplayDate(b.start_date)} a ${formatDisplayDate(b.end_date)}`;
    content.innerHTML = `
      <div style="margin-bottom:12px;"><strong style="color:var(--muted);">Período:</strong> <span style="font-size:15px; font-weight:600; color:var(--text);">${period}</span></div>
      <div style="margin-bottom:12px;"><strong style="color:var(--muted);">Solicitante da Reserva:</strong> <span style="color:var(--text);">${b.requester}</span></div>
      <div style="margin-bottom:12px;"><strong style="color:var(--muted);">Operador Responsável:</strong> <span style="font-family:'Space Mono', monospace; color:var(--teal); font-weight:600;">${b.operator}</span></div>
      <div style="margin-bottom:12px;"><strong style="color:var(--muted);">Observações:</strong></div>
      <div style="background:var(--bg3); padding:10px; border-radius:6px; border:1px solid var(--border); min-height:60px; color:var(--label); white-space:pre-wrap;">${b.obs || 'Nenhuma observação informada.'}</div>
    `;
    deleteBtn.onclick = () => deleteBooking(b.id);
    modal.classList.add('show');
  }
}

function closeBookingDetailModal() {
  document.getElementById('booking-detail-modal').classList.remove('show');
}

// =====================================================================
// CORRECTIVE MAINTENANCE
// =====================================================================
async function saveCorrectiveMaint() {
  if (!isUserAuthorized()) return openLoginModal();

  const date = document.getElementById('cor-date').value;
  const resp = document.getElementById('cor-resp').value.trim();
  const sup = document.getElementById('cor-sup').value.trim();
  const prob = document.getElementById('cor-prob').value.trim();
  const proc = document.getElementById('cor-proc').value.trim();
  const result = document.getElementById('cor-result').value.trim();

  if (!date || !prob) {
    alert('Preencha a data e o problema da manutenção corretiva.');
    return;
  }

  try {
    const corRes = await api.saveCorrective({
      equipment_id: currentEquipmentId,
      date, resp, sup, prob, proc, result
    });
    correctiveRecords = corRes.correctiveRecords;
    
    dom.renderCorrectiveTable(correctiveRecords, openCorrectiveModal);
    updateAnalysisPage();
    alert('Manutenção corretiva registrada!');
    
    // Clear inputs
    ['cor-date', 'cor-resp', 'cor-sup', 'cor-prob', 'cor-proc', 'cor-result'].forEach(id => {
      document.getElementById(id).value = '';
    });
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar manutenção corretiva.');
  }
}

async function deleteCorrective(id) {
  if (!isUserAuthorized()) return openLoginModal();
  if (!confirm('Deseja realmente excluir este registro?')) return;

  try {
    const corRes = await api.deleteCorrective(id, currentEquipmentId);
    correctiveRecords = corRes.correctiveRecords;
    dom.renderCorrectiveTable(correctiveRecords, openCorrectiveModal);
    updateAnalysisPage();
    closeCorrectiveModal();
  } catch (err) {
    console.error(err);
    alert('Erro ao excluir manutenção.');
  }
}

function openCorrectiveModal(record) {
  const modal = document.getElementById('corrective-detail-modal');
  const content = document.getElementById('det-content');
  const deleteBtn = document.getElementById('btn-delete-corrective');

  if (modal && content) {
    modal.classList.add('show');
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
    deleteBtn.onclick = () => deleteCorrective(record.id);
  }
}

function closeCorrectiveModal() {
  document.getElementById('corrective-detail-modal').classList.remove('show');
}

// =====================================================================
// DETAIL VIEW MODALS: LOG DETAILS & TUNE DETAILS
// =====================================================================
function openLogDetailModal(id) {
  const log = savedLogs.find(l => l.id === id);
  if (!log) return;

  const modal = document.getElementById('log-detail-modal');
  const title = document.getElementById('log-det-title');
  const content = document.getElementById('log-det-content');
  const matchedTune = tuneData.find(t => toISO(t.date) === toISO(log.date));
  const config = getActiveConfig();

  if (!modal || !title || !content) return;

  title.innerHTML = `Registro Diário — <span style="color:var(--teal)">${formatDisplayDate(log.date)}</span>`;

  // Standard fields
  let generalGridHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; margin-bottom:16px;">
      <div>
        <span style="color:var(--muted); font-size:11px; display:block;">OPERADOR</span>
        <strong style="color:var(--text); font-size:13px;">${log.op || '—'}</strong>
      </div>
      <div>
        <span style="color:var(--muted); font-size:11px; display:block;">STATUS DO SISTEMA</span>
        <strong style="color:var(--text); font-size:13px;">${log.sistema || '—'}</strong>
      </div>
      <div>
        <span style="color:var(--muted); font-size:11px; display:block;">TEMP. AMBIENTE (Tamb)</span>
        <strong style="color:var(--text); font-size:13px;">${log.tamb ? log.tamb + ' °C' : '—'}</strong>
      </div>
      <div>
        <span style="color:var(--muted); font-size:11px; display:block;">INJEÇÕES REALIZADAS</span>
        <strong style="color:var(--text); font-size:13px;">${log.inj || 0} injeções</strong>
      </div>
  `;

  // Custom log parameters fields
  config.logFields.forEach(f => {
    if (['date', 'op', 'sistema', 'inj', 'tamb', 'obs'].includes(f.id)) return;
    const val = log[f.id] !== undefined && log[f.id] !== null ? log[f.id] : '—';
    generalGridHTML += `
      <div>
        <span style="color:var(--muted); font-size:11px; display:block;">${f.label.toUpperCase()}</span>
        <strong style="color:var(--text); font-size:13px;">${val}</strong>
      </div>
    `;
  });
  generalGridHTML += `</div>`;

  const logInfoHTML = `
    <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
      <h3 style="color:var(--teal); margin-top:0; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:8px; font-size:15px;">
        📋 Informações Gerais
      </h3>
      ${generalGridHTML}
      <h4 style="color:var(--text); margin-top:0; margin-bottom:4px; font-size:12px; font-weight:600;">Observações</h4>
      <div style="background:var(--bg3); padding:10px; border-radius:6px; font-size:12px; color:var(--label); font-style:italic; line-height:1.4; border:1px solid var(--border)">
        ${log.obs || 'Nenhuma observação registrada.'}
      </div>
    </div>
  `;

  let tuneHTML = '';
  if (matchedTune) {
    tuneHTML = `
      <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border)">
        <h3 style="color:var(--teal); margin-top:0; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:8px; font-size:15px; display:flex; justify-content:space-between; align-items:center;">
          <span>⚡ Dados de Tune Associados</span>
          <span class="metric-badge badge-ok" style="font-size:11px">Tune #${matchedTune.num}</span>
        </h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
    `;
    config.tuneFields.forEach(f => {
      const val = matchedTune[f.id] !== undefined ? matchedTune[f.id] : '—';
      tuneHTML += `
        <div>
          <span style="color:var(--muted); font-size:11px; display:block;">${f.label.toUpperCase()}</span>
          <strong style="color:var(--text); font-size:13px;">${val}</strong>
        </div>
      `;
    });
    tuneHTML += `
        </div>
      </div>
    `;
  } else {
    tuneHTML = `
      <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; height:100%; min-height:220px;">
        <span style="font-size:32px; margin-bottom:12px;">⚡</span>
        <h4 style="color:var(--muted); margin:0 0 8px 0; font-size:14px;">Nenhum Tune Realizado</h4>
        <p style="color:var(--label); font-size:11px; max-width:240px; margin:0; line-height:1.4;">
          Não há registro de tune para esta data.
        </p>
      </div>
    `;
  }

  content.innerHTML = `
    <div style="display:grid; grid-template-columns:${matchedTune ? '1fr 1fr' : '1fr'}; gap:20px;">
      ${logInfoHTML}
      ${tuneHTML}
    </div>
  `;

  modal.classList.add('show');
}

function closeLogDetailModal() {
  document.getElementById('log-detail-modal').classList.remove('show');
}

function openTuneDetailModal(num) {
  const tune = tuneData.find(t => t.num === num);
  if (!tune) return;

  const modal = document.getElementById('tune-detail-modal');
  const title = document.getElementById('tune-det-title');
  const content = document.getElementById('tune-det-content');
  const matchedLog = savedLogs.find(l => toISO(l.date) === toISO(tune.date));
  const config = getActiveConfig();

  if (!modal || !title || !content) return;

  title.innerHTML = `Histórico de Tune — <span style="color:var(--teal)">Tune #${tune.num}</span>`;

  let tuneHTML = `
    <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border)">
      <h3 style="color:var(--teal); margin-top:0; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:8px; font-size:15px;">
        📊 Parâmetros do Tune
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
  `;
  config.tuneFields.forEach(f => {
    if (f.id === 'num') return;
    const val = tune[f.id] !== undefined ? tune[f.id] : '—';
    tuneHTML += `
      <div>
        <span style="color:var(--muted); font-size:11px; display:block;">${f.label.toUpperCase()}</span>
        <strong style="color:var(--text); font-size:13px;">${val}</strong>
      </div>
    `;
  });
  tuneHTML += `
      </div>
    </div>
  `;

  let logHTML = '';
  if (matchedLog) {
    logHTML = `
      <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border)">
        <h3 style="color:var(--teal); margin-top:0; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:8px; font-size:15px;">
          <span>📝 Registro Diário Associado</span>
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
            <span style="color:var(--muted); font-size:11px; display:block;">INJEÇÕES REGISTRADAS</span>
            <strong style="color:var(--text); font-size:13px;">${matchedLog.inj || 0} injeções</strong>
          </div>
        </div>
      </div>
    `;
  } else {
    logHTML = `
      <div style="background:var(--bg2); padding:16px; border-radius:8px; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; height:100%; min-height:220px;">
        <span style="font-size:32px; margin-bottom:12px;">📝</span>
        <h4 style="color:var(--muted); margin:0 0 8px 0; font-size:14px;">Sem Registro Diário</h4>
        <p style="color:var(--label); font-size:11px; max-width:240px; margin:0 0 12px 0;">
          Não há registro diário correspondente para esta data.
        </p>
        <button class="btn btn-outline" style="font-size:11px; padding:4px 12px;" onclick="window.showPageWithTuneData('${tune.date}', ${tune.num})">
          + Criar Registro Diário
        </button>
      </div>
    `;
  }

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
  switchLogTab('form');

  const dateInput = document.getElementById('log-date');
  if (dateInput) {
    dateInput.disabled = false;
    dateInput.value = toISO(tuneDate);
    dateInput.disabled = true;
  }

  const tuneNumInput = document.getElementById('log-tunenum');
  if (tuneNumInput) tuneNumInput.value = tuneNum;

  const checkbox = document.getElementById('log-has-tune-checkbox');
  if (checkbox) {
    checkbox.checked = true;
    toggleTuneFields();
  }
}

// =====================================================================
// ANNUAL ANALYSIS PAGE POPULATOR
// =====================================================================
function populateAnalysisYears() {
  const select = document.getElementById('analysis-year-select');
  if (!select) return;

  const yearsSet = new Set();
  tuneData.forEach(t => { const yr = parseYear(t.date); if (yr) yearsSet.add(yr); });
  savedLogs.forEach(l => { const yr = parseYear(l.date); if (yr) yearsSet.add(yr); });
  correctiveRecords.forEach(c => { const yr = parseYear(c.date); if (yr) yearsSet.add(yr); });

  const currentYear = new Date().getFullYear();
  yearsSet.add(currentYear);

  const years = Array.from(yearsSet).sort((a, b) => b - a);
  select.innerHTML = years.map(yr => `<option value="${yr}">${yr}</option>`).join('');
  select.value = currentYear;
}

function parseYear(s) {
  if (!s) return null;
  const m = String(s).trim().match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1]) : null;
}

function updateAnalysisPage() {
  const select = document.getElementById('analysis-year-select');
  if (!select) return;
  const year = parseInt(select.value) || new Date().getFullYear();
  
  const config = getActiveConfig();
  dom.updateAnalysisPage(savedLogs, tuneData, correctiveRecords, year, config);

  // Re-draw annual analysis charts
  const tunesYr = tuneData.filter(t => parseYear(t.date) === year);
  const logsYr = savedLogs.filter(l => parseYear(l.date) === year);
  
  const monthlyInjections = Array(12).fill(0);
  logsYr.forEach(log => {
    const month = parseInt(toISO(log.date).split('-')[1]);
    if (month >= 1 && month <= 12) {
      monthlyInjections[month - 1] += parseInt(log.inj) || 0;
    }
  });

  charts.initAnualCharts(tunesYr, monthlyInjections, year, config);
}

// =====================================================================
// GENERAL COMPATIBILITY HELPERS
// =====================================================================
function toggleCheck(i, row) {
  const ico = document.getElementById('chk-ico-' + i);
  const label = document.getElementById('chk-label-' + i);
  const checked = ico.textContent === '✓';
  ico.textContent = checked ? '○' : '✓';
  ico.style.color = checked ? 'var(--muted)' : 'var(--green)';
  label.style.color = checked ? 'var(--label)' : 'var(--text)';
  
  const items = document.querySelectorAll('#check-items .ind-name');
  const done = items.length - [...document.querySelectorAll('#check-items [id^=chk-ico]')].filter(e => e.textContent === '○').length;
  
  document.getElementById('check-count').textContent = done + '/' + items.length;
  document.getElementById('check-bar').style.width = (done / items.length * 100) + '%';
}

function toggleTrouble(i) {
  const body = document.getElementById('trouble-' + i);
  const chev = document.getElementById('chev-' + i);
  if (body && chev) {
    body.classList.toggle('open');
    chev.classList.toggle('open');
  }
}

function onTuneSearchInput() {
  tuneCurrentPage = 1;
  dom.renderTuneTable(tuneData, tuneCurrentPage);
}

function changeTunePage(page) {
  tuneCurrentPage = page;
  dom.renderTuneTable(tuneData, tuneCurrentPage);
}

function onLogSearchInput() {
  dom.renderFullLogsList(savedLogs, tuneData);
}

function searchBookingsByMonth() {
  const input = document.getElementById('book-search-month');
  if (input) {
    bookingSearchMonth = input.value;
    bookingCurrentPage = 1;
    dom.renderBookingsList(bookingsData, bookingCurrentPage, deleteBooking);
  }
}

function clearBookingMonthSearch() {
  const input = document.getElementById('book-search-month');
  if (input) input.value = '';
  bookingSearchMonth = '';
  bookingCurrentPage = 1;
  dom.renderBookingsList(bookingsData, bookingCurrentPage, deleteBooking);
}

// =====================================================================
// MOBILE NAVIGATION & EQUIPMENT MANAGEMENT
// =====================================================================
function toggleMobileSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sb && overlay) {
    sb.classList.toggle('open');
    overlay.classList.toggle('show');
  }
}

function closeMobileSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sb && overlay) {
    sb.classList.remove('open');
    overlay.classList.remove('show');
  }
}

function openEquipmentModal() {
  if (!isUserAuthorized()) return openLoginModal();
  const modal = document.getElementById('equipment-modal');
  if (modal) {
    document.getElementById('eq-name').value = '';
    document.getElementById('eq-model').value = '';
    document.getElementById('eq-desc').value = '';
    modal.style.display = 'flex';
  }
}

function closeEquipmentModal() {
  const modal = document.getElementById('equipment-modal');
  if (modal) modal.style.display = 'none';
}

async function saveEquipment() {
  if (!isUserAuthorized()) return openLoginModal();
  const name = document.getElementById('eq-name').value.trim();
  const model = document.getElementById('eq-model').value.trim();
  const equipment_type = document.getElementById('eq-type').value;
  const description = document.getElementById('eq-desc').value.trim();

  if (!name || !model) {
    alert('Por favor, preencha o Nome e o Modelo do equipamento.');
    return;
  }

  try {
    const res = await api.createEquipment({ name, model, equipment_type, description });
    if (res.success) {
      equipmentsList = res.equipments;
      dom.renderHub(equipmentsList, openEquipment);
      closeEquipmentModal();
      alert('Equipamento cadastrado com sucesso!');
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao cadastrar equipamento: ' + err.message);
  }
}

async function deleteEquipment(id, name) {
  if (!isUserAuthorized()) return openLoginModal();
  if (!confirm(`Deseja realmente excluir o equipamento "${name}" e todos os seus registros?`)) return;

  try {
    const res = await api.deleteEquipment(id);
    if (res.success) {
      equipmentsList = res.equipments;
      dom.renderHub(equipmentsList, openEquipment);
      alert('Equipamento excluído com sucesso.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao excluir equipamento: ' + err.message);
  }
}

// =====================================================================
// EXPOSE GLOBAL ROUTINES TO WINDOW SCOPE
// =====================================================================
window.showPage = showPage;
window.showHub = showHub;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.performLogin = performLogin;
window.logout = logout;
window.generatePDF = () => {
  const select = document.getElementById('analysis-year-select');
  const year = select ? parseInt(select.value) : new Date().getFullYear();
  pdf.generatePDF(year, tuneData, savedLogs, correctiveRecords, getActiveConfig());
};
window.switchLogTab = switchLogTab;
window.switchBookingTab = switchBookingTab;
window.toggleTuneFields = toggleTuneFields;
window.toggleCheck = toggleCheck;
window.toggleTrouble = toggleTrouble;
window.saveLog = saveLog;
window.saveCorrectiveMaint = saveCorrectiveMaint;
window.saveColumn = saveColumn;
window.saveBooking = saveBooking;
window.deleteColumn = deleteColumn;
window.deleteBooking = deleteBooking;
window.prevBookingMonth = prevBookingMonth;
window.nextBookingMonth = nextBookingMonth;
window.openColumnModal = openColumnModal;
window.closeColumnModal = closeColumnModal;
window.closeCorrectiveModal = closeCorrectiveModal;
window.closeTuneDetailModal = closeTuneDetailModal;
window.closeLogDetailModal = closeLogDetailModal;
window.closeBookingDetailModal = closeBookingDetailModal;
window.onTuneSearchInput = onTuneSearchInput;
window.onLogSearchInput = onLogSearchInput;
window.changeTunePage = changeTunePage;
window.searchBookingsByMonth = searchBookingsByMonth;
window.clearBookingMonthSearch = clearBookingMonthSearch;
window.updateAnalysisPage = updateAnalysisPage;
window.openLogDetailModal = openLogDetailModal;
window.openTuneDetailModal = openTuneDetailModal;
window.showPageWithTuneData = showPageWithTuneData;
window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.openEquipmentModal = openEquipmentModal;
window.closeEquipmentModal = closeEquipmentModal;
window.saveEquipment = saveEquipment;
window.deleteEquipment = deleteEquipment;

// =====================================================================
// DOCUMENT INITIALIZATION
// =====================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Set date field values
  const d = new Date();
  const sidebarDate = document.getElementById('sidebar-date');
  if (sidebarDate) {
    sidebarDate.textContent = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  }
  const logDateInput = document.getElementById('log-date');
  if (logDateInput) {
    logDateInput.value = d.toISOString().split('T')[0];
  }

  // Load backend configurations
  try {
    equipmentsConfig = await api.getEquipmentsConfig();
  } catch (e) {
    console.error("Erro ao carregar configurações de equipamentos:", e);
  }

  checkAuthState();
  showHub();
});
