/**
 * Oracle Resolver — CoinGecko → resolveMarket tx
 * 매일 UTC 00:00 (KST 09:00) cron 실행
 * Fallback: Binance API
 */
import { ethers } from 'ethers';
import db from './db.js';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const BINANCE_API = 'https://api.binance.com/api/v3';

/**
 * CoinGecko에서 가격 조회 (3회 재시도)
 */
export async function fetchPrice(coinId = 'bitcoin', currency = 'usd') {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=${currency}`);
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data = await res.json();
      const price = data[coinId]?.[currency];
      if (price != null) return { price, source: 'coingecko' };
    } catch (err) {
      console.error(`[Oracle] CoinGecko attempt ${attempt + 1} failed:`, err.message);
      if (attempt < 2) await new Promise(r => setTimeout(r, 30000));
    }
  }

  // Fallback: Binance
  try {
    const symbol = coinId === 'bitcoin' ? 'BTCUSDT' : coinId === 'ethereum' ? 'ETHUSDT' : null;
    if (!symbol) return null;
    const res = await fetch(`${BINANCE_API}/ticker/price?symbol=${symbol}`);
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const data = await res.json();
    return { price: parseFloat(data.price), source: 'binance' };
  } catch (err) {
    console.error('[Oracle] Binance fallback failed:', err.message);
    return null;
  }
}

/**
 * 마켓 자동 resolve (crypto 카테고리, 가격 기반)
 */
export async function resolveMarket(contract, marketId, outcome) {
  const logStmt = db.prepare(`
    INSERT INTO oracle_logs (market_id, source, price, outcome, tx_hash, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    // outcome: 1=Yes, 2=No
    const tx = await contract.resolveMarket(marketId, outcome);
    const receipt = await tx.wait();

    logStmt.run(marketId, 'oracle', null, outcome === 1 ? 'Yes' : 'No', receipt.hash, 'success', null);
    console.log(`[Oracle] Market #${marketId} resolved: ${outcome === 1 ? 'Yes' : 'No'}, tx: ${receipt.hash}`);
    return receipt;
  } catch (err) {
    logStmt.run(marketId, 'oracle', null, null, null, 'error', err.message);
    console.error(`[Oracle] Market #${marketId} resolve failed:`, err.message);
    throw err;
  }
}

/**
 * 만료된 마켓 스캔 + 자동 resolve
 */
export async function scanAndResolve(contract) {
  const marketCount = await contract.marketCount();
  const now = Math.floor(Date.now() / 1000);

  for (let i = 1; i <= Number(marketCount); i++) {
    try {
      const market = await contract.getMarket(i);
      // Active + 베팅 마감 지남 → resolve 대상
      if (Number(market.status) === 0 && Number(market.bettingDeadline) < now) {
        console.log(`[Oracle] Market #${i} eligible for resolution`);
        // Crypto 카테고리(0)만 가격 기반 자동 resolve
        // 나머지는 수동 resolve 필요 (로그만 남김)
        if (Number(market.category) === 0) {
          console.log(`[Oracle] Market #${i} is Crypto — checking price conditions`);
          // TODO: 마켓별 가격 조건 파싱 (question에서 추출)
          // 현재는 로그만 남기고 수동 resolve 대기
          db.prepare(`
            INSERT OR IGNORE INTO oracle_logs (market_id, source, outcome, status, error)
            VALUES (?, 'scan', NULL, 'needs_manual', 'crypto market needs price condition parsing')
          `).run(i);
        } else {
          db.prepare(`
            INSERT OR IGNORE INTO oracle_logs (market_id, source, outcome, status, error)
            VALUES (?, 'scan', NULL, 'needs_manual', 'non-crypto market')
          `).run(i);
        }
      }
    } catch (err) {
      console.error(`[Oracle] Scan market #${i} error:`, err.message);
    }
  }
}
