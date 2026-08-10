// API Client module to communicate with the Node.js backend.

function getHeaders() {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

export async function getEquipments() {
  const res = await fetch('/api/equipments');
  if (!res.ok) throw new Error("Erro ao buscar equipamentos.");
  return res.json();
}

export async function createEquipment(equipment) {
  const res = await fetch('/api/equipments', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(equipment)
  });
  if (!res.ok) throw new Error("Não autorizado ou erro ao criar equipamento.");
  return res.json();
}

export async function deleteEquipment(id) {
  const res = await fetch(`/api/equipments/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Não autorizado ou erro ao excluir equipamento.");
  return res.json();
}

export async function getEquipmentsConfig() {
  const res = await fetch('/api/equipments/config');
  if (!res.ok) throw new Error("Erro ao buscar configurações.");
  return res.json();
}

export async function getEquipmentData(equipmentId) {
  const res = await fetch(`/api/data?equipment_id=${equipmentId}`);
  if (!res.ok) throw new Error("Erro ao buscar dados do equipamento.");
  return res.json();
}

export async function saveTune(tune) {
  const res = await fetch('/api/tune', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(tune)
  });
  if (!res.ok) throw new Error("Não autorizado ou erro no servidor.");
  return res.json();
}

export async function saveLog(log) {
  const res = await fetch('/api/logs', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(log)
  });
  if (!res.ok) throw new Error("Não autorizado ou erro no servidor.");
  return res.json();
}

export async function saveCorrective(record) {
  const res = await fetch('/api/corrective', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new Error("Não autorizado ou erro no servidor.");
  return res.json();
}

export async function deleteCorrective(id, equipmentId) {
  const res = await fetch(`/api/corrective/${id}?equipment_id=${equipmentId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Não autorizado ou erro no servidor.");
  return res.json();
}

export async function getColumns(equipmentId) {
  const res = await fetch(`/api/columns?equipment_id=${equipmentId}`);
  if (!res.ok) throw new Error("Erro ao buscar colunas.");
  return res.json();
}

export async function saveColumn(column) {
  const res = await fetch('/api/columns', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(column)
  });
  if (!res.ok) throw new Error("Não autorizado ou erro no servidor.");
  return res.json();
}

export async function deleteColumn(id, equipmentId) {
  const res = await fetch(`/api/columns/${id}?equipment_id=${equipmentId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Não autorizado ou erro no servidor.");
  return res.json();
}

export async function saveBooking(booking) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(booking)
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Erro ao salvar agendamento.");
  }
  return res.json();
}

export async function deleteBooking(id, equipmentId) {
  const res = await fetch(`/api/bookings/${id}?equipment_id=${equipmentId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Não autorizado ou erro no servidor.");
  return res.json();
}
