#!/bin/bash
# =============================================
# 一鍵安裝腳本 — 在 Mac 上執行一次即可
# 用法：bash ~/mac-setup/install.sh
# =============================================

MAC_USER=$(whoami)
SETUP_DIR="$HOME/mac-setup"

echo "👤 使用者：$MAC_USER"
echo "📁 安裝目錄：$SETUP_DIR"

# 1. 替換 plist 裡的使用者名稱
sed -i '' "s/YOUR_MAC_USERNAME/$MAC_USER/g" "$SETUP_DIR/com.zhenzen.startup.plist"
echo "✅ plist 使用者名稱已更新"

# 2. 給腳本執行權限
chmod +x "$SETUP_DIR/startup.sh"
echo "✅ startup.sh 已設定執行權限"

# 3. 安裝 LaunchAgent（登入時自動執行）
cp "$SETUP_DIR/com.zhenzen.startup.plist" "$HOME/Library/LaunchAgents/"
launchctl load "$HOME/Library/LaunchAgents/com.zhenzen.startup.plist"
echo "✅ LaunchAgent 已安裝"

# 4. 確認 node 是否安裝
if command -v node &>/dev/null; then
    echo "✅ Node.js $(node -v) 已安裝"
else
    echo "⚠️  Node.js 未安裝，請先安裝：brew install node"
fi

# 5. 確認 ngrok 是否安裝
if command -v ngrok &>/dev/null; then
    echo "✅ ngrok 已安裝"
else
    echo "⚠️  ngrok 未安裝，請先安裝：brew install ngrok/ngrok/ngrok"
fi

echo ""
echo "🎉 安裝完成！下次登入時會自動啟動。"
echo "📋 查看啟動記錄：cat ~/mac-setup/startup.log"
echo "🌐 Wi-Fi 切換器：http://localhost:8765"
