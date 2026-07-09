/**
 * MetaPool Backend Server
 * - Express API (DID 매핑, 리더보드)
 * - Oracle cron (매일 KST 09:00)
 * - Contract event listener (Telegram 알림)
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { scanAndResolve } from './oracle.js';
import { TelegramBot } from './telegram.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3201;
const RPC_URL = process.env.RPC_URL || 'https://api.metadium.com/dev';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// ── ABI ──
const artifactPath = resolve(__dirname, '../../artifacts/contracts/MetaPool.sol/MetaPool.json');
let abi;
try {
  abi = JSON.parse(readFileSync(artifactPath, 'utf8')).abi;
} catch {
  console.error('[Server] ABI not found. Run `npx hardhat compile` first.');
  process.exit(1);
}

// ── Provider + Contract ──
const provider = new ethers.JsonRpcProvider(RPC_URL);
const readContract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

let writeContract = null;
if (PRIVATE_KEY) {
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  writeContract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
}

// ── Telegram Bot ──
const telegram = new TelegramBot(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID,
);

// ── Express ──
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', contract: CONTRACT_ADDRESS, network: RPC_URL });
});

// ── DID API ──

// DID 매핑 조회
app.get('/api/did/:address', (req, res) => {
  const row = db.prepare('SELECT * FROM did_users WHERE wallet_address = ?').get(req.params.address.toLowerCase());
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});

// DID 닉네임 일괄 조회 (리더보드용)
app.post('/api/did/batch', (req, res) => {
  const { addresses } = req.body;
  if (!Array.isArray(addresses)) return res.status(400).json({ error: 'addresses array required' });

  const placeholders = addresses.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT wallet_address, nickname FROM did_users WHERE wallet_address IN (${placeholders})`
  ).all(...addresses.map(a => a.toLowerCase()));

  const map = {};
  rows.forEach(r => { map[r.wallet_address] = r.nickname; });
  res.json(map);
});

// DID 등록 (MyKeepin OAuth callback에서 호출)
app.post('/api/did/register', (req, res) => {
  const { wallet_address, did_subject, nickname } = req.body;
  if (!wallet_address || !did_subject) {
    return res.status(400).json({ error: 'wallet_address and did_subject required' });
  }
  try {
    db.prepare(`
      INSERT INTO did_users (wallet_address, did_subject, nickname)
      VALUES (?, ?, ?)
      ON CONFLICT(wallet_address) DO UPDATE SET nickname = excluded.nickname
    `).run(wallet_address.toLowerCase(), did_subject, nickname || null);
    res.json({ ok: true });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// ── Leaderboard API ──

app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM leaderboard ORDER BY CAST(net_profit AS REAL) DESC LIMIT 50
  `).all();
  res.json(rows);
});

// ── Oracle API (수동 트리거) ──

app.post('/api/oracle/scan', async (req, res) => {
  if (!writeContract) return res.status(503).json({ error: 'no write contract (missing PRIVATE_KEY)' });
  try {
    await scanAndResolve(writeContract);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/oracle/logs', (req, res) => {
  const rows = db.prepare('SELECT * FROM oracle_logs ORDER BY id DESC LIMIT 50').all();
  res.json(rows);
});

// ── Contract Event Polling (getLogs 기반) ──
//
// ethers `.on()` 은 내부적으로 eth_newFilter + eth_getFilterChanges 를 사용하는데,
// Metadium 공개 RPC 는 필터를 짧게 만료시켜 "filter not found" 에러가 반복 발생한다.
// (pm2 metapool-api 로그 급증 원인) → getLogs(queryFilter) 폴링으로 근본 대체.

const POLL_INTERVAL_MS = Number(process.env.EVENT_POLL_INTERVAL_MS) || 15000;
const MAX_BLOCK_RANGE = Number(process.env.EVENT_MAX_BLOCK_RANGE) || 2000; // getLogs 범위 제한
const CURSOR_KEY = 'events_last_block';

const getCursor = () => {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(CURSOR_KEY);
  return row ? Number(row.value) : null;
};
const setCursor = (block) => {
  db.prepare(`
    INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(CURSOR_KEY, String(block));
};

async function handleMarketCreated(marketId, question, category, bettingDeadline) {
  console.log(`[Events] MarketCreated #${marketId}`);
  const cats = ['Crypto', 'Sports', 'Weather', 'Politics', 'Entertainment', 'Other'];
  await telegram.notifyNewMarket({
    id: Number(marketId),
    question,
    category: cats[Number(category)] || 'Other',
    bettingDeadline: Number(bettingDeadline),
  });
}

async function handleMarketResolved(marketId, outcome) {
  console.log(`[Events] MarketResolved #${marketId} outcome=${outcome}`);
  try {
    const market = await readContract.getMarket(marketId);
    await telegram.notifyResolution(Number(marketId), Number(outcome), market.question);
  } catch (err) {
    console.error('[Events] MarketResolved notify error:', err.message);
  }
}

let polling = false;
async function pollEvents() {
  if (polling) return; // 이전 폴링이 아직 진행 중이면 중첩 방지
  polling = true;
  try {
    const latest = await provider.getBlockNumber();
    let from = getCursor();
    if (from == null) {
      // 최초 실행: 과거 이벤트 재알림을 피하기 위해 현재 블록부터 시작
      setCursor(latest);
      return;
    }
    from += 1;
    if (from > latest) return;

    // 큰 범위는 청크로 나눠 getLogs 제한 회피
    for (let start = from; start <= latest; start += MAX_BLOCK_RANGE) {
      const end = Math.min(start + MAX_BLOCK_RANGE - 1, latest);

      const created = await readContract.queryFilter('MarketCreated', start, end);
      for (const ev of created) {
        const { marketId, question, category, bettingDeadline } = ev.args;
        await handleMarketCreated(marketId, question, category, bettingDeadline);
      }

      const resolved = await readContract.queryFilter('MarketResolved', start, end);
      for (const ev of resolved) {
        const { marketId, outcome } = ev.args;
        await handleMarketResolved(marketId, outcome);
      }

      setCursor(end); // 청크 단위로 커서 전진 → 중간 실패 시 재처리 최소화
    }
  } catch (err) {
    console.error('[Events] poll error:', err.message);
  } finally {
    polling = false;
  }
}

function startEventListeners() {
  console.log(`[Events] Polling MarketCreated/MarketResolved every ${POLL_INTERVAL_MS}ms (getLogs)`);
  pollEvents();
  setInterval(pollEvents, POLL_INTERVAL_MS);
}

// ── Oracle Cron (매일 KST 09:00 = UTC 00:00) ──

cron.schedule('0 0 * * *', async () => {
  console.log('[Cron] Running oracle scan at', new Date().toISOString());
  if (writeContract) {
    try {
      await scanAndResolve(writeContract);
    } catch (err) {
      console.error('[Cron] Oracle scan error:', err.message);
    }
  }
}, { timezone: 'UTC' });

// ── Deadline reminder cron (매시간 체크) ──

cron.schedule('0 * * * *', async () => {
  try {
    const marketCount = await readContract.marketCount();
    const now = Math.floor(Date.now() / 1000);
    const oneHour = 3600;

    for (let i = 1; i <= Number(marketCount); i++) {
      const market = await readContract.getMarket(i);
      if (Number(market.status) !== 0) continue;
      const deadline = Number(market.bettingDeadline);
      const diff = deadline - now;
      if (diff > 0 && diff <= oneHour) {
        const totalPool = ethers.formatEther(market.yesPool + market.noPool);
        await telegram.notifyDeadlineSoon({
          id: i,
          question: market.question,
          totalPool,
        }, 1);
      }
    }
  } catch (err) {
    console.error('[Cron] Deadline check error:', err.message);
  }
});

// ── Start ──

app.listen(PORT, () => {
  console.log(`[Server] MetaPool backend running on port ${PORT}`);
  console.log(`[Server] Contract: ${CONTRACT_ADDRESS}`);
  console.log(`[Server] RPC: ${RPC_URL}`);
  startEventListeners();
});
