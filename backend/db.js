const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const OLD_JSON_PATH = path.join(__dirname, '..', 'docs', 'database.json');

let db;

async function getDB() {
    if (!db) {
        db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });
    }
    return db;
}

async function initDB() {
    const database = await getDB();

    // 1. Check if saved_logs needs schema migration
    let needsMigration = false;
    try {
        const tableInfo = await database.all("PRAGMA table_info(saved_logs)");
        const hasDataJson = tableInfo.some(col => col.name === 'data_json');
        const hasPsi = tableInfo.some(col => col.name === 'psi');
        // If it exists, has 'psi' (old field) but lacks 'data_json', we migrate!
        if (tableInfo.length > 0 && hasPsi && !hasDataJson) {
            needsMigration = true;
        }
    } catch (err) {
        // Table doesn't exist, will be created below
    }

    if (needsMigration) {
        console.log("Detectado banco de dados antigo. Iniciando migração de dados...");
        try {
            await database.exec("ALTER TABLE saved_logs RENAME TO saved_logs_old");
            await database.exec("ALTER TABLE tune_data RENAME TO tune_data_old");
            console.log("Tabelas antigas renomeadas para backup.");
        } catch (e) {
            console.error("Erro ao renomear tabelas para migração:", e);
        }
    }

    // 2. Create tables with new configurations
    await database.exec(`
        CREATE TABLE IF NOT EXISTS equipments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            model TEXT,
            description TEXT,
            image_url TEXT,
            status TEXT,
            equipment_type TEXT DEFAULT 'tsq-9610',
            config TEXT
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT
        );
        CREATE TABLE IF NOT EXISTS user_permissions (
            user_id INTEGER,
            equipment_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(equipment_id) REFERENCES equipments(id),
            PRIMARY KEY(user_id, equipment_id)
        );
        CREATE TABLE IF NOT EXISTS tune_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id INTEGER DEFAULT 1,
            num INTEGER,
            date TEXT,
            op TEXT,
            data_json TEXT,
            UNIQUE(equipment_id, num)
        );
        CREATE TABLE IF NOT EXISTS saved_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id INTEGER DEFAULT 1,
            date TEXT,
            op TEXT,
            sistema TEXT,
            inj INTEGER DEFAULT 0,
            tamb REAL,
            obs TEXT,
            data_json TEXT
        );
        CREATE TABLE IF NOT EXISTS corrective_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id INTEGER DEFAULT 1,
            date TEXT,
            resp TEXT,
            sup TEXT,
            prob TEXT,
            proc TEXT,
            result TEXT
        );
        CREATE TABLE IF NOT EXISTS inject_by_month (
            month_idx INTEGER PRIMARY KEY,
            count INTEGER,
            equipment_id INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS chromatographic_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id INTEGER DEFAULT 1,
            type TEXT,
            model TEXT,
            serial TEXT,
            install_date TEXT,
            initial_length REAL,
            status TEXT,
            project TEXT,
            obs TEXT
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment_id INTEGER DEFAULT 1,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            operator TEXT NOT NULL,
            requester TEXT NOT NULL,
            obs TEXT
        );

        -- Performance Indexes on Relational Foreign Keys
        CREATE INDEX IF NOT EXISTS idx_saved_logs_eq ON saved_logs(equipment_id);
        CREATE INDEX IF NOT EXISTS idx_saved_logs_eq_id ON saved_logs(equipment_id, id);
        CREATE INDEX IF NOT EXISTS idx_tune_data_eq ON tune_data(equipment_id);
        CREATE INDEX IF NOT EXISTS idx_corrective_eq ON corrective_records(equipment_id);
        CREATE INDEX IF NOT EXISTS idx_columns_eq ON chromatographic_columns(equipment_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_eq ON bookings(equipment_id);
    `);

    // Ensure equipments table has the new column 'equipment_type'
    try {
        await database.exec("ALTER TABLE equipments ADD COLUMN equipment_type TEXT DEFAULT 'tsq-9610'");
    } catch(e) {}
    try {
        await database.exec("ALTER TABLE equipments ADD COLUMN config TEXT");
    } catch(e) {}

    // 3. Perform the migration if needed
    if (needsMigration) {
        console.log("Migrando dados antigos da tabela saved_logs...");
        try {
            const oldLogs = await database.all("SELECT * FROM saved_logs_old");
            for (const row of oldLogs) {
                const eqId = row.equipment_id || 1;
                // Specific fields go to JSON
                const extraData = {
                    psi: row.psi,
                    he: row.he,
                    collision_gas: row.collision_gas,
                    limpinj: row.limpinj,
                    septo: row.septo,
                    liner: row.liner,
                    col_model: row.col_model,
                    corte: row.corte,
                    trpi: row.trpi,
                    limpfonte: row.limpfonte,
                    trocaoleo: row.trocaoleo
                };
                await database.run(
                    `INSERT INTO saved_logs (id, equipment_id, date, op, sistema, inj, tamb, obs, data_json) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [row.id, eqId, row.date, row.op, row.sistema, row.inj, row.tamb, row.obs, JSON.stringify(extraData)]
                );
            }
            console.log("saved_logs migrado com sucesso.");
        } catch (e) {
            console.error("Erro na migração de saved_logs:", e);
        }

        console.log("Migrando dados antigos da tabela tune_data...");
        try {
            const oldTunes = await database.all("SELECT * FROM tune_data_old");
            for (const row of oldTunes) {
                const eqId = row.equipment_id || 1;
                // Specific fields go to JSON
                const extraData = {
                    fil: row.fil,
                    emv: row.emv,
                    tint: row.tint,
                    m69: row.m69,
                    m219: row.m219,
                    m502: row.m502,
                    m18: row.m18,
                    m28: row.m28,
                    m32: row.m32
                };
                await database.run(
                    `INSERT INTO tune_data (equipment_id, num, date, op, data_json) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [eqId, row.num, row.date, row.op, JSON.stringify(extraData)]
                );
            }
            console.log("tune_data migrado com sucesso.");
        } catch (e) {
            console.error("Erro na migração de tune_data:", e);
        }

        // Clean up backups
        try {
            await database.exec("DROP TABLE saved_logs_old");
            await database.exec("DROP TABLE tune_data_old");
            console.log("Tabelas antigas deletadas. Migração concluída.");
        } catch (e) {
            console.error("Erro ao deletar tabelas de backup:", e);
        }
    }

    // Default equipment if none exists
    const eqCount = await database.get('SELECT COUNT(*) as count FROM equipments');
    if (eqCount.count === 0) {
        await database.run("INSERT INTO equipments (id, name, model, equipment_type) VALUES (1, 'TSQ 9610 GC/MS', 'Thermo Scientific', 'tsq-9610')");
    }

    // Default admin user if none exists
    const usrCount = await database.get('SELECT COUNT(*) as count FROM users');
    if (usrCount.count === 0) {
        const hash = bcrypt.hashSync('admin', 10);
        await database.run("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')", [hash]);
        await database.run("INSERT INTO user_permissions (user_id, equipment_id) VALUES (1, 1)");
    }

    // Perform file-to-db initial migration if JSON exists (for fresh starts)
    const logCount = await database.get('SELECT COUNT(*) as count FROM saved_logs');
    if (logCount.count === 0 && fs.existsSync(OLD_JSON_PATH)) {
        console.log("Realizando migração inicial do database.json...");
        try {
            const data = JSON.parse(fs.readFileSync(OLD_JSON_PATH, 'utf8'));

            for (const t of data.tuneData || []) {
                const extraData = { fil: t.fil, emv: t.emv, tint: t.tint, m69: t.m69, m219: t.m219, m502: t.m502, m18: t.m18, m28: t.m28, m32: t.m32 };
                await database.run(`INSERT INTO tune_data (equipment_id, num, date, op, data_json) VALUES (1, ?, ?, ?, ?)`,
                    [t.num, t.date, t.op, JSON.stringify(extraData)]);
            }

            if (data.injectByMonth) {
                for (let i = 0; i < data.injectByMonth.length; i++) {
                    await database.run('INSERT INTO inject_by_month (month_idx, count, equipment_id) VALUES (?, ?, 1)', [i, data.injectByMonth[i]]);
                }
            }

            for (const l of data.savedLogs || []) {
                const extraData = { psi: l.psi };
                await database.run('INSERT INTO saved_logs (equipment_id, date, op, sistema, inj, tamb, obs, data_json) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
                    [l.date, l.op, 'Sim', l.inj || 0, 23.0, l.obs, JSON.stringify(extraData)]);
            }

            for (const c of data.correctiveRecords || []) {
                await database.run('INSERT INTO corrective_records (equipment_id, date, resp, sup, prob, proc, result) VALUES (1, ?, ?, ?, ?, ?, ?)',
                    [c.date, c.resp, c.sup, c.prob, c.proc, c.result]);
            }
            console.log("Migração inicial de JSON concluída.");
        } catch (err) {
            console.error("Falha ao ler database.json:", err);
        }
    }
}

module.exports = {
    getDB,
    initDB
};
