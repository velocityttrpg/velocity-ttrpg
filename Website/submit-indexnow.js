// Submits every URL in sitemap.xml to the IndexNow API, which fans the
// submission out to all participating search engines (Bing, Yandex, Naver,
// Seznam, Yep — not Google, which doesn't support IndexNow).
//
// Run from the Website/ directory, after build.js has regenerated
// sitemap.xml. Intentionally non-fatal: an indexing ping failing should
// never break a deploy.

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const SITE_URL = 'https://velocityttrpg.github.io/velocity-ttrpg'; // keep in sync with build.js's SITE_URL
const INDEXNOW_KEY = '8746e471a0714ec8bd851edb0b1f2697';
const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

async function main() {
  const sitemapPath = path.join(SCRIPT_DIR, 'sitemap.xml');
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  if (urls.length === 0) {
    console.log('IndexNow: no URLs found in sitemap.xml — skipping submission.');
    return;
  }

  const payload = {
    host: new URL(SITE_URL).host, // velocityttrpg.github.io
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls,
  };

  console.log(`IndexNow: submitting ${urls.length} URLs to ${INDEXNOW_ENDPOINT}...`);

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  console.log(`IndexNow: response ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (body) console.log(`IndexNow: response body: ${body}`);
  }
}

main().catch((err) => {
  console.error('IndexNow: submission failed (non-fatal):', err.message);
});
