const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const OLD_JSON_PATH = path.join(__dirname, '..', 'docs', 'database.json');
const LOG_PATH = path.join(__dirname, '..', 'log_uso.txt');
const JWT_SECRET = 'qQqq_TSQ9610_s3cr3t_K3y_!@#';

app.use(cors());
app.use(express.json());
// Serve os arquivos estáticos (HTML, CSS, JS, etc) da pasta public
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
        CREATE TABLE IF NOT EXISTS equipments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, model TEXT, description TEXT, image_url TEXT, status TEXT
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, role TEXT
        );
        CREATE TABLE IF NOT EXISTS user_permissions (
            user_id INTEGER, equipment_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(equipment_id) REFERENCES equipments(id),
            PRIMARY KEY(user_id, equipment_id)
        );
        CREATE TABLE IF NOT EXISTS tune_data (
            num INTEGER PRIMARY KEY, date TEXT, op TEXT, fil INTEGER, emv INTEGER, 
            tint INTEGER, m69 REAL, m219 REAL, m502 REAL, m18 REAL, m28 REAL, m32 REAL, equipment_id INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS saved_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, op TEXT, psi REAL, inj INTEGER, 
            obs TEXT, sistema TEXT, he TEXT, collision_gas TEXT, limpinj TEXT, septo TEXT, liner TEXT, 
            col_model TEXT, corte REAL, trpi REAL, limpfonte TEXT, trocaoleo TEXT,tamb REAL, equipment_id INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS corrective_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, resp TEXT, sup TEXT, prob TEXT, proc TEXT, result TEXT, equipment_id INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS inject_by_month (
            month_idx INTEGER PRIMARY KEY, count INTEGER, equipment_id INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS chromatographic_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, model TEXT, serial TEXT, 
            install_date TEXT, initial_length REAL, status TEXT, project TEXT, obs TEXT, equipment_id INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            operator TEXT NOT NULL,
            requester TEXT NOT NULL,
            obs TEXT, equipment_id INTEGER DEFAULT 1
        );
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

    // Tenta adicionar a coluna equipment_id a tabelas existentes
    const tablesToAlter = ['tune_data', 'saved_logs', 'corrective_records', 'inject_by_month', 'chromatographic_columns', 'bookings'];
    for (const table of tablesToAlter) {
        try {
            await db.exec(`ALTER TABLE ${table} ADD COLUMN equipment_id INTEGER DEFAULT 1`);
        } catch(e) {
            // Ignora se já existir
        }
    }

    // Inserir equipamento padrão se não existir
    const eqCount = await db.get('SELECT COUNT(*) as count FROM equipments');
    if (eqCount.count === 0) {
        await db.run("INSERT INTO equipments (id, name, model) VALUES (1, 'TSQ 9610 GC/MS', 'Thermo Scientific')");
    }

    // Inserir admin padrão se não existir
    const usrCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (usrCount.count === 0) {
        const hash = bcrypt.hashSync('admin', 10);
        await db.run("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')", [hash]);
        // Dá permissão ao admin para o equipamento 1
        await db.run("INSERT INTO user_permissions (user_id, equipment_id) VALUES (1, 1)");
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

// Auth and Equipments routes
app.post('/api/login', async (req, res) => {
    try {
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

app.get('/api/equipments', async (req, res) => {
    try {
        const eqs = await db.all('SELECT * FROM equipments');
        for (let eq of eqs) {
            const lastLog = await db.get('SELECT * FROM saved_logs WHERE equipment_id = ? ORDER BY id DESC LIMIT 1', [eq.id]);
            if (lastLog && (lastLog.sistema === 'Não' || lastLog.sistema === 'Nao' || (lastLog.sistema || '').toLowerCase().startsWith('n'))) {
                eq.status = 'offline';
                eq.offDate = lastLog.date;
                continue;
            }

            const logs = await db.all('SELECT * FROM saved_logs WHERE equipment_id = ? ORDER BY id ASC', [eq.id]);
            const revLogs = [...logs].reverse();
            const lastSwapIndex = revLogs.findIndex(l => l.liner === 'SIM');
            const logsSinceSwap = lastSwapIndex !== -1 ? revLogs.slice(0, lastSwapIndex + 1) : logs;
            const linerInjections = logsSinceSwap.reduce((sum, l) => sum + (parseInt(l.inj) || 0), 0);

            const lastTune = await db.get('SELECT * FROM tune_data WHERE equipment_id = ? ORDER BY num DESC LIMIT 1', [eq.id]);

            let isNoOp = false;
            let isAlert = false;

            if (linerInjections >= 800) isNoOp = true;
            else if (linerInjections >= 600) isAlert = true;

            if (lastTune) {
                if (lastTune.emv >= 2500 || lastTune.m18 >= 10 || lastTune.m28 >= 10 || lastTune.m32 >= 2 || lastTune.tint >= 400) isNoOp = true;
                else if (lastTune.emv >= 2200 || lastTune.m18 >= 8 || lastTune.m28 >= 8 || lastTune.m32 >= 1.5 || lastTune.tint >= 380) isAlert = true;
            }

            if (isNoOp) eq.status = 'noop';
            else if (isAlert) eq.status = 'alert';
            else eq.status = 'ok';
        }
        res.json(eqs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas da API
app.get('/api/data', async (req, res) => {
    try {
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

app.post('/api/tune', authenticateJWT, async (req, res) => {
    try {
        const tune = req.body;
        const eqId = tune.equipment_id || 1;
        await db.run('INSERT INTO tune_data (num, date, op, fil, emv, tint, m69, m219, m502, m18, m28, m32, equipment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [tune.num, tune.date, tune.op, tune.fil, tune.emv, tune.tint, tune.m69, tune.m219, tune.m502, tune.m18, tune.m28, tune.m32, eqId]);

        appendTxtLog(`Novo Tune #${tune.num} registrado pelo operador ${tune.op || 'Desconhecido'}. (EMV: ${tune.emv}V)`);

        const records = await db.all('SELECT * FROM tune_data WHERE equipment_id = ? ORDER BY num ASC', [eqId]);
        res.json({ success: true, tuneData: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logs', authenticateJWT, async (req, res) => {
    try {
        const newLog = req.body;
        const eqId = newLog.equipment_id || 1;
        await db.run(`INSERT INTO saved_logs 
            (date, op, psi, inj, obs, sistema, he, collision_gas, limpinj, septo, liner, col_model, corte, trpi, limpfonte, trocaoleo, tamb, equipment_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newLog.date, newLog.op, newLog.psi, newLog.inj, newLog.obs, newLog.sistema, newLog.he, newLog.collision_gas,
            newLog.limpinj, newLog.septo, newLog.liner, newLog.col_model, newLog.corte, newLog.trpi, newLog.limpfonte, newLog.trocaoleo, newLog.tamb, eqId]);

        appendTxtLog(`Novo registro diário adicionado pelo operador ${newLog.op || 'Desconhecido'}. (Injeções: ${newLog.inj || 0}, Psi: ${newLog.psi || '—'})`);

        const logs = await db.all('SELECT * FROM saved_logs WHERE equipment_id = ? ORDER BY id ASC', [eqId]);
        res.json({ success: true, savedLogs: logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/corrective', authenticateJWT, async (req, res) => {
    try {
        const newRecord = req.body;
        const eqId = newRecord.equipment_id || 1;
        await db.run('INSERT INTO corrective_records (date, resp, sup, prob, proc, result, equipment_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newRecord.date, newRecord.resp, newRecord.sup, newRecord.prob, newRecord.proc, newRecord.result, eqId]);

        appendTxtLog(`Manutenção corretiva registrada por ${newRecord.resp} - Problema: ${newRecord.prob}`);

        const records = await db.all('SELECT * FROM corrective_records WHERE equipment_id = ? ORDER BY id ASC', [eqId]);
        res.json({ success: true, correctiveRecords: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/corrective/:id', authenticateJWT, async (req, res) => {
    try {
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

// Rotas de Colunas
app.get('/api/columns', async (req, res) => {
    try {
        const eqId = req.query.equipment_id || 1;
        const cols = await db.all('SELECT * FROM chromatographic_columns WHERE equipment_id = ? ORDER BY id DESC', [eqId]);
        res.json(cols);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/columns', authenticateJWT, async (req, res) => {
    try {
        const c = req.body;
        const eqId = c.equipment_id || 1;
        await db.run('INSERT INTO chromatographic_columns (type, model, serial, install_date, initial_length, status, project, obs, equipment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [c.type, c.model, c.serial, c.install_date, c.initial_length, c.status, c.project || '', c.obs || '', eqId]);
        const cols = await db.all('SELECT * FROM chromatographic_columns WHERE equipment_id = ? ORDER BY id DESC', [eqId]);
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/columns/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const eqId = req.query.equipment_id || 1;
        await db.run('DELETE FROM chromatographic_columns WHERE id = ? AND equipment_id = ?', [id, eqId]);
        const cols = await db.all('SELECT * FROM chromatographic_columns WHERE equipment_id = ? ORDER BY id DESC', [eqId]);
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas de Agendamentos (Bookings)
app.post('/api/bookings', authenticateJWT, async (req, res) => {
    try {
        const { start_date, end_date, operator, requester, obs, equipment_id } = req.body;
        const eqId = equipment_id || 1;

        if (!start_date || !end_date || !operator || !requester) {
            return res.status(400).json({ error: "Campos obrigatórios ausentes" });
        }

        if (start_date > end_date) {
            return res.status(400).json({ error: "A data de início não pode ser posterior à data de término." });
        }

        // Validar sobreposição de períodos:
        // Há sobreposição se: (start_date <= b.end_date) AND (end_date >= b.start_date)
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

        appendTxtLog(`Nova reserva registrada de ${start_date} a ${end_date} por ${requester} (Op: ${operator}) no Eq ${eqId}`);

        const allBookings = await db.all('SELECT * FROM bookings WHERE equipment_id = ? ORDER BY start_date ASC, id ASC', [eqId]);
        res.json({ success: true, bookings: allBookings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/bookings/:id', authenticateJWT, async (req, res) => {
    try {
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

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log('Acesse o dashboard pelo navegador usando o link acima.');
    });
}).catch(err => {
    console.error("Falha ao inicializar o banco de dados:", err);
});
