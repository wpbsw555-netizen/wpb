const WHATSAPP = '8613159065939';

function isAllowedTarget(url) {
  if (!(url instanceof URL)) return false;
  const host = url.hostname.toLowerCase();
  const isQiqiyg = host === 'qiqiyg.com' || host.endsWith('.qiqiyg.com');
  if (isQiqiyg) return url.protocol === 'https:' || url.protocol === 'http:';
  return url.protocol === 'https:' && (host === 'tangma2088.com' || host.endsWith('.tangma2088.com'));
}

function resolveTarget(value, base) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;
  try {
    const url = new URL(trimmed, base);
    return isAllowedTarget(url) ? url : null;
  } catch {
    return null;
  }
}

function proxyHref(url, request) {
  const here = new URL(request.url);
  return `${here.origin}/catalog-proxy?u=${encodeURIComponent(url.href)}`;
}

function rewriteCss(css, base, request) {
  return css.replace(/url\(\s*(['\"]?)([^'\")]+)\1\s*\)/gi, (all, quote, raw) => {
    const target = resolveTarget(raw, base);
    if (!target) return all;
    return `url("${proxyHref(target, request)}")`;
  });
}

function rewriteSrcset(value, base, request) {
  return String(value || '').split(',').map((part) => {
    const bits = part.trim().split(/\s+/);
    if (!bits[0]) return part;
    const target = resolveTarget(bits[0], base);
    if (!target) return part;
    bits[0] = proxyHref(target, request);
    return bits.join(' ');
  }).join(', ');
}

class AnchorHandler {
  constructor(base, request) { this.base = base; this.request = request; }
  element(el) {
    el.removeAttribute('target');
    el.removeAttribute('rel');
    el.removeAttribute('onclick');
    const href = el.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const target = resolveTarget(href, this.base);
    if (target) {
      el.setAttribute('href', proxyHref(target, this.request));
      return;
    }
    if (/^(?:https?:)?\/\//i.test(href) || /^(?:javascript|mailto|tel):/i.test(href)) {
      el.setAttribute('href', '#');
    }
  }
}

class ImageHandler {
  constructor(base, request) { this.base = base; this.request = request; }
  element(el) {
    let displaySrc = null;
    const priority = ['data-original', 'data-src', 'data-lazy-src', 'src'];
    for (const attr of priority) {
      const value = el.getAttribute(attr);
      const target = resolveTarget(value, this.base);
      if (!target) continue;
      const proxied = proxyHref(target, this.request);
      el.setAttribute(attr, proxied);
      if (!displaySrc) displaySrc = proxied;
    }
    if (displaySrc) {
      el.setAttribute('src', displaySrc);
      el.removeAttribute('data-original');
      el.removeAttribute('data-src');
      el.removeAttribute('data-lazy-src');
      el.removeAttribute('loading');
      const cls = (el.getAttribute('class') || '')
        .split(/\s+/)
        .filter(Boolean)
        .filter(x => !/^(?:lazy|lazyload|lazyloaded)$/i.test(x))
        .join(' ');
      if (cls) el.setAttribute('class', cls); else el.removeAttribute('class');
    }
    for (const attr of ['srcset', 'data-srcset']) {
      const value = el.getAttribute(attr);
      if (value) el.setAttribute(attr, rewriteSrcset(value, this.base, this.request));
    }
    const style = el.getAttribute('style');
    if (style) el.setAttribute('style', rewriteCss(style, this.base, this.request));
  }
}

class AssetLinkHandler {
  constructor(base, request) { this.base = base; this.request = request; }
  element(el) {
    const href = el.getAttribute('href');
    const target = resolveTarget(href, this.base);
    if (target) el.setAttribute('href', proxyHref(target, this.request));
  }
}

class FormHandler {
  constructor(base, request) { this.base = base; this.request = request; }
  element(el) {
    const action = el.getAttribute('action');
    const target = resolveTarget(action, this.base);
    if (target) el.setAttribute('action', proxyHref(target, this.request));
    else el.setAttribute('action', '#');
    el.setAttribute('method', 'get');
  }
}

class StyleHandler {
  constructor(base, request) { this.base = base; this.request = request; }
  text(text) {
    if (text.text) text.replace(rewriteCss(text.text, this.base, this.request));
  }
}

class HeadHandler {
  element(el) {
    el.append(`<style id="qiqi-persistent-style">#qiqi-persistent-nav{position:sticky;top:0;z-index:2147483647;display:grid;grid-template-columns:230px 1fr auto;gap:16px;align-items:center;padding:12px 18px;background:#fff;color:#0755a0;border-bottom:1px solid #dbe6ed;box-shadow:0 6px 18px rgba(0,0,0,.12);font-family:Arial,sans-serif}#qiqi-persistent-nav .qiqi-brand{display:flex;align-items:center;gap:12px;color:#087cb9;text-decoration:none;font-size:24px;font-weight:900}#qiqi-persistent-nav .qiqi-brand img{width:64px;height:64px;border-radius:50%;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,.22)}#qiqi-persistent-nav .qiqi-links{display:grid;grid-template-columns:repeat(6,minmax(88px,1fr));gap:8px}#qiqi-persistent-nav .qiqi-links a{min-height:46px;display:flex;align-items:center;justify-content:center;padding:7px;border:1px solid #aad0e8;border-radius:9px;background:linear-gradient(#fff,#f2f8fc);color:#005ca1!important;text-decoration:none!important;font-weight:800;text-align:center}#qiqi-persistent-nav .qiqi-links a:hover{color:#fff!important;background:linear-gradient(#1887c2,#006fa8)}#qiqi-persistent-nav .qiqi-langs{white-space:nowrap;color:#1a45e6;font-size:13px}#qiqi-persistent-nav .qiqi-wa{display:inline-flex;margin-left:8px;padding:9px 12px;border-radius:8px;background:#20bd63;color:#fff!important;text-decoration:none!important;font-weight:900}@media(max-width:900px){#qiqi-persistent-nav{grid-template-columns:1fr;padding:9px 10px;gap:8px}#qiqi-persistent-nav .qiqi-brand img{width:48px;height:48px}#qiqi-persistent-nav .qiqi-brand{font-size:19px}#qiqi-persistent-nav .qiqi-links{display:flex;overflow-x:auto;padding-bottom:4px}#qiqi-persistent-nav .qiqi-links a{min-width:110px}#qiqi-persistent-nav .qiqi-langs{text-align:right}}</style>`, { html: true });
  }
}

class BodyHandler {
  element(el) {
    el.prepend(`<header id="qiqi-persistent-nav"><a class="qiqi-brand" href="/"><img src="/assets/accessories-logo.svg?v=202608012037" alt="Wrestling"><strong>Wrestling</strong></a><nav class="qiqi-links" aria-label="Catalog navigation"><a href="/">Home</a><a href="/tennis-shoes/">Sneakers</a><a href="/fashion/">Fashion</a><a href="/accessories/">Accessories</a><a href="/bags/">Bags</a><a href="/shoes/">Shoes</a></nav><div class="qiqi-langs">中文&nbsp; | &nbsp;English&nbsp; | &nbsp;Español<a class="qiqi-wa" href="https://wa.me/8613159065939" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></header>`, { html: true });
  }
}

class RemoveHandler { element(el) { el.remove(); } }
class StripEventHandler {
  element(el) {
    for (const attr of ['onclick','onmousedown','onmouseup','onmouseover','onmouseout','onload','onerror']) el.removeAttribute(attr);
  }
}

export async function onRequest(context) {
  const { request } = context;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method Not Allowed', { status: 405 });

  const incoming = new URL(request.url);
  const raw = incoming.searchParams.get('u');
  if (!raw) return new Response('Missing catalog target', { status: 400 });

  let fallbackUrl = null;
  const fallbackRaw = incoming.searchParams.get('fallback');
  if (fallbackRaw) {
    try {
      const candidate = new URL(fallbackRaw, incoming.origin);
      if (candidate.origin === incoming.origin && candidate.pathname.startsWith('/assets/catalog/')) fallbackUrl = candidate;
    } catch {}
  }

  let target;
  try { target = new URL(raw); } catch { return new Response('Bad catalog target', { status: 400 }); }
  if (!isAllowedTarget(target)) return new Response('Catalog target is not allowed', { status: 403 });

  const fetchTarget = new URL(target.href);
  const fetchHost = fetchTarget.hostname.toLowerCase();
  if (fetchHost === 'qiqiyg.com' || fetchHost.endsWith('.qiqiyg.com')) fetchTarget.protocol = 'http:';

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return request.method === 'HEAD' ? new Response(null, { status: cached.status, headers: cached.headers }) : cached;

  let upstream = null;
  let lastFetchError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstream = await fetch(fetchTarget.href, {
        redirect: 'follow',
        headers: {
          'Accept': request.headers.get('Accept') || '*/*',
          'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
          'Referer': `${fetchTarget.origin}/`,
          'User-Agent': 'Mozilla/5.0 (compatible; QIQI-Image-Proxy/2.0)'
        },
        cf: { cacheEverything: true, cacheTtl: 2592000 }
      });
      if (upstream.ok || upstream.status < 500) break;
    } catch (error) {
      lastFetchError = error;
      upstream = null;
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 180 * (attempt + 1)));
  }

  if (!upstream) {
    if (fallbackUrl) return Response.redirect(fallbackUrl.href, 302);
    return new Response(`Catalog source fetch failed: ${lastFetchError?.message || lastFetchError || 'unknown error'}`, { status: 502 });
  }
  if (!upstream.ok && fallbackUrl) return Response.redirect(fallbackUrl.href, 302);

  let finalUrl;
  try { finalUrl = new URL(upstream.url || target.href); } catch { finalUrl = target; }
  if (!isAllowedTarget(finalUrl)) return new Response('Catalog source redirected outside the allowed host', { status: 502 });

  const type = (upstream.headers.get('content-type') || '').toLowerCase();

  if (type.includes('text/html')) {
    const headers = new Headers();
    headers.set('content-type', upstream.headers.get('content-type') || 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-store');
    headers.set('x-robots-tag', 'noindex, nofollow');
    const baseResponse = new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers });
    if (request.method === 'HEAD') return baseResponse;

    return new HTMLRewriter()
      .on('base', new RemoveHandler())
      .on('script', new RemoveHandler())
      .on('meta[http-equiv="refresh"]', new RemoveHandler())
      .on('head', new HeadHandler())
      .on('body', new BodyHandler())
      .on('a[href]', new AnchorHandler(finalUrl, request))
      .on('form', new FormHandler(finalUrl, request))
      .on('img', new ImageHandler(finalUrl, request))
      .on('source', new ImageHandler(finalUrl, request))
      .on('input[type="image"]', new ImageHandler(finalUrl, request))
      .on('link[rel="stylesheet"]', new AssetLinkHandler(finalUrl, request))
      .on('link[rel*="icon"]', new AssetLinkHandler(finalUrl, request))
      .on('style', new StyleHandler(finalUrl, request))
      .on('[style]', new ImageHandler(finalUrl, request))
      .on('*', new StripEventHandler())
      .transform(baseResponse);
  }

  if (type.includes('text/css')) {
    const css = rewriteCss(await upstream.text(), finalUrl, request);
    const headers = new Headers();
    headers.set('content-type', upstream.headers.get('content-type') || 'text/css; charset=utf-8');
    headers.set('cache-control', 'public, max-age=2592000, s-maxage=2592000, immutable');
    const out = new Response(request.method === 'HEAD' ? null : css, { status: upstream.status, headers });
    if (upstream.ok && request.method === 'GET') context.waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers.set('content-disposition', disposition);
  headers.set('cache-control', 'public, max-age=2592000, s-maxage=2592000, immutable');
  headers.set('access-control-allow-origin', '*');
  const out = new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers });
  if (upstream.ok && request.method === 'GET') context.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
