const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { getDB, initDB } = require('./db');
const equipmentsConfig = require('./config/equipments_config');

const app = express();
const PORT = 3000;
const LOG_PATH = path.join(__dirname, '..', 'log_uso.txt');
const JWT_SECRET = 'qQqq_TSQ9610_s3cr3t_K3y_!@#';

app.use(cors());
app.use(express.json());
// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

function appendTxtLog(message) {
    const timestamp = new Date().toLocaleString('pt-BR');
    const logLine = `[${timestamp}] ${message}\n`;
    fs.promises.appendFile(LOG_PATH, logLine).catch(err => console.error("Error writing text log:", err));
}

// Helpers for data conversion
const mergeJson = (row) => {
    if (!row) return row;
    const { data_json, ...rest } = row;
    let extra = {};
    try {
        if (data_json) extra = JSON.parse(data_json);
    } catch(e) {}
    return { ...rest, ...extra };
};

// Dynamic equipment status evaluator (Optimized with targeted SQL queries)
async function evaluateEquipmentStatus(db, eq, config) {
    const lastLog = await db.get('SELECT id, date, sistema, inj, tamb, data_json FROM saved_logs WHERE equipment_id = ? ORDER BY id DESC LIMIT 1', [eq.id]);
    if (!lastLog) return 'ok';

    // 1. Check offline status
    if (lastLog.sistema && (lastLog.sistema === 'Não' || lastLog.sistema === 'Nao' || lastLog.sistema.toLowerCase().startsWith('n'))) {
        eq.offDate = lastLog.date;
        return 'offline';
    }

    // 2. Optimized calculation for accumulated injections since last part replacement
    let replaceField = 'liner';
    if (eq.equipment_type === 'generic-hplc') {
        replaceField = 'frit';
    }

    // Find latest log id where the part was replaced
    const swapRow = await db.get(
        `SELECT id FROM saved_logs WHERE equipment_id = ? AND json_extract(data_json, '$.' || ?) = 'SIM' ORDER BY id DESC LIMIT 1`,
        [eq.id, replaceField]
    );

    let accumulatedInjections = 0;
    if (swapRow && swapRow.id) {
        const sumRes = await db.get('SELECT SUM(inj) as total FROM saved_logs WHERE equipment_id = ? AND id >= ?', [eq.id, swapRow.id]);
        accumulatedInjections = (sumRes && sumRes.total) ? sumRes.total : 0;
    } else {
        const sumRes = await db.get('SELECT SUM(inj) as total FROM saved_logs WHERE equipment_id = ?', [eq.id]);
        accumulatedInjections = (sumRes && sumRes.total) ? sumRes.total : 0;
    }

    // Get last tune
    const lastTune = await db.get('SELECT data_json FROM tune_data WHERE equipment_id = ? ORDER BY num DESC LIMIT 1', [eq.id]);
    const lastTuneData = lastTune ? JSON.parse(lastTune.data_json || '{}') : {};
    const lastLogData = JSON.parse(lastLog.data_json || '{}');

    // Create state map to evaluate status rules
    const stats = {
        linerInjections: accumulatedInjections,
        inj: lastLog.inj || 0,
        sistema: lastLog.sistema,
        tamb: lastLog.tamb,
        ...lastLogData,
        ...lastTuneData
    };

    const rules = config.statusRules || {};

    const checkCondition = (rule) => {
        const val = stats[rule.field];
        if (val === undefined || val === null) return false;
        if (rule.operator === '>=') return parseFloat(val) >= rule.value;
        if (rule.operator === '<=') return parseFloat(val) <= rule.value;
        if (rule.operator === '>') return parseFloat(val) > rule.value;
        if (rule.operator === '<') return parseFloat(val) < rule.value;
        if (rule.operator === '==') return val == rule.value;
        if (rule.operator === 'in') return rule.values.includes(val);
        return false;
    };

    // Check critical state (noop)
    if (rules.noop) {
        const isNoOp = rules.noop.some(checkCondition);
        if (isNoOp) return 'noop';
    }

    // Check warning state (alert)
    if (rules.alert) {
        const isAlert = rules.alert.some(checkCondition);
        if (isAlert) return 'alert';
    }

    return 'ok';
}

// REST API Endpoints

// Authentication
app.post('/api/login', async (req, res) => {
    try {
        const db = await getDB();
        const { username, password } = req.body;
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (user && bcrypt.compareSync(password, user.password_hash)) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
            const perms = await db.all('SELECT equipment_id FROM user_permissions WHERE user_id = ?', [user.id]);
            res.json({ success: true, token, permissions: perms.map(p => p.equipment_id), username: user.username });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Configurations endpoint
app.get('/api/equipments/config', (req, res) => {
    res.json(equipmentsConfig);
});

// Equipment List (with dynamic status assessment)
app.get('/api/equipments', async (req, res) => {
    try {
        const db = await getDB();
        const eqs = await db.all('SELECT * FROM equipments');
        for (let eq of eqs) {
            const config = equipmentsConfig[eq.equipment_type] || equipmentsConfig['tsq-9610'];
            eq.status = await evaluateEquipmentStatus(db, eq, config);
        }
        res.json(eqs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create New Equipment
app.post('/api/equipments', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const { name, model, description, equipment_type } = req.body;
        if (!name || !model) {
            return res.status(400).json({ error: 'Nome e Modelo do equipamento são obrigatórios.' });
        }
        const result = await db.run(
            'INSERT INTO equipments (name, model, description, equipment_type, status) VALUES (?, ?, ?, ?, ?)',
            [name, model, description || '', equipment_type || 'tsq-9610', 'ok']
        );
        const newId = result.lastID;
        // Grant permissions to admin user by default
        await db.run('INSERT OR IGNORE INTO user_permissions (user_id, equipment_id) VALUES (1, ?)', [newId]);
        appendTxtLog(`Novo equipamento '${name}' (ID: ${newId}) cadastrado por ${req.user ? req.user.username : 'admin'}.`);

        const eqs = await db.all('SELECT * FROM equipments');
        for (let eq of eqs) {
            const config = equipmentsConfig[eq.equipment_type] || equipmentsConfig['tsq-9610'];
            eq.status = await evaluateEquipmentStatus(db, eq, config);
        }
        res.json({ success: true, equipments: eqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Equipment
app.delete('/api/equipments/:id', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const { id } = req.params;
        await db.run('DELETE FROM equipments WHERE id = ?', [id]);
        await db.run('DELETE FROM saved_logs WHERE equipment_id = ?', [id]);
        await db.run('DELETE FROM tune_data WHERE equipment_id = ?', [id]);
        await db.run('DELETE FROM corrective_records WHERE equipment_id = ?', [id]);
        await db.run('DELETE FROM chromatographic_columns WHERE equipment_id = ?', [id]);
        await db.run('DELETE FROM bookings WHERE equipment_id = ?', [id]);
        await db.run('DELETE FROM user_permissions WHERE equipment_id = ?', [id]);

        appendTxtLog(`Equipamento ID ${id} e todos os seus registros associados foram excluídos.`);
        const eqs = await db.all('SELECT * FROM equipments');
        for (let eq of eqs) {
            const config = equipmentsConfig[eq.equipment_type] || equipmentsConfig['tsq-9610'];
            eq.status = await evaluateEquipmentStatus(db, eq, config);
        }
        res.json({ success: true, equipments: eqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Equipment Data (Logs, Tunes, Bookings, Columns)
app.get('/api/data', async (req, res) => {
    try {
        const db = await getDB();
        const eqId = req.query.equipment_id || 1;
        const tuneData = await db.all('SELECT * FROM tune_data WHERE equipment_id = ? ORDER BY num ASC', [eqId]);
        const logs = await db.all('SELECT * FROM saved_logs WHERE equipment_id = ? ORDER BY id ASC', [eqId]);
        const corrective = await db.all('SELECT * FROM corrective_records WHERE equipment_id = ? ORDER BY id ASC', [eqId]);

        const injectRows = await db.all('SELECT * FROM inject_by_month WHERE equipment_id = ? ORDER BY month_idx ASC', [eqId]);
        const injectByMonth = Array(12).fill(0);
        injectRows.forEach(row => { injectByMonth[row.month_idx] = row.count; });

        const columns = await db.all('SELECT * FROM chromatographic_columns WHERE equipment_id = ? ORDER BY id DESC', [eqId]);
        const bookings = await db.all('SELECT * FROM bookings WHERE equipment_id = ? ORDER BY start_date ASC, id ASC', [eqId]);

        res.json({
            tuneData: tuneData.map(mergeJson),
            injectByMonth: injectByMonth,
            savedLogs: logs.map(mergeJson),
            correctiveRecords: corrective,
            columns: columns,
            bookings: bookings
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save Tune
app.post('/api/tune', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const tune = req.body;
        const eqId = tune.equipment_id || 1;
        const { num, date, op, ...extra } = tune;

        await db.run(
            'INSERT INTO tune_data (equipment_id, num, date, op, data_json) VALUES (?, ?, ?, ?, ?)',
            [eqId, num, date, op, JSON.stringify(extra)]
        );

        appendTxtLog(`Novo Tune #${num} registrado pelo operador ${op || 'Desconhecido'} no Eq ${eqId}.`);

        const records = await db.all('SELECT * FROM tune_data WHERE equipment_id = ? ORDER BY num ASC', [eqId]);
        res.json({ success: true, tuneData: records.map(mergeJson) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save Daily Log
app.post('/api/logs', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const newLog = req.body;
        const eqId = newLog.equipment_id || 1;
        const { date, op, sistema, inj, tamb, obs, ...extra } = newLog;

        await db.run(
            'INSERT INTO saved_logs (equipment_id, date, op, sistema, inj, tamb, obs, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [eqId, date, op, sistema, parseInt(inj) || 0, parseFloat(tamb) || null, obs, JSON.stringify(extra)]
        );

        appendTxtLog(`Novo registro diário adicionado pelo operador ${op || 'Desconhecido'} no Eq ${eqId}. (Injeções: ${inj || 0})`);

        const logs = await db.all('SELECT * FROM saved_logs WHERE equipment_id = ? ORDER BY id ASC', [eqId]);
        res.json({ success: true, savedLogs: logs.map(mergeJson) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save Corrective Record
app.post('/api/corrective', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const newRecord = req.body;
        const eqId = newRecord.equipment_id || 1;
        await db.run(
            'INSERT INTO corrective_records (date, resp, sup, prob, proc, result, equipment_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newRecord.date, newRecord.resp, newRecord.sup, newRecord.prob, newRecord.proc, newRecord.result, eqId]
        );

        appendTxtLog(`Manutenção corretiva registrada no Eq ${eqId} por ${newRecord.resp} - Problema: ${newRecord.prob}`);

        const records = await db.all('SELECT * FROM corrective_records WHERE equipment_id = ? ORDER BY id ASC', [eqId]);
        res.json({ success: true, correctiveRecords: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Corrective Record
app.delete('/api/corrective/:id', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const { id } = req.params;
        const eqId = req.query.equipment_id || 1;
        await db.run('DELETE FROM corrective_records WHERE id = ? AND equipment_id = ?', [id, eqId]);
        appendTxtLog(`Registro de manutenção corretiva ID #${id} excluído.`);
        const records = await db.all('SELECT * FROM corrective_records WHERE equipment_id = ? ORDER BY id ASC', [eqId]);
        res.json({ success: true, correctiveRecords: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Chromatographic Columns
app.get('/api/columns', async (req, res) => {
    try {
        const db = await getDB();
        const eqId = req.query.equipment_id || 1;
        const cols = await db.all('SELECT * FROM chromatographic_columns WHERE equipment_id = ? ORDER BY id DESC', [eqId]);
        res.json(cols);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save Chromatographic Column
app.post('/api/columns', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const c = req.body;
        const eqId = c.equipment_id || 1;
        await db.run(
            'INSERT INTO chromatographic_columns (type, model, serial, install_date, initial_length, status, project, obs, equipment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [c.type, c.model, c.serial, c.install_date, c.initial_length, c.status, c.project || '', c.obs || '', eqId]
        );
        const cols = await db.all('SELECT * FROM chromatographic_columns WHERE equipment_id = ? ORDER BY id DESC', [eqId]);
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Column
app.delete('/api/columns/:id', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const { id } = req.params;
        const eqId = req.query.equipment_id || 1;
        await db.run('DELETE FROM chromatographic_columns WHERE id = ? AND equipment_id = ?', [id, eqId]);
        const cols = await db.all('SELECT * FROM chromatographic_columns WHERE equipment_id = ? ORDER BY id DESC', [eqId]);
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save Booking
app.post('/api/bookings', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const { start_date, end_date, operator, requester, obs, equipment_id } = req.body;
        const eqId = equipment_id || 1;

        if (!start_date || !end_date || !operator || !requester) {
            return res.status(400).json({ error: "Campos obrigatórios ausentes" });
        }

        if (start_date > end_date) {
            return res.status(400).json({ error: "A data de início não pode ser posterior à data de término." });
        }

        // Check scheduling overlaps
        const overlap = await db.get(
            'SELECT COUNT(*) as count FROM bookings WHERE equipment_id = ? AND (start_date <= ?) AND (end_date >= ?)',
            [eqId, end_date, start_date]
        );

        if (overlap.count > 0) {
            return res.status(400).json({ error: "Já existe uma reserva para o equipamento no período selecionado." });
        }

        await db.run(
            'INSERT INTO bookings (start_date, end_date, operator, requester, obs, equipment_id) VALUES (?, ?, ?, ?, ?, ?)',
            [start_date, end_date, operator, requester, obs || '', eqId]
        );

        appendTxtLog(`Nova reserva de ${start_date} a ${end_date} por ${requester} (Op: ${operator}) no Eq ${eqId}`);

        const allBookings = await db.all('SELECT * FROM bookings WHERE equipment_id = ? ORDER BY start_date ASC, id ASC', [eqId]);
        res.json({ success: true, bookings: allBookings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Booking
app.delete('/api/bookings/:id', authenticateJWT, async (req, res) => {
    try {
        const db = await getDB();
        const { id } = req.params;
        const eqId = req.query.equipment_id || 1;
        await db.run('DELETE FROM bookings WHERE id = ? AND equipment_id = ?', [id, eqId]);
        appendTxtLog(`Reserva ID #${id} excluída.`);
        const allBookings = await db.all('SELECT * FROM bookings WHERE equipment_id = ? ORDER BY start_date ASC, id ASC', [eqId]);
        res.json({ success: true, bookings: allBookings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debug', (req, res) => {
    console.log("TELEMETRY:", req.body);
    res.json({ ok: true });
});

// Initialize database and start the server
const db = getDB();
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Falha ao inicializar o banco de dados:", err);
});
