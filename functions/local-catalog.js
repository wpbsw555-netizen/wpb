const WHATSAPP = '8613159065939';
const PAGE_SIZE = 24;
const EDGE_TTL = 21600;
const CACHE_VERSION = '20260817b';

const DEPARTMENTS = {
  fashion: { host: 'www.tangma2088.com', label: 'FASHION / 时尚服饰', fallback: '3' },
  accessories: { host: 'acc.tangma2088.com', label: 'ACCESSORIES / 潮流配件', fallback: '16511' },
  bags: { host: 'bags.tangma2088.com', label: 'BAGS / 包包目录', fallback: '29314' },
  shoes: { host: 'shoes.tangma2088.com', label: 'SHOES / 鞋子目录', fallback: '355' }
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function isAllowedImage(url, expectedHost) {
  return url.protocol === 'https:' &&
    url.hostname.toLowerCase() === expectedHost &&
    url.pathname.toLowerCase().includes('/upfile/category/');
}

class ProductImageCollector {
  constructor(base, host) {
    this.base = base;
    this.host = host;
    this.items = [];
    this.seen = new Set();
  }

  element(el) {
    const raw = el.getAttribute('data-original') || el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || el.getAttribute('src');
    if (!raw) return;
    let url;
    try { url = new URL(raw, this.base); } catch { return; }
    if (!isAllowedImage(url, this.host) || this.seen.has(url.href)) return;
    this.seen.add(url.href);
    this.items.push({ url: url.href, alt: (el.getAttribute('alt') || '').trim() });
  }
}

async function loadLocalSnapshot(context, incoming, dept, id, config) {
  const snapshotUrl = new URL(`/assets/catalog/products/${encodeURIComponent(dept)}/${encodeURIComponent(id)}.json`, incoming.origin);
  let response;
  try {
    if (context.env?.ASSETS?.fetch) {
      response = await context.env.ASSETS.fetch(new Request(snapshotUrl.href));
    } else {
      response = await fetch(snapshotUrl.href, { cf: { cacheEverything: true, cacheTtl: 86400 } });
    }
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.items) || !data.items.length) return null;
    const seen = new Set();
    const items = [];
    for (const item of data.items) {
      let u;
      try { u = new URL(item.url); } catch { continue; }
      if (!isAllowedImage(u, config.host) || seen.has(u.href)) continue;
      seen.add(u.href);
      items.push({ url: u.href, alt: String(item.alt || '') });
    }
    return items.length ? items : null;
  } catch {
    return null;
  }
}

async function loadLiveItems(config, id) {
  const target = new URL(`https://${config.host}/categoryen_${id}.html`);
  target.searchParams.set('path', `0_${id}`);
  const upstream = await fetch(target.href, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; QIQI-Catalog/3.0)',
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': `https://${config.host}/`
    },
    cf: { cacheEverything: true, cacheTtl: EDGE_TTL }
  });
  if (!upstream.ok) throw new Error(`Catalog source returned ${upstream.status}`);
  const finalUrl = new URL(upstream.url || target.href);
  if (finalUrl.hostname.toLowerCase() !== config.host) throw new Error('Unexpected catalog redirect');
  const collector = new ProductImageCollector(finalUrl, config.host);
  const transformed = new HTMLRewriter().on('img', collector).transform(upstream);
  await transformed.arrayBuffer();
  return collector.items;
}

function pageUrl(origin, dept, id, page) {
  return `${origin}/local-catalog?dept=${encodeURIComponent(dept)}&id=${encodeURIComponent(id)}&page=${page}`;
}

function renderPager({ origin, dept, id, page, pages, total }) {
  if (pages <= 1) return '';
  const prev = page > 1 ? `<a href="${esc(pageUrl(origin, dept, id, page - 1))}">← 上一页 / Prev</a>` : '<span></span>';
  const next = page < pages ? `<a href="${esc(pageUrl(origin, dept, id, page + 1))}">下一页 / Next →</a>` : '<span></span>';
  return `<nav class="pager">${prev}<strong>${page} / ${pages} · ${total} images</strong>${next}</nav>`;
}

function renderPage({ dept, id, title, allItems, items, origin, page, pages, fallbackId, sourceMode }) {
  const localFallback = `${origin}/assets/catalog/${encodeURIComponent(dept)}/${encodeURIComponent(id)}.jpg`;
  const defaultFallback = `${origin}/assets/catalog/${encodeURIComponent(dept)}/${encodeURIComponent(fallbackId)}.jpg`;
  const cards = items.map((item, offset) => {
    const globalIndex = (page - 1) * PAGE_SIZE + offset;
    const proxied = `${origin}/catalog-proxy?u=${encodeURIComponent(item.url)}&fallback=${encodeURIComponent(localFallback)}`;
    const productName = item.alt || `Product ${String(globalIndex + 1).padStart(3, '0')}`;
    const waText = `Hello, I want a quote for ${dept} category ${id}, item ${globalIndex + 1}.`;
    const priority = offset < 4 ? 'eager' : 'lazy';
    const fetchPriority = offset < 3 ? 'high' : 'auto';
    return `<article class="product-card">
      <button class="image-button" type="button" data-name="${esc(productName)}" aria-label="View ${esc(productName)}">
        <img src="${esc(proxied)}" data-fallback="${esc(localFallback)}" data-default="${esc(defaultFallback)}" alt="${esc(productName)}" loading="${priority}" fetchpriority="${fetchPriority}" decoding="async" width="520" height="520">
      </button>
      <div class="product-meta"><strong>${esc(productName)}</strong><span>ID ${esc(id)}-${globalIndex + 1}</span><a class="quote" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener noreferrer">WhatsApp 询价 / Quote</a></div>
    </article>`;
  }).join('');
  const pager = renderPager({ origin, dept, id, page, pages, total: allItems.length });
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>QIQI SHOES · ${esc(title)}</title><style>
:root{--bg:#0d0d0f;--panel:#17171a;--line:#303036;--text:#fff;--muted:#aaa;--acid:#c9ff22;--green:#20bd63}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,"Microsoft YaHei",sans-serif}.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;background:rgba(13,13,15,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(10px)}.brand{font-weight:950;letter-spacing:1px;color:#fff;text-decoration:none}.back{color:#fff;text-decoration:none;border:1px solid #555;padding:9px 13px}.wa-top{color:#fff;text-decoration:none;background:var(--green);padding:10px 14px;font-weight:900}.wrap{max-width:1500px;margin:auto;padding:28px 20px 60px}.eyebrow{color:var(--acid);font-weight:900;letter-spacing:2px}.head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin:8px 0 22px}.head h1{margin:0;font-size:clamp(30px,4vw,54px)}.head p{margin:0;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.product-card{background:var(--panel);border:1px solid var(--line);min-width:0}.image-button{display:block;width:100%;aspect-ratio:1/1;padding:0;border:0;background:#eee;cursor:zoom-in;overflow:hidden}.image-button img{display:block;width:100%;height:100%;object-fit:contain;background:#fff}.product-meta{padding:12px}.product-meta strong{display:block;font-size:14px;line-height:1.35;min-height:38px}.product-meta span{display:block;color:var(--muted);font-size:12px;margin:6px 0 10px}.quote{display:flex;align-items:center;justify-content:center;min-height:40px;background:var(--green);color:#fff;text-decoration:none;font-weight:900;font-size:13px}.empty{padding:80px 20px;text-align:center;color:#bbb;border:1px dashed #555}.pager{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:22px 0}.pager a{color:#fff;text-decoration:none;border:1px solid #555;padding:10px 14px}.pager a:last-child{justify-self:end}.pager strong{color:var(--acid);font-size:13px}.mode{font-size:11px;color:#777;margin-top:6px}.modal{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.88)}.modal.open{display:flex}.modal-box{position:relative;max-width:min(1000px,96vw);max-height:94vh;background:#fff;padding:12px}.modal img{display:block;max-width:100%;max-height:84vh;object-fit:contain}.close{position:absolute;right:8px;top:8px;width:40px;height:40px;border:0;background:#111;color:#fff;font-size:24px;cursor:pointer}.modal-name{color:#111;padding:10px 48px 2px 2px;font-weight:800}@media(max-width:1150px){.grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:850px){.grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:620px){.top{padding:10px}.top .brand{font-size:13px}.back{padding:8px}.wa-top{padding:8px;font-size:12px}.wrap{padding:20px 10px 50px}.head{display:block}.head p{margin-top:8px}.grid{grid-template-columns:repeat(2,1fr);gap:8px}.product-meta{padding:9px}.product-meta strong{font-size:12px}.pager{grid-template-columns:1fr 1fr}.pager strong{grid-column:1/-1;grid-row:1;text-align:center}.pager a{grid-row:2}}</style></head><body>
<header class="top"><a class="brand" href="/">QIQI SHOES · LOCAL CATALOG</a><a class="back" href="javascript:history.back()">← 返回 / Back</a><a class="wa-top" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener noreferrer">WhatsApp</a></header><main class="wrap"><div class="eyebrow">${esc(title)}</div><div class="head"><div><h1>产品图片 / Product Images</h1><div class="mode">LOCAL SNAPSHOT: ${esc(sourceMode)}</div></div><p>分类 ID ${esc(id)} · 共 ${allItems.length} 张 · 每页 ${PAGE_SIZE} 张</p></div>${pager}${items.length ? `<section class="grid">${cards}</section>` : '<div class="empty">此分类暂时没有读取到图片，请稍后刷新。</div>'}${pager}</main><div class="modal" id="modal" aria-hidden="true"><div class="modal-box"><button class="close" type="button" aria-label="Close">×</button><div class="modal-name" id="modalName"></div><img id="modalImg" alt=""></div></div><script>(()=>{document.querySelectorAll('.product-card img').forEach(im=>{im.addEventListener('error',()=>{if(im.dataset.stage!=='local'){im.dataset.stage='local';im.src=im.dataset.fallback;return}if(im.dataset.stage!=='default'){im.dataset.stage='default';im.src=im.dataset.default;return}im.style.opacity='.35'})});const modal=document.getElementById('modal'),img=document.getElementById('modalImg'),name=document.getElementById('modalName');document.querySelectorAll('.image-button').forEach(b=>b.addEventListener('click',()=>{const shown=b.querySelector('img');img.src=shown?.src||'';img.alt=b.dataset.name||'';name.textContent=b.dataset.name||'';modal.classList.add('open');modal.setAttribute('aria-hidden','false')}));function close(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');img.src=''}document.querySelector('.close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});addEventListener('keydown',e=>{if(e.key==='Escape')close()})})();</script></body></html>`;
}

export async function onRequest(context) {
  const { request } = context;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method Not Allowed', { status: 405 });
  const incoming = new URL(request.url);
  const dept = (incoming.searchParams.get('dept') || '').toLowerCase();
  const id = incoming.searchParams.get('id') || '';
  const requestedPage = Math.max(1, parseInt(incoming.searchParams.get('page') || '1', 10) || 1);
  const config = DEPARTMENTS[dept];
  if (!config || !/^\d{1,9}$/.test(id)) return new Response('Invalid catalog category', { status: 400 });

  const cache = caches.default;
  const normalized = new URL(incoming.origin + '/local-catalog');
  normalized.searchParams.set('dept', dept); normalized.searchParams.set('id', id); normalized.searchParams.set('page', String(requestedPage)); normalized.searchParams.set('_v', CACHE_VERSION);
  const cacheKey = new Request(normalized.href, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return request.method === 'HEAD' ? new Response(null, { status: cached.status, headers: cached.headers }) : cached;

  let allItems = await loadLocalSnapshot(context, incoming, dept, id, config);
  let sourceMode = 'STATIC';
  if (!allItems) {
    try { allItems = await loadLiveItems(config, id); sourceMode = 'LIVE-FALLBACK'; }
    catch { allItems = []; sourceMode = 'EMPTY'; }
  }

  const pages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const start = (page - 1) * PAGE_SIZE;
  const visibleItems = allItems.slice(start, start + PAGE_SIZE);
  const html = renderPage({ dept, id, title: config.label, allItems, items: visibleItems, origin: incoming.origin, page, pages, fallbackId: config.fallback, sourceMode });
  const headers = new Headers({'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400','x-robots-tag':'noindex, nofollow'});
  const response = new Response(request.method === 'HEAD' ? null : html, { status: 200, headers });
  if (request.method === 'GET' && page === requestedPage) context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
