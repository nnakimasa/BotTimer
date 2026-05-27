// App Store / Play Store 用スクリーンショットを生成する
// 前提: Expo Web Dev Server が http://localhost:8082 で起動中
// 実行: node scripts/generate-screenshots.js

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://localhost:8082';
const OUT_DIR = path.join(__dirname, '..', 'assets', 'screenshots');

const DEVICES = [
  {
    id: 'iphone-67',
    label: 'iPhone 6.7" Pro Max (1290x2796)',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
  },
  {
    id: 'iphone-65',
    label: 'iPhone 6.5" Pro Max (1242x2688)',
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
  },
  {
    id: 'ipad-13',
    label: 'iPad Pro 13" (2064x2752)',
    viewport: { width: 1032, height: 1376 },
    deviceScaleFactor: 2,
  },
];

async function setLocalStorage(page, items) {
  await page.evaluate((items) => {
    for (const [key, value] of Object.entries(items)) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  }, items);
}

async function captureScene(page, sceneName, deviceId) {
  const filename = `${deviceId}-${sceneName}.png`;
  const filepath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  ✓ ${filename}`);
}

const DEMO_SETTINGS = {
  initialSeconds: 30 * 60,
  quickAdjustSeconds: 5 * 60,
  warningSeconds: 5 * 60,
  intervalSeconds: 15 * 60,
  lockMode: false,
  demoMode: true,
  startAction: 'on',
  endAction: 'off',
  deviceId: 'DEMO-PLUG-MINI-001',
  deviceName: 'Demo Plug Mini',
  token: 'demo-token',
  secret: 'demo-secret',
};

async function applyAndReload(page, settingsOverrides = {}, storageOverrides = {}) {
  await setLocalStorage(page, {
    settings: JSON.stringify({ ...DEMO_SETTINGS, ...settingsOverrides }),
    end_time: null,
    interval_end_time: null,
    ...storageOverrides,
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

async function captureAllScenes(page, deviceId) {
  // Scene 1: メイン画面（初期状態 30:00、デモモード ON）
  await applyAndReload(page);
  await captureScene(page, '01-main', deviceId);

  // Scene 2: 設定画面
  await page.evaluate(() => {
    // 「設定」リンクを直接探してクリック
    const els = Array.from(document.querySelectorAll('*'));
    const target = els.find(el => el.textContent === '設定' && el.children.length === 0);
    if (target) {
      const touchable = target.closest('[role="button"], [tabindex]') || target.parentElement;
      touchable.click();
    }
  });
  await page.waitForTimeout(1000);
  await captureScene(page, '02-settings', deviceId);

  // Scene 3: HH:MM:SS ピッカー（初期タイマーの値ボックスをクリック）
  await page.evaluate(() => {
    // accessibilityLabel に「初期タイマー」を含む要素を探す
    const els = Array.from(document.querySelectorAll('[aria-label]'));
    const target = els.find(el => el.getAttribute('aria-label')?.startsWith('初期タイマー'));
    if (target) target.click();
  });
  await page.waitForTimeout(1000);
  await captureScene(page, '03-picker', deviceId);

  // Scene 4: タイマー稼働中 → end_time を未来時刻に設定してリロードで復元
  const runningEnd = Date.now() + 25 * 60 * 1000 - 7000; // 24分53秒くらい残り
  await applyAndReload(page, { initialSeconds: 25 * 60 }, { end_time: String(runningEnd) });
  await captureScene(page, '04-running', deviceId);

  // Scene 5: ロックモード稼働中 → 同じく end_time で復元、lockMode=true
  const lockEnd = Date.now() + 45 * 60 * 1000 - 7000;
  await applyAndReload(page, { initialSeconds: 45 * 60, lockMode: true }, { end_time: String(lockEnd) });
  await captureScene(page, '05-lockmode', deviceId);
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const device of DEVICES) {
      console.log(`\n=== ${device.label} ===`);
      const context = await browser.newContext({
        viewport: device.viewport,
        deviceScaleFactor: device.deviceScaleFactor,
        hasTouch: true,
        isMobile: true,
        permissions: ['notifications'],
      });
      await context.grantPermissions(['notifications'], { origin: APP_URL });
      // Notification.permission を 'granted' 固定にしてアプリ側を「通知許可済」と認識させる
      await context.addInitScript(() => {
        try {
          Object.defineProperty(window.Notification, 'permission', {
            get: () => 'granted',
            configurable: true,
          });
          window.Notification.requestPermission = async () => 'granted';
        } catch (e) { /* noop */ }
      });
      const page = await context.newPage();
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await captureAllScenes(page, device.id);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\nScreenshots saved to ${OUT_DIR}`);
}

run().catch(e => { console.error(e); process.exit(1); });
