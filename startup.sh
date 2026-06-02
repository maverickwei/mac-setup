#!/bin/bash
# =============================================
# 蓁蓁 macOS 開機啟動腳本
# 放到 ~/mac-setup/startup.sh
# =============================================

LOG="$HOME/mac-setup/startup.log"
log() { echo "$(date '+%H:%M:%S')  $1" >> "$LOG"; }

log "=== 開機啟動 ==="

# 1. 等待網路就緒（最多 60 秒）
log "等待網路..."
for i in $(seq 1 30); do
    ping -c 1 -W 1 8.8.8.8 &>/dev/null && break
    sleep 2
done
log "網路就緒"

# 2. 啟動 Wi-Fi 切換器（port 8765）
log "啟動 Wi-Fi 切換器..."
node "$HOME/mac-setup/wifi-switcher/server.js" >> "$LOG" 2>&1 &

# 3. 啟動 Coocolab TradingView MCP webhook（port 3000）
#    如果 Mac 上有安裝 Coocolab-Tradingview-MCP 就啟動
MCP_DIR="$HOME/Coocolab-Tradingview-MCP"
if [ -f "$MCP_DIR/src/webhook-server.js" ]; then
    log "啟動 TradingView webhook server（port 3000）..."
    cd "$MCP_DIR" && node src/webhook-server.js >> "$LOG" 2>&1 &
    cd ~
fi

# 4. 等 port 3000 就緒後啟動 ngrok
log "等待 port 3000..."
for i in $(seq 1 15); do
    nc -z localhost 3000 2>/dev/null && break
    sleep 2
done

if nc -z localhost 3000 2>/dev/null; then
    log "啟動 ngrok..."
    ngrok http 3000 >> "$LOG" 2>&1 &
    log "ngrok 啟動完成"
else
    log "port 3000 未就緒，跳過 ngrok"
fi

log "=== 啟動完成 ==="
