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

// ── Contract Event Listeners ──

function startEventListeners() {
  console.log('[Events] Starting contract event listeners...');

  // 새 마켓 생성 → Telegram 알림
  readContract.on('MarketCreated', async (marketId, question, category, bettingDeadline) => {
    console.log(`[Events] MarketCreated #${marketId}`);
    const cats = ['Crypto', 'Sports', 'Weather', 'Politics', 'Entertainment', 'Other'];
    await telegram.notifyNewMarket({
      id: Number(marketId),
      question,
      category: cats[Number(category)] || 'Other',
      bettingDeadline: Number(bettingDeadline),
    });
  });

  // 마켓 결과 확정 → Telegram 알림
  readContract.on('MarketResolved', async (marketId, outcome) => {
    console.log(`[Events] MarketResolved #${marketId} outcome=${outcome}`);
    try {
      const market = await readContract.getMarket(marketId);
      await telegram.notifyResolution(Number(marketId), Number(outcome), market.question);
    } catch (err) {
      console.error('[Events] MarketResolved notify error:', err.message);
    }
  });

  console.log('[Events] Listening for MarketCreated, MarketResolved');
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
