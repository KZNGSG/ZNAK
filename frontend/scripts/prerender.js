const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROUTES = [
  '/',
  '/check',
  '/timeline',
  '/equipment',
  '/contact',
  '/partners',
  '/quote'
];

const BUILD_DIR = path.join(__dirname, '../build');
const BASE_URL = 'http://localhost:5000';

async function prerender() {
  console.log('Starting prerender...');

  // Start a simple server
  const handler = require('serve-handler');
  const http = require('http');

  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: BUILD_DIR,
      rewrites: [{ source: '**', destination: '/index.html' }]
    });
  });

  await new Promise(resolve => server.listen(5000, resolve));
  console.log('Server running on port 5000');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const route of ROUTES) {
    console.log(`Prerendering ${route}...`);

    const page = await browser.newPage();
    await page.goto(`${BASE_URL}${route}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for React to render
    await page.waitForSelector('#root > *', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const html = await page.content();

    // Determine output path
    let outputPath;
    if (route === '/') {
      outputPath = path.join(BUILD_DIR, 'index.html');
    } else {
      const dir = path.join(BUILD_DIR, route);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      outputPath = path.join(dir, 'index.html');
    }

    fs.writeFileSync(outputPath, html);
    console.log(`  Saved to ${outputPath}`);

    await page.close();
  }

  await browser.close();
  server.close();

  console.log('Prerender complete!');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
