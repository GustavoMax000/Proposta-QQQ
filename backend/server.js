const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const OLD_JSON_PATH = path.join(__dirname, '..', 'docs', 'database.json');
const LOG_PATH = path.join(__dirname, '..', 'log_uso.txt');

app.use(cors());
app.use(express.json());
// Serve os arquivos estáticos (HTML, CSS, JS, etc) da pasta public
app.use(express.static(path.join(__dirname, '..', 'public')));

let db;

function appendTxtLog(message) {
    const timestamp = new Date().toLocaleString('pt-BR');
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_PATH, logLine);
}

// Inicializa e configura o banco SQLite
async function initDB() {
    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS tune_data (
            num INTEGER PRIMARY KEY, date TEXT, op TEXT, fil INTEGER, emv INTEGER, 
            tint INTEGER, m69 REAL, m219 REAL, m502 REAL, m18 REAL, m28 REAL, m32 REAL
        );
        CREATE TABLE IF NOT EXISTS saved_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, op TEXT, psi REAL, inj INTEGER, 
            obs TEXT, sistema TEXT, he TEXT, collision_gas TEXT, limpinj TEXT, septo TEXT, liner TEXT, 
            col_model TEXT, corte REAL, trpi REAL, limpfonte TEXT, trocaoleo TEXT,tamb REAL
        );
        CREATE TABLE IF NOT EXISTS corrective_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, resp TEXT, sup TEXT, prob TEXT, proc TEXT, result TEXT
        );
        CREATE TABLE IF NOT EXISTS inject_by_month (
            month_idx INTEGER PRIMARY KEY, count INTEGER
        );
        CREATE TABLE IF NOT EXISTS chromatographic_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, model TEXT, serial TEXT, 
            install_date TEXT, initial_length REAL, status TEXT, project TEXT, obs TEXT
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            operator TEXT NOT NULL,
            requester TEXT NOT NULL,
            obs TEXT
        );
        CREATE TABLE IF NOT EXISTS analysis_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE,
            request_date TEXT,
            received_by TEXT,
            requester_name TEXT,
            requester_phone TEXT,
            requester_email TEXT,
            requester_dept TEXT,
            sample_count INTEGER,
            sample_codes TEXT,
            sample_matrix TEXT,
            sample_solvent TEXT,
            sample_concentration TEXT,
            sample_info TEXT,
            column_name TEXT,
            column_dimensions TEXT,
            routine_method TEXT,
            temp_program_json TEXT,
            equipment_params_json TEXT,
            analysis_type TEXT,
            scan_range TEXT,
            sim_ions TEXT,
            analysis_date TEXT,
            tech_resp TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_req_order ON analysis_requests(order_number);
    `);

    // Tenta adicionar a coluna tamb a tabelas existentes
    try {
        await db.exec("ALTER TABLE saved_logs ADD COLUMN tamb REAL");
    } catch (e) {
        // Ignora o erro se a coluna já existir no banco de dados antigo
    }

    // Tenta adicionar a coluna col_model a tabelas existentes
    try {
        await db.exec("ALTER TABLE saved_logs ADD COLUMN col_model TEXT");
    } catch (e) {
        // Ignora o erro se a coluna já existir no banco de dados antigo
    }

    // Tenta adicionar a coluna collision_gas a tabelas existentes
    try {
        await db.exec("ALTER TABLE saved_logs ADD COLUMN collision_gas TEXT");
    } catch (e) {
        // Ignora o erro se a coluna já existir no banco de dados antigo
    }

    // Tenta adicionar a coluna trocaoleo a tabelas existentes
    try {
        await db.exec("ALTER TABLE saved_logs ADD COLUMN trocaoleo TEXT");
    } catch (e) {
        // Ignora o erro se a coluna já existir
    }

    // Tenta adicionar os novos campos a chromatographic_columns existentes
    try {
        await db.exec("ALTER TABLE chromatographic_columns ADD COLUMN project TEXT");
    } catch (e) {
        // Ignora
    }
    try {
        await db.exec("ALTER TABLE chromatographic_columns ADD COLUMN obs TEXT");
    } catch (e) {
        // Ignora
    }

    // Migração inicial do JSON para o SQLite (se o json existir e a tabela estiver vazia)
    const tuneCount = await db.get('SELECT COUNT(*) as count FROM tune_data');
    if (tuneCount.count === 0 && fs.existsSync(OLD_JSON_PATH)) {
        console.log("Migrando dados do database.json para SQLite...");
        const data = JSON.parse(fs.readFileSync(OLD_JSON_PATH, 'utf8'));

        for (const t of data.tuneData || []) {
            await db.run(`INSERT INTO tune_data (num, date, op, fil, emv, tint, m69, m219, m502, m18, m28, m32) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.num, t.date, t.op, t.fil, t.emv, t.tint, t.m69, t.m219, t.m502, t.m18, t.m28, t.m32]);
        }

        if (data.injectByMonth) {
            for (let i = 0; i < data.injectByMonth.length; i++) {
                await db.run('INSERT INTO inject_by_month (month_idx, count) VALUES (?, ?)', [i, data.injectByMonth[i]]);
            }
        }

        for (const l of data.savedLogs || []) {
            await db.run('INSERT INTO saved_logs (date, op, psi, inj, obs) VALUES (?, ?, ?, ?, ?)',
                [l.date, l.op, l.psi, l.inj, l.obs]);
        }

        for (const c of data.correctiveRecords || []) {
            await db.run('INSERT INTO corrective_records (date, resp, sup, prob, proc, result) VALUES (?, ?, ?, ?, ?, ?)',
                [c.date, c.resp, c.sup, c.prob, c.proc, c.result]);
        }

        console.log("Migração concluída com sucesso.");
    }
}

// Rotas da API
app.get('/api/data', async (req, res) => {
    try {
        const tuneData = await db.all('SELECT * FROM tune_data ORDER BY num ASC');
        const logs = await db.all('SELECT * FROM saved_logs ORDER BY id ASC');
        const corrective = await db.all('SELECT * FROM corrective_records ORDER BY id ASC');

        const injectRows = await db.all('SELECT * FROM inject_by_month ORDER BY month_idx ASC');
        const injectByMonth = Array(12).fill(0);
        injectRows.forEach(row => { injectByMonth[row.month_idx] = row.count; });

        const columns = await db.all('SELECT * FROM chromatographic_columns ORDER BY id DESC');
        const bookings = await db.all('SELECT * FROM bookings ORDER BY start_date ASC, id ASC');

        res.json({
            tuneData: tuneData,
            injectByMonth: injectByMonth,
            savedLogs: logs,
            correctiveRecords: corrective,
            columns: columns,
            bookings: bookings
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tune', async (req, res) => {
    try {
        const tune = req.body;
        await db.run('INSERT INTO tune_data (num, date, op, fil, emv, tint, m69, m219, m502, m18, m28, m32) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [tune.num, tune.date, tune.op, tune.fil, tune.emv, tune.tint, tune.m69, tune.m219, tune.m502, tune.m18, tune.m28, tune.m32]);

        appendTxtLog(`Novo Tune #${tune.num} registrado pelo operador ${tune.op || 'Desconhecido'}. (EMV: ${tune.emv}V)`);

        const records = await db.all('SELECT * FROM tune_data ORDER BY num ASC');
        res.json({ success: true, tuneData: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logs', async (req, res) => {
    try {
        const newLog = req.body;
        await db.run(`INSERT INTO saved_logs 
            (date, op, psi, inj, obs, sistema, he, collision_gas, limpinj, septo, liner, col_model, corte, trpi, limpfonte, trocaoleo, tamb) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newLog.date, newLog.op, newLog.psi, newLog.inj, newLog.obs, newLog.sistema, newLog.he, newLog.collision_gas,
            newLog.limpinj, newLog.septo, newLog.liner, newLog.col_model, newLog.corte, newLog.trpi, newLog.limpfonte, newLog.trocaoleo, newLog.tamb]);

        appendTxtLog(`Novo registro diário adicionado pelo operador ${newLog.op || 'Desconhecido'}. (Injeções: ${newLog.inj || 0}, Psi: ${newLog.psi || '—'})`);

        const logs = await db.all('SELECT * FROM saved_logs ORDER BY id ASC');
        res.json({ success: true, savedLogs: logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/corrective', async (req, res) => {
    try {
        const newRecord = req.body;
        await db.run('INSERT INTO corrective_records (date, resp, sup, prob, proc, result) VALUES (?, ?, ?, ?, ?, ?)',
            [newRecord.date, newRecord.resp, newRecord.sup, newRecord.prob, newRecord.proc, newRecord.result]);

        appendTxtLog(`Manutenção corretiva registrada por ${newRecord.resp} - Problema: ${newRecord.prob}`);

        const records = await db.all('SELECT * FROM corrective_records ORDER BY id ASC');
        res.json({ success: true, correctiveRecords: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/corrective/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM corrective_records WHERE id = ?', [id]);
        appendTxtLog(`Registro de manutenção corretiva ID #${id} excluído.`);
        const records = await db.all('SELECT * FROM corrective_records ORDER BY id ASC');
        res.json({ success: true, correctiveRecords: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas de Colunas
app.get('/api/columns', async (req, res) => {
    try {
        const cols = await db.all('SELECT * FROM chromatographic_columns ORDER BY id DESC');
        res.json(cols);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/columns', async (req, res) => {
    try {
        const c = req.body;
        await db.run('INSERT INTO chromatographic_columns (type, model, serial, install_date, initial_length, status, project, obs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [c.type, c.model, c.serial, c.install_date, c.initial_length, c.status, c.project || '', c.obs || '']);
        const cols = await db.all('SELECT * FROM chromatographic_columns ORDER BY id DESC');
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/columns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM chromatographic_columns WHERE id = ?', [id]);
        const cols = await db.all('SELECT * FROM chromatographic_columns ORDER BY id DESC');
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas de Agendamentos (Bookings)
app.post('/api/bookings', async (req, res) => {
    try {
        const { start_date, end_date, operator, requester, obs } = req.body;

        if (!start_date || !end_date || !operator || !requester) {
            return res.status(400).json({ error: "Campos obrigatórios ausentes" });
        }

        if (start_date > end_date) {
            return res.status(400).json({ error: "A data de início não pode ser posterior à data de término." });
        }

        // Validar sobreposição de períodos:
        // Há sobreposição se: (start_date <= b.end_date) AND (end_date >= b.start_date)
        const overlap = await db.get(
            'SELECT COUNT(*) as count FROM bookings WHERE (start_date <= ?) AND (end_date >= ?)',
            [end_date, start_date]
        );

        if (overlap.count > 0) {
            return res.status(400).json({ error: "Já existe uma reserva para o equipamento no período selecionado." });
        }

        await db.run(
            'INSERT INTO bookings (start_date, end_date, operator, requester, obs) VALUES (?, ?, ?, ?, ?)',
            [start_date, end_date, operator, requester, obs || '']
        );

        appendTxtLog(`Nova reserva registrada de ${start_date} a ${end_date} por ${requester} (Op: ${operator})`);

        const allBookings = await db.all('SELECT * FROM bookings ORDER BY start_date ASC, id ASC');
        res.json({ success: true, bookings: allBookings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        appendTxtLog(`Reserva ID #${id} excluída.`);
        const allBookings = await db.all('SELECT * FROM bookings ORDER BY start_date ASC, id ASC');
        res.json({ success: true, bookings: allBookings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas de Fichas de Solicitação de Análise (GC-MS - Doc 9.847 V.00)
app.get('/api/requests', async (req, res) => {
    try {
        const { q } = req.query;
        let query = 'SELECT * FROM analysis_requests';
        let params = [];
        if (q) {
            query += ' WHERE order_number LIKE ? OR requester_name LIKE ? OR sample_codes LIKE ? OR requester_dept LIKE ?';
            const term = `%${q}%`;
            params = [term, term, term, term];
        }
        query += ' ORDER BY id DESC';
        const requests = await db.all(query, params);
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await db.get('SELECT * FROM analysis_requests WHERE id = ?', [id]);
        if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });
        res.json({ success: true, request });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/requests', async (req, res) => {
    try {
        const data = req.body;
        const {
            id, order_number, request_date, received_by,
            requester_name, requester_phone, requester_email, requester_dept,
            sample_count, sample_codes, sample_matrix, sample_solvent, sample_concentration, sample_info,
            column_name, column_dimensions, routine_method,
            temp_program_json, equipment_params_json,
            analysis_type, scan_range, sim_ions,
            analysis_date, tech_resp
        } = data;

        const orderNum = order_number || `REQ-${Date.now().toString().slice(-6)}`;
        const tempJson = typeof temp_program_json === 'object' ? JSON.stringify(temp_program_json) : (temp_program_json || '[]');
        const equipJson = typeof equipment_params_json === 'object' ? JSON.stringify(equipment_params_json) : (equipment_params_json || '{}');

        if (id) {
            await db.run(`
                UPDATE analysis_requests SET
                    order_number = ?, request_date = ?, received_by = ?,
                    requester_name = ?, requester_phone = ?, requester_email = ?, requester_dept = ?,
                    sample_count = ?, sample_codes = ?, sample_matrix = ?, sample_solvent = ?, sample_concentration = ?, sample_info = ?,
                    column_name = ?, column_dimensions = ?, routine_method = ?,
                    temp_program_json = ?, equipment_params_json = ?,
                    analysis_type = ?, scan_range = ?, sim_ions = ?,
                    analysis_date = ?, tech_resp = ?
                WHERE id = ?
            `, [
                orderNum, request_date, received_by,
                requester_name, requester_phone, requester_email, requester_dept,
                parseInt(sample_count) || 0, sample_codes, sample_matrix, sample_solvent, sample_concentration, sample_info,
                column_name, column_dimensions, routine_method,
                tempJson, equipJson,
                analysis_type, scan_range, sim_ions,
                analysis_date, tech_resp,
                id
            ]);
            appendTxtLog(`Solicitação Nº ${orderNum} (ID: ${id}) atualizada no banco.`);
        } else {
            const result = await db.run(`
                INSERT INTO analysis_requests (
                    order_number, request_date, received_by,
                    requester_name, requester_phone, requester_email, requester_dept,
                    sample_count, sample_codes, sample_matrix, sample_solvent, sample_concentration, sample_info,
                    column_name, column_dimensions, routine_method,
                    temp_program_json, equipment_params_json,
                    analysis_type, scan_range, sim_ions,
                    analysis_date, tech_resp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                orderNum, request_date, received_by,
                requester_name, requester_phone, requester_email, requester_dept,
                parseInt(sample_count) || 0, sample_codes, sample_matrix, sample_solvent, sample_concentration, sample_info,
                column_name, column_dimensions, routine_method,
                tempJson, equipJson,
                analysis_type, scan_range, sim_ions,
                analysis_date, tech_resp
            ]);
            appendTxtLog(`Nova solicitação Nº ${orderNum} (ID: ${result.lastID}) gravada.`);
        }

        const requests = await db.all('SELECT * FROM analysis_requests ORDER BY id DESC');
        res.json({ success: true, order_number: orderNum, requests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM analysis_requests WHERE id = ?', [id]);
        appendTxtLog(`Solicitação ID #${id} excluída.`);
        const requests = await db.all('SELECT * FROM analysis_requests ORDER BY id DESC');
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debug', (req, res) => {
    console.log("TELEMETRY:", req.body);
    res.json({ ok: true });
});

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log('Acesse o dashboard pelo navegador usando o link acima.');
    });
}).catch(err => {
    console.error("Falha ao inicializar o banco de dados:", err);
});
