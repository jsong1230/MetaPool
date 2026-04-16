/**
 * Telegram Notification Bot
 * 새 마켓 / 결과 발표 / 마감 임박 알림
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export class TelegramBot {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.enabled = !!(token && chatId);
    if (!this.enabled) {
      console.log('[Telegram] Bot disabled (no TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    }
  }

  async send(text, parseMode = 'HTML') {
    if (!this.enabled) return;
    try {
      const res = await fetch(`${TELEGRAM_API}${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('[Telegram] Send failed:', err.description);
      }
    } catch (err) {
      console.error('[Telegram] Send error:', err.message);
    }
  }

  async notifyNewMarket(market) {
    const msg = [
      `🆕 <b>새 예측 마켓 오픈!</b>`,
      ``,
      `📌 ${market.question}`,
      `📂 카테고리: ${market.category}`,
      `⏰ 베팅 마감: ${new Date(market.bettingDeadline * 1000).toLocaleString('ko-KR')}`,
      ``,
      `👉 지금 참여하기: ${process.env.FRONTEND_URL || 'http://10.150.254.110:3200'}/market/${market.id}`,
    ].join('\n');
    await this.send(msg);
  }

  async notifyResolution(marketId, outcome, question) {
    const outcomeText = outcome === 1 ? '✅ YES' : outcome === 2 ? '❌ NO' : '⚪ VOID';
    const msg = [
      `📊 <b>마켓 결과 발표!</b>`,
      ``,
      `📌 ${question}`,
      `결과: ${outcomeText}`,
      ``,
      `💰 보상 클레임: ${process.env.FRONTEND_URL || 'http://10.150.254.110:3200'}/market/${marketId}`,
    ].join('\n');
    await this.send(msg);
  }

  async notifyDeadlineSoon(market, hoursLeft) {
    const msg = [
      `⏰ <b>베팅 마감 ${hoursLeft}시간 전!</b>`,
      ``,
      `📌 ${market.question}`,
      `현재 풀: ${market.totalPool} META`,
      ``,
      `👉 ${process.env.FRONTEND_URL || 'http://10.150.254.110:3200'}/market/${market.id}`,
    ].join('\n');
    await this.send(msg);
  }
}
