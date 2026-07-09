import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'demo.db'))

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      procedure_category TEXT NOT NULL,
      specific_interest TEXT NOT NULL,
      timeline TEXT NOT NULL,
      patient_location TEXT NOT NULL,
      travel_origin_city TEXT,
      needs_travel_logistics INTEGER,
      consultation_preference TEXT NOT NULL,
      notes TEXT,
      score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new',
      ai_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      slot_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      consultation_type TEXT NOT NULL,
      confirmed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sms_log (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      direction TEXT,
      body TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

initDb()

export default db
