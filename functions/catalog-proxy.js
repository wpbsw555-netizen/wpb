const WHATSAPP = '8613159065939';

function isAllowedTarget(url) {
  if (!(url instanceof URL) || url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return host === 'tangma2088.com' || host.endsWith('.tangma2088.com');
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
    for (const attr of ['src', 'data-src', 'data-original', 'data-lazy-src']) {
      const value = el.getAttribute(attr);
      const target = resolveTarget(value, this.base);
      if (target) el.setAttribute(attr, proxyHref(target, this.request));
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
    el.append(`<style id="qiqi-mirror-style">#qiqi-mirror-bar{position:sticky;top:0;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:#0d0d0f;color:#fff;border-bottom:2px solid #c8ff18;font:700 14px/1.2 Arial,sans-serif}#qiqi-mirror-bar a{color:#fff!important;text-decoration:none!important}#qiqi-mirror-bar .qiqi-home{font-weight:900;letter-spacing:1px}#qiqi-mirror-bar .qiqi-wa{background:#20bd63;padding:8px 12px;border-radius:3px}html{scroll-padding-top:54px}</style>`, { html: true });
  }
}

class BodyHandler {
  element(el) {
    el.prepend(`<div id="qiqi-mirror-bar"><a class="qiqi-home" href="/">QIQI SHOES · CATALOG</a><a href="javascript:history.back()">← Back / 返回</a><a class="qiqi-wa" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>`, { html: true });
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

  let target;
  try { target = new URL(raw); } catch { return new Response('Bad catalog target', { status: 400 }); }
  if (!isAllowedTarget(target)) return new Response('Catalog target is not allowed', { status: 403 });

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return request.method === 'HEAD' ? new Response(null, { status: cached.status, headers: cached.headers }) : cached;

  let upstream;
  try {
    upstream = await fetch(target.href, {
      redirect: 'follow',
      headers: {
        'Accept': request.headers.get('Accept') || '*/*',
        'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
        'Referer': `${target.origin}/`
      }
    });
  } catch (error) {
    return new Response(`Catalog source fetch failed: ${error?.message || error}`, { status: 502 });
  }

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
