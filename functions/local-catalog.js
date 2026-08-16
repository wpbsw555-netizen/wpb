const WHATSAPP = '8613159065939';

const DEPARTMENTS = {
  fashion: { host: 'www.tangma2088.com', label: 'FASHION / 时尚服饰' },
  accessories: { host: 'acc.tangma2088.com', label: 'ACCESSORIES / 潮流配件' },
  bags: { host: 'bags.tangma2088.com', label: 'BAGS / 包包目录' },
  shoes: { host: 'shoes.tangma2088.com', label: 'SHOES / 鞋子目录' }
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
    const raw = el.getAttribute('data-original') ||
      el.getAttribute('data-src') ||
      el.getAttribute('data-lazy-src') ||
      el.getAttribute('src');
    if (!raw) return;

    let url;
    try { url = new URL(raw, this.base); } catch { return; }
    if (!isAllowedImage(url, this.host)) return;

    const key = url.href;
    if (this.seen.has(key)) return;
    this.seen.add(key);

    const alt = (el.getAttribute('alt') || '').trim();
    this.items.push({ url: url.href, alt });
  }
}

function renderPage({ dept, id, title, items, origin }) {
  const cards = items.map((item, index) => {
    const proxied = `${origin}/catalog-proxy?u=${encodeURIComponent(item.url)}`;
    const productName = item.alt || `Product ${String(index + 1).padStart(3, '0')}`;
    const waText = `Hello, I want a quote for ${dept} category ${id}, item ${index + 1}.`;
    return `<article class="product-card">
      <button class="image-button" type="button" data-full="${esc(proxied)}" data-name="${esc(productName)}" aria-label="View ${esc(productName)}">
        <img src="${esc(proxied)}" alt="${esc(productName)}" loading="lazy" decoding="async">
      </button>
      <div class="product-meta">
        <strong>${esc(productName)}</strong>
        <span>ID ${esc(id)}-${index + 1}</span>
        <a class="quote" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener noreferrer">WhatsApp 询价 / Quote</a>
      </div>
    </article>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>QIQI SHOES · ${esc(title)}</title>
<style>
:root{--bg:#0d0d0f;--panel:#17171a;--line:#303036;--text:#fff;--muted:#aaa;--acid:#c9ff22;--green:#20bd63}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,"Microsoft YaHei",sans-serif}.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;background:rgba(13,13,15,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(10px)}.brand{font-weight:950;letter-spacing:1px;color:#fff;text-decoration:none}.back{color:#fff;text-decoration:none;border:1px solid #555;padding:9px 13px}.wa-top{color:#fff;text-decoration:none;background:var(--green);padding:10px 14px;font-weight:900}.wrap{max-width:1500px;margin:auto;padding:28px 20px 60px}.eyebrow{color:var(--acid);font-weight:900;letter-spacing:2px}.head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin:8px 0 22px}.head h1{margin:0;font-size:clamp(30px,4vw,54px)}.head p{margin:0;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.product-card{background:var(--panel);border:1px solid var(--line);min-width:0}.image-button{display:block;width:100%;height:260px;padding:0;border:0;background:#eee;cursor:zoom-in;overflow:hidden}.image-button img{display:block;width:100%;height:100%;object-fit:contain;background:#fff}.product-meta{padding:12px}.product-meta strong{display:block;font-size:14px;line-height:1.35;min-height:38px}.product-meta span{display:block;color:var(--muted);font-size:12px;margin:6px 0 10px}.quote{display:flex;align-items:center;justify-content:center;min-height:40px;background:var(--green);color:#fff;text-decoration:none;font-weight:900;font-size:13px}.empty{padding:80px 20px;text-align:center;color:#bbb;border:1px dashed #555}.modal{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.88)}.modal.open{display:flex}.modal-box{position:relative;max-width:min(1000px,96vw);max-height:94vh;background:#fff;padding:12px}.modal img{display:block;max-width:100%;max-height:84vh;object-fit:contain}.close{position:absolute;right:8px;top:8px;width:40px;height:40px;border:0;background:#111;color:#fff;font-size:24px;cursor:pointer}.modal-name{color:#111;padding:10px 48px 2px 2px;font-weight:800}
@media(max-width:1150px){.grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:850px){.grid{grid-template-columns:repeat(3,1fr)}.image-button{height:230px}}@media(max-width:620px){.top{padding:10px}.top .brand{font-size:13px}.back{padding:8px}.wa-top{padding:8px;font-size:12px}.wrap{padding:20px 10px 50px}.head{display:block}.head p{margin-top:8px}.grid{grid-template-columns:repeat(2,1fr);gap:8px}.image-button{height:190px}.product-meta{padding:9px}.product-meta strong{font-size:12px}}
</style>
</head>
<body>
<header class="top"><a class="brand" href="/">QIQI SHOES · LOCAL CATALOG</a><a class="back" href="javascript:history.back()">← 返回 / Back</a><a class="wa-top" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener noreferrer">WhatsApp</a></header>
<main class="wrap"><div class="eyebrow">${esc(title)}</div><div class="head"><h1>产品图片 / Product Images</h1><p>分类 ID ${esc(id)} · ${items.length} 张图片 · 点击图片可放大</p></div>${items.length ? `<section class="grid">${cards}</section>` : '<div class="empty">此分类暂时没有读取到图片，请稍后刷新。</div>'}</main>
<div class="modal" id="modal" aria-hidden="true"><div class="modal-box"><button class="close" type="button" aria-label="Close">×</button><div class="modal-name" id="modalName"></div><img id="modalImg" alt=""></div></div>
<script>
(()=>{const modal=document.getElementById('modal'),img=document.getElementById('modalImg'),name=document.getElementById('modalName');document.querySelectorAll('.image-button').forEach(b=>b.addEventListener('click',()=>{img.src=b.dataset.full;img.alt=b.dataset.name||'';name.textContent=b.dataset.name||'';modal.classList.add('open');modal.setAttribute('aria-hidden','false')}));function close(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');img.src=''}document.querySelector('.close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});addEventListener('keydown',e=>{if(e.key==='Escape')close()})})();
</script>
</body></html>`;
}

export async function onRequest(context) {
  const { request } = context;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method Not Allowed', { status: 405 });

  const incoming = new URL(request.url);
  const dept = (incoming.searchParams.get('dept') || '').toLowerCase();
  const id = incoming.searchParams.get('id') || '';
  const config = DEPARTMENTS[dept];
  if (!config || !/^\d{1,9}$/.test(id)) return new Response('Invalid catalog category', { status: 400 });

  const target = new URL(`https://${config.host}/categoryen_${id}.html`);
  target.searchParams.set('path', `0_${id}`);

  let upstream;
  try {
    upstream = await fetch(target.href, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QIQI-Catalog/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://${config.host}/`
      }
    });
  } catch (error) {
    return new Response('Catalog source temporarily unavailable', { status: 502 });
  }

  if (!upstream.ok) return new Response(`Catalog source returned ${upstream.status}`, { status: 502 });

  const finalUrl = new URL(upstream.url || target.href);
  if (finalUrl.hostname.toLowerCase() !== config.host) return new Response('Unexpected catalog redirect', { status: 502 });

  const collector = new ProductImageCollector(finalUrl, config.host);
  const transformed = new HTMLRewriter().on('img', collector).transform(upstream);
  await transformed.arrayBuffer();

  const origin = incoming.origin;
  const html = renderPage({ dept, id, title: config.label, items: collector.items, origin });
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate',
    'x-robots-tag': 'noindex, nofollow'
  });
  return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers });
}
