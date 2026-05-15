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
            obs TEXT, sistema TEXT, he TEXT, limpinj TEXT, septo TEXT, liner TEXT, 
            col_model TEXT, corte REAL, trpi REAL, limpfonte TEXT
        );
        CREATE TABLE IF NOT EXISTS corrective_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, resp TEXT, sup TEXT, prob TEXT, proc TEXT, result TEXT
        );
        CREATE TABLE IF NOT EXISTS inject_by_month (
            month_idx INTEGER PRIMARY KEY, count INTEGER
        );
        CREATE TABLE IF NOT EXISTS columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, model TEXT, serial TEXT, 
            install_date TEXT, initial_length REAL, status TEXT
        );
    `);

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
        
        const columns = await db.all('SELECT * FROM columns ORDER BY id DESC');
        
        res.json({
            tuneData: tuneData,
            injectByMonth: injectByMonth,
            savedLogs: logs,
            correctiveRecords: corrective,
            columns: columns
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
            (date, op, psi, inj, obs, sistema, he, limpinj, septo, liner, col_model, corte, trpi, limpfonte) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [newLog.date, newLog.op, newLog.psi, newLog.inj, newLog.obs, newLog.sistema, newLog.he, 
             newLog.limpinj, newLog.septo, newLog.liner, newLog.col_model, newLog.corte, newLog.trpi, newLog.limpfonte]);
        
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
        const cols = await db.all('SELECT * FROM columns ORDER BY id DESC');
        res.json(cols);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/columns', async (req, res) => {
    try {
        const c = req.body;
        await db.run('INSERT INTO columns (type, model, serial, install_date, initial_length, status) VALUES (?, ?, ?, ?, ?, ?)', 
            [c.type, c.model, c.serial, c.install_date, c.initial_length, c.status]);
        const cols = await db.all('SELECT * FROM columns ORDER BY id DESC');
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/columns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM columns WHERE id = ?', [id]);
        const cols = await db.all('SELECT * FROM columns ORDER BY id DESC');
        res.json({ success: true, columns: cols });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log('Acesse o dashboard pelo navegador usando o link acima.');
    });
}).catch(err => {
    console.error("Falha ao inicializar o banco de dados:", err);
});
