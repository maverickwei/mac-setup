#!/bin/bash
# =============================================
# 蓁蓁 macOS 一鍵啟動
# 啟動順序：網路 → TradingView → 網頁服務 → ngrok
# =============================================

# 防止重複執行
LOCK="/tmp/zhenzen-startup.lock"
if [ -f "$LOCK" ]; then exit 0; fi
touch "$LOCK"
trap "rm -f $LOCK" EXIT

# 補上 Homebrew PATH（LaunchAgent 預設 PATH 很短）
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

LOG="$HOME/mac-setup/startup.log"
log() { echo "$(date '+%H:%M:%S')  $1" >> "$LOG"; }

echo "" >> "$LOG"
log "========== 開機啟動 =========="

# ── 1. 等待網路就緒 ──────────────────────────
log "等待網路..."
for i in $(seq 1 30); do
    ping -c 1 -W 1 8.8.8.8 &>/dev/null && break
    sleep 2
done
log "網路就緒"

# ── 2. 啟動 TradingView Desktop（含 CDP port 9222）─
log "啟動 TradingView..."
TV_EXE="/Applications/TradingView.app/Contents/MacOS/TradingView"
if [ -f "$TV_EXE" ]; then
    "$TV_EXE" --remote-debugging-port=9222 &
    sleep 5
    log "TradingView 啟動（CDP port 9222）"
else
    log "⚠️  找不到 TradingView 執行檔，跳過"
fi

# ── 3. 啟動 Wi-Fi 切換器（port 8765）────────
log "啟動 Wi-Fi 切換器（port 8765）..."
node "$HOME/mac-setup/wifi-switcher/server.js" >> "$LOG" 2>&1 &
WIFI_PID=$!
log "Wi-Fi 切換器 PID: $WIFI_PID"

# ── 4. 確認 / 下載 Coocolab-Tradingview-MCP ──
MCP_DIR="$HOME/Coocolab-Tradingview-MCP"
if [ ! -d "$MCP_DIR" ]; then
    log "找不到 Coocolab-Tradingview-MCP，自動下載中..."
    git clone https://github.com/maverickwei/Coocolab-Tradingview-MCP.git "$MCP_DIR" >> "$LOG" 2>&1
    cd "$MCP_DIR" && npm install >> "$LOG" 2>&1 && cd "$HOME"
    log "下載完成"
fi

# ── 5. 啟動 TradingView 監控網頁（port 3000）
if [ -f "$MCP_DIR/src/webhook-server.js" ]; then
    log "啟動監控網頁（port 3000）..."
    cd "$MCP_DIR"
    node src/webhook-server.js >> "$LOG" 2>&1 &
    WEBHOOK_PID=$!
    cd "$HOME"
    log "監控網頁 PID: $WEBHOOK_PID"

    # ── 6. 等 port 3000 就緒後啟動 ngrok ────
    log "等待 port 3000..."
    for i in $(seq 1 15); do
        nc -z localhost 3000 2>/dev/null && break
        sleep 2
    done

    if nc -z localhost 3000 2>/dev/null; then
        log "啟動 ngrok..."
        ngrok http 3000 >> "$LOG" 2>&1 &
        sleep 3
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
            | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4)
        log "ngrok 網址：${NGROK_URL:-（取得中...）}"
    else
        log "⚠️  port 3000 未就緒，跳過 ngrok"
    fi
else
    log "⚠️  找不到 Coocolab-Tradingview-MCP，跳過監控網頁"
fi

log "========== 啟動完成 =========="
log "Wi-Fi 切換器 → http://localhost:8765"
log "監控網頁     → http://localhost:3000"
