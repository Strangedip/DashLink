const { initializeApp } = require('firebase-admin/app');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { SITE, FALLBACK_IMAGE, loadShare, stripHtml, fetchLinkPreviews } = require('./share-payload');

initializeApp();

const REGION = 'asia-south1';
let indexCache = { html: '', at: 0 };

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shareIdFromPath(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  const sIndex = parts.lastIndexOf('s');
  if (sIndex >= 0 && parts[sIndex + 1]) {
    return parts[sIndex + 1];
  }
  return parts.length === 1 ? parts[0] : '';
}

async function hostingIndex() {
  const now = Date.now();
  if (indexCache.html && now - indexCache.at < 5 * 60 * 1000) {
    return indexCache.html;
  }
  const res = await fetch(`${SITE}/index.html`, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error(`index.html ${res.status}`);
  }
  const html = await res.text();
  indexCache = { html, at: now };
  return html;
}

function injectShare(html, payload, url) {
  const title = `${payload.title} · DashLink`;
  const description = stripHtml(payload.description) || 'Shared with DashLink.';
  const image = payload.coverImage || FALLBACK_IMAGE;
  const tags = [
    `<meta name="robots" content="noindex, nofollow">`,
    `<meta property="og:site_name" content="DashLink">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`
  ].join('\n');

  let next = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
  next = next.replace(/<meta name="robots"[^>]*>/i, '');
  next = next.replace(/<meta property="og:(title|description|url|image)"[^>]*>/gi, '');
  next = next.replace(/<meta name="twitter:(title|description|image|card)"[^>]*>/gi, '');
  next = next.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(url)}">`);
  next = next.replace('</head>', `${tags}\n</head>`);
  const boot = `<script>window.__DL_SHARE__=${JSON.stringify(payload).replace(/</g, '\\u003c')};</script>`;
  next = next.replace('<body>', `<body>${boot}`);
  return next;
}

function fallbackHtml(payload, url) {
  const title = `${payload.title} · DashLink`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="robots" content="noindex, nofollow">
  <meta property="og:site_name" content="DashLink">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(payload.description || '')}">
  <meta property="og:image" content="${esc(payload.coverImage || FALLBACK_IMAGE)}">
  <meta property="og:url" content="${esc(url)}">
</head>
<body>
  <p>Open this DashLink in your browser.</p>
  <p><a href="${esc(url)}">${esc(url)}</a></p>
</body>
</html>`;
}

exports.sharePage = onRequest(
  { region: REGION, cors: true, invoker: 'public', timeoutSeconds: 30, memory: '256MiB' },
  async (req, res) => {
    const shareId = shareIdFromPath(req.path);
    const url = `${SITE}/s/${shareId}`;
    const payload = await loadShare(shareId, null);
    try {
      const html = injectShare(await hostingIndex(), payload, url);
      res.set('Cache-Control', 'public, max-age=30, s-maxage=60');
      res.status(200).send(html);
    } catch (error) {
      console.error('sharePage index inject failed', error);
      res.status(200).send(fallbackHtml(payload, url));
    }
  }
);

exports.getShare = onCall(
  { region: REGION, cors: true, invoker: 'public', timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    const shareId = String(request.data?.shareId || '').trim();
    if (!shareId) {
      throw new HttpsError('invalid-argument', 'Missing share id.');
    }
    return loadShare(shareId, request.auth?.uid || null);
  }
);

exports.getLinkPreviews = onCall(
  { region: REGION, cors: true, invoker: 'public', timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    const urls = Array.isArray(request.data?.urls) ? request.data.urls : [];
    return { previews: await fetchLinkPreviews(urls) };
  }
);
