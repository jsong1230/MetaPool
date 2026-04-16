import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../data/metapool.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(resolve(__dirname, '../data'), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  -- DID 매핑 (MyKeepin OAuth)
  CREATE TABLE IF NOT EXISTS did_users (
    wallet_address TEXT PRIMARY KEY,
    did_subject    TEXT UNIQUE NOT NULL,
    nickname       TEXT,
    verified_at    TEXT NOT NULL DEFAULT (datetime('now')),
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Referral 추적 (off-chain 보조)
  CREATE TABLE IF NOT EXISTS referrals (
    user_address     TEXT PRIMARY KEY,
    referrer_address TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Oracle resolution 로그
  CREATE TABLE IF NOT EXISTS oracle_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id   INTEGER NOT NULL,
    source      TEXT NOT NULL,
    price       REAL,
    outcome     TEXT,
    tx_hash     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    error       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Leaderboard 캐시 (이벤트 인덱서)
  CREATE TABLE IF NOT EXISTS leaderboard (
    wallet_address  TEXT PRIMARY KEY,
    nickname        TEXT,
    total_bets      INTEGER NOT NULL DEFAULT 0,
    wins            INTEGER NOT NULL DEFAULT 0,
    total_wagered   TEXT NOT NULL DEFAULT '0',
    total_winnings  TEXT NOT NULL DEFAULT '0',
    net_profit      TEXT NOT NULL DEFAULT '0',
    win_rate        REAL NOT NULL DEFAULT 0,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
