// SVG を 1024x1024 PNG に変換して assets/ に保存するスクリプト
// 実行: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SVG_ICON = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2ec97a"/>
      <stop offset="1" stop-color="#1a5a3a"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bgG)"/>
  <rect x="232" y="232" width="560" height="560" fill="#fff" rx="100"/>
  <rect x="378" y="120" width="58" height="120" fill="#fff" rx="14"/>
  <rect x="588" y="120" width="58" height="120" fill="#fff" rx="14"/>
  <text x="512" y="490" font-family="Helvetica, Arial, sans-serif" font-size="180" font-weight="700"
    fill="#1a5a3a" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">60:00</text>
  <circle cx="700" cy="700" r="22" fill="#27ae60"/>
</svg>`;

// adaptive-icon は Android で 1024x1024 のフォアグラウンドが切り抜かれる
// 安全領域は中央 66% 程度。プラグ本体（中央）に余白を確保した版を作る
const SVG_ADAPTIVE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2ec97a"/>
      <stop offset="1" stop-color="#1a5a3a"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bgG)"/>
  <!-- プラグ本体（中央寄り、適応アイコンの安全領域内） -->
  <rect x="316" y="356" width="392" height="392" fill="#fff" rx="70"/>
  <rect x="418" y="276" width="40" height="84" fill="#fff" rx="10"/>
  <rect x="566" y="276" width="40" height="84" fill="#fff" rx="10"/>
  <text x="512" y="540" font-family="Helvetica, Arial, sans-serif" font-size="126" font-weight="700"
    fill="#1a5a3a" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">60:00</text>
  <circle cx="660" cy="690" r="16" fill="#27ae60"/>
</svg>`;

// splash 用は背景色のみシンプルに、中央にプラグだけ
const SVG_SPLASH = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#27ae60"/>
  <rect x="232" y="232" width="560" height="560" fill="#fff" rx="100"/>
  <rect x="378" y="120" width="58" height="120" fill="#fff" rx="14"/>
  <rect x="588" y="120" width="58" height="120" fill="#fff" rx="14"/>
  <text x="512" y="490" font-family="Helvetica, Arial, sans-serif" font-size="180" font-weight="700"
    fill="#1a5a3a" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">60:00</text>
</svg>`;

async function generate() {
  const assets = path.join(__dirname, '..', 'assets');

  await sharp(Buffer.from(SVG_ICON))
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, 'icon.png'));
  console.log('icon.png: 1024x1024 generated');

  await sharp(Buffer.from(SVG_ADAPTIVE))
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, 'adaptive-icon.png'));
  console.log('adaptive-icon.png: 1024x1024 generated');

  await sharp(Buffer.from(SVG_SPLASH))
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, 'splash-icon.png'));
  console.log('splash-icon.png: 1024x1024 generated');

  // favicon (48x48) は icon を縮小して作成
  await sharp(Buffer.from(SVG_ICON))
    .resize(48, 48)
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, 'favicon.png'));
  console.log('favicon.png: 48x48 generated');
}

generate().catch(e => { console.error(e); process.exit(1); });
