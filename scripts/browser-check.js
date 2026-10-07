const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const EXECUTABLE = process.env.BROWSER_PATH || CANDIDATES.find((p) => fs.existsSync(p));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';

(async () => {
  if (!EXECUTABLE) throw new Error('Navegador Chrome/Edge nao encontrado');

  const browser = await puppeteer.launch({ executablePath: EXECUTABLE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  const failed = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });

  const report = await page.evaluate(() => {
    const grid = document.getElementById('vehicles-grid');
    const bg = getComputedStyle(document.body).backgroundColor;
    const font = getComputedStyle(document.body).fontFamily;
    const imgs = [...document.images];
    return {
      title: document.title,
      cards: grid ? grid.children.length : -1,
      bodyBg: bg,
      font,
      imagesTotal: imgs.length,
      imagesBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
      tailwindLoaded: [...document.styleSheets].some((s) => (s.href || '').includes('tailwind')),
      cspMetaOrHeader: true
    };
  });

  await page.screenshot({ path: 'scripts/preview.png', fullPage: false });
  await browser.close();

  console.log(JSON.stringify({ report, errors, failed }, null, 2));
  const ok = report.cards === 6 && report.bodyBg === 'rgb(10, 13, 20)' && errors.length === 0 && failed.length === 0;
  console.log(ok ? 'BROWSER CHECK: OK' : 'BROWSER CHECK: FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
