const http = require('http');
const { exec } = require('child_process');

const WIFI_IF = 'en0';
const AIRPORT = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

const NETWORKS = [
  { ssid: '蓁蓁溫暖的家6g',   desc: '家用 6GHz（最快）', color: '#6C63FF' },
  { ssid: '蓁蓁溫暖的家5g',   desc: '家用 5GHz',         color: '#845EC2' },
  { ssid: 'ziping1127_MOD_5G', desc: 'MOD 5GHz',          color: '#FF6584' },
  { ssid: 'ziping1127_MOD',    desc: 'MOD 2.4GHz',        color: '#FF9671' },
];

function getCurrentSSID() {
  return new Promise((resolve) => {
    exec(`networksetup -getairportnetwork ${WIFI_IF}`, (err, out) => {
      if (err) return resolve('');
      const m = out.match(/Current Wi-Fi Network:\s*(.+)/);
      resolve(m ? m[1].trim() : '');
    });
  });
}

// 掃描附近可見的 SSID
function scanSSIDs() {
  return new Promise((resolve) => {
    exec(`"${AIRPORT}" -s`, (err, out) => {
      if (err) return resolve([]);
      const ssids = [];
      const lines = out.split('\n').slice(1); // 跳過 header
      for (const line of lines) {
        const ssid = line.substring(0, 33).trim();
        if (ssid) ssids.push(ssid);
      }
      resolve(ssids);
    });
  });
}

function connectSSID(ssid) {
  return new Promise((resolve) => {
    exec(`networksetup -setairportnetwork ${WIFI_IF} "${ssid}"`, (err, out, errout) => {
      resolve(!err && !errout.includes('Error'));
    });
  });
}

const HTML = (current, visibleSSIDs) => `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wi-Fi 切換器</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', sans-serif;
    background: #0f0f1a; color: #fff;
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 20px;
  }
  h1 { font-size: 1.6rem; margin-bottom: 8px; letter-spacing: 2px; }
  .subtitle { font-size: 0.9rem; color: #aaa; margin-bottom: 28px; }
  .current-badge {
    background: #1e1e30; border: 1px solid #333; border-radius: 20px;
    padding: 6px 18px; font-size: 0.85rem; color: #ccc; margin-bottom: 28px;
  }
  .current-badge span { color: #7effd4; font-weight: bold; }
  .cards { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
  .card {
    background: #1a1a2e; border: 2px solid transparent;
    border-radius: 20px; padding: 26px 30px; text-align: center;
    width: 185px; transition: all 0.25s ease;
  }
  .card.inrange:hover { transform: translateY(-5px); box-shadow: 0 14px 36px rgba(0,0,0,0.4); }
  .card.active { border-color: var(--clr); box-shadow: 0 0 22px -4px var(--clr); }
  .card.outofrange { opacity: 0.4; }
  .card .icon { font-size: 2.2rem; margin-bottom: 10px; }
  .card .ssid { font-size: 0.92rem; font-weight: bold; margin-bottom: 5px; word-break: break-all; }
  .card .desc { font-size: 0.76rem; color: #999; margin-bottom: 6px; }
  .card .range-badge {
    font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;
    margin-bottom: 14px; display: inline-block;
  }
  .inrange .range-badge  { background: #1a3a1a; color: #3fb950; }
  .outofrange .range-badge { background: #2a1a1a; color: #888; }
  .card button {
    background: var(--clr); border: none; border-radius: 10px;
    color: #fff; font-size: 0.88rem; font-weight: bold;
    padding: 9px 20px; width: 100%; transition: opacity 0.2s;
  }
  .inrange button { cursor: pointer; }
  .inrange button:hover { opacity: 0.82; }
  .outofrange button { cursor: not-allowed; background: #333; color: #666; }
  .card.active button { background: #2a2a4a; color: var(--clr); border: 1px solid var(--clr); }
  .status { margin-top: 24px; font-size: 0.9rem; color: #7effd4; min-height: 22px; }
  .spinner { display: inline-block; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .refresh { margin-top: 16px; font-size: 0.75rem; color: #555; cursor: pointer; }
  .refresh:hover { color: #999; }
</style>
</head>
<body>
<h1>📶 Wi-Fi 切換器</h1>
<p class="subtitle">macOS 版 — 只有訊號範圍內的網路可切換</p>
<div class="current-badge">目前連線：<span id="cur">${current || '未連線'}</span></div>
<div class="cards">
${NETWORKS.map(n => {
  const inRange = visibleSSIDs.includes(n.ssid) || current === n.ssid;
  const cls = current === n.ssid ? 'active inrange' : inRange ? 'inrange' : 'outofrange';
  const badge = inRange ? '✅ 範圍內' : '📵 範圍外';
  const btnText = current === n.ssid ? '✓ 已連線' : inRange ? '連線' : '不在範圍';
  const onclick = inRange && current !== n.ssid ? `onclick="connect('${n.ssid}')"` : '';
  return `
  <div class="card ${cls}" style="--clr:${n.color}">
    <div class="icon">🌐</div>
    <div class="ssid">${n.ssid}</div>
    <div class="desc">${n.desc}</div>
    <div class="range-badge">${badge}</div>
    <button ${onclick}>${btnText}</button>
  </div>`;
}).join('')}
</div>
<div class="status" id="status"></div>
<div class="refresh" onclick="location.reload()">🔄 重新掃描</div>

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
    st.textContent = '❌ 切換失敗，請重試';
  }
}
// 每 10 秒更新目前 SSID
setInterval(async () => {
  const res = await fetch('/current');
  const d = await res.json();
  document.getElementById('cur').textContent = d.ssid || '未連線';
}, 10000);
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
    const [current, visibleSSIDs] = await Promise.all([getCurrentSSID(), scanSSIDs()]);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML(current, visibleSSIDs));
  }
});

server.listen(8765, () => {
  console.log('Wi-Fi 切換器已啟動 → http://localhost:8765');
});
