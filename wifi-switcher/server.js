const http = require('http');
const { exec } = require('child_process');

// macOS Wi-Fi 介面通常是 en0，若不對請改成 en1
const WIFI_IF = 'en0';

const NETWORKS = [
  { ssid: '蓁蓁溫暖的家6g',   desc: '家用 6GHz（最快）', color: '#6C63FF' },
  { ssid: '蓁蓁溫暖的家5g',   desc: '家用 5GHz',         color: '#845EC2' },
  { ssid: 'ziping1127_MOD_5G', desc: 'MOD 5GHz',          color: '#FF6584' },
  { ssid: 'ziping1127_MOD',    desc: 'MOD 2.4GHz',        color: '#FF9671' },
];

// 取得目前連線的 SSID（macOS 版）
function getCurrentSSID() {
  return new Promise((resolve) => {
    exec(`networksetup -getairportnetwork ${WIFI_IF}`, (err, out) => {
      if (err) return resolve('');
      // 輸出格式：  Current Wi-Fi Network: SSID_NAME
      const m = out.match(/Current Wi-Fi Network:\s*(.+)/);
      resolve(m ? m[1].trim() : '');
    });
  });
}

// 切換 Wi-Fi（macOS 版，密碼存在 Keychain 裡不需要再輸入）
function connectSSID(ssid) {
  return new Promise((resolve) => {
    exec(`networksetup -setairportnetwork ${WIFI_IF} "${ssid}"`, (err, out, errout) => {
      // networksetup 成功時沒有輸出，失敗時有錯誤訊息
      resolve(!err && !errout.includes('Error'));
    });
  });
}

const HTML = (current) => `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wi-Fi 切換器</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', sans-serif;
    background: #0f0f1a;
    color: #fff;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  h1 { font-size: 1.6rem; margin-bottom: 8px; letter-spacing: 2px; }
  .subtitle { font-size: 0.9rem; color: #aaa; margin-bottom: 32px; }
  .current-badge {
    background: #1e1e30;
    border: 1px solid #333;
    border-radius: 20px;
    padding: 6px 18px;
    font-size: 0.85rem;
    color: #ccc;
    margin-bottom: 32px;
  }
  .current-badge span { color: #7effd4; font-weight: bold; }
  .cards { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
  .card {
    background: #1a1a2e;
    border: 2px solid transparent;
    border-radius: 20px;
    padding: 28px 32px;
    text-align: center;
    width: 190px;
    transition: all 0.25s ease;
  }
  .card:hover { transform: translateY(-5px); box-shadow: 0 14px 36px rgba(0,0,0,0.4); }
  .card.active { border-color: var(--clr); box-shadow: 0 0 22px -4px var(--clr); }
  .card .icon { font-size: 2.4rem; margin-bottom: 12px; }
  .card .ssid { font-size: 0.95rem; font-weight: bold; margin-bottom: 6px; word-break: break-all; }
  .card .desc { font-size: 0.78rem; color: #999; margin-bottom: 16px; }
  .card button {
    background: var(--clr);
    border: none; border-radius: 10px;
    color: #fff; font-size: 0.88rem; font-weight: bold;
    padding: 9px 20px; cursor: pointer; width: 100%;
    transition: opacity 0.2s;
  }
  .card button:hover { opacity: 0.82; }
  .card.active button { background: #2a2a4a; color: var(--clr); border: 1px solid var(--clr); }
  .status { margin-top: 28px; font-size: 0.9rem; color: #7effd4; min-height: 22px; }
  .spinner { display: inline-block; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<h1>📶 Wi-Fi 切換器</h1>
<p class="subtitle">macOS 版 — 選擇要連線的無線網路</p>
<div class="current-badge">目前連線：<span id="cur">${current || '未連線'}</span></div>
<div class="cards">
${NETWORKS.map(n => `
  <div class="card ${current === n.ssid ? 'active' : ''}" style="--clr:${n.color}">
    <div class="icon">🌐</div>
    <div class="ssid">${n.ssid}</div>
    <div class="desc">${n.desc}</div>
    <button onclick="connect('${n.ssid}')">${current === n.ssid ? '✓ 已連線' : '連線'}</button>
  </div>
`).join('')}
</div>
<div class="status" id="status"></div>
<script>
async function connect(ssid) {
  const st = document.getElementById('status');
  st.innerHTML = '<span class="spinner">⏳</span> 正在切換到 ' + ssid + '…';
  const res = await fetch('/connect?ssid=' + encodeURIComponent(ssid));
  const data = await res.json();
  if (data.ok) {
    st.textContent = '✅ 已送出切換指令，稍待數秒…';
    setTimeout(() => location.reload(), 3000);
  } else {
    st.textContent = '❌ 切換失敗（網路不在範圍內或密碼不在 Keychain）';
  }
}
setInterval(async () => {
  const res = await fetch('/current');
  const d = await res.json();
  document.getElementById('cur').textContent = d.ssid || '未連線';
}, 5000);
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/connect') {
    const ssid = url.searchParams.get('ssid');
    const ok = await connectSSID(ssid);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok }));
  } else if (url.pathname === '/current') {
    const ssid = await getCurrentSSID();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ssid }));
  } else {
    const current = await getCurrentSSID();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML(current));
  }
});

server.listen(8765, () => {
  console.log('Wi-Fi 切換器已啟動 → http://localhost:8765');
});
