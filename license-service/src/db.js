import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.DB_PATH || "./data/licenses.db";
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_ref TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    app_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: add `source` (the originating site's Origin, e.g.
// "https://dupsweep.com") to installs that predate this column.
try {
  db.exec(`ALTER TABLE licenses ADD COLUMN source TEXT`);
} catch (err) {
  if (!/duplicate column/i.test(err.message)) throw err;
}

const insertStmt = db.prepare(`
  INSERT INTO licenses (payment_ref, provider, app_id, name, email, key, source)
  VALUES (@paymentRef, @provider, @appId, @name, @email, @key, @source)
`);
const findByPaymentRefStmt = db.prepare(`SELECT * FROM licenses WHERE payment_ref = ?`);

// Inserts a new license row. Returns the existing row instead if payment_ref
// was already issued (dedupe — a retried webhook or refreshed success page
// must not mint a second key for the same payment). `isNew` tells the caller
// whether this call actually inserted a row, so it knows whether to send
// the license email again.
export function insertLicense({ paymentRef, provider, appId, name, email, key, source }) {
  const existing = findByPaymentRefStmt.get(paymentRef);
  if (existing) return { license: existing, isNew: false };
  insertStmt.run({ paymentRef, provider, appId, name, email, key, source: source || null });
  return { license: findByPaymentRefStmt.get(paymentRef), isNew: true };
}

export function findLicenseByPaymentRef(paymentRef) {
  return findByPaymentRefStmt.get(paymentRef);
}
