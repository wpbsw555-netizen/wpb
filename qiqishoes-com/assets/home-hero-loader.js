(() => {
  'use strict';

  const script = document.currentScript;
  if (!script) return;

  const IMAGE_PARTS = [0, 1, 2, 3, 4].map(index =>
    new URL(`./aj4-hero.part${index}`, script.src).href
  );

  const COPY = {
    zh: {
      badge: 'HOT SELLING',
      title: '黑色 AJ4',
      points: ['高品质', '批发价格', '快速发货'],
      text: '保存产品图片，通过 WhatsApp 获取最新价格与运输报价。',
      button: '立即询价 / Get Price Now',
      alt: '黑色 AJ4 鞋款'
    },
    en: {
      badge: 'HOT SELLING',
      title: 'BLACK AJ4',
      points: ['Top Quality', 'Wholesale Price', 'Fast Shipping'],
      text: 'Save the product image and contact us on WhatsApp for the latest price and shipping quote.',
      button: 'Get Price Now',
      alt: 'Black AJ4 sneakers'
    },
    es: {
      badge: 'MÁS VENDIDO',
      title: 'AJ4 NEGRO',
      points: ['Alta calidad', 'Precio mayorista', 'Envío rápido'],
      text: 'Guarde la imagen y consulte por WhatsApp el precio y el envío más recientes.',
      button: 'Consultar precio',
      alt: 'Zapatillas AJ4 negras'
    }
  };

  function language() {
    const value = (document.documentElement.lang || 'zh').toLowerCase();
    if (value.startsWith('en')) return 'en';
    if (value.startsWith('es')) return 'es';
    return 'zh';
  }

  function addStyle() {
    document.getElementById('hero-aj4-reference-style')?.remove();
    const style = document.createElement('style');
    style.id = 'hero-aj4-reference-style';
    style.textContent = `
      .hero{display:grid!important;grid-template-columns:41% 59%!important;min-height:650px!important;background:#fff!important;overflow:hidden!important}
      .hero::before{display:none!important;content:none!important;background:none!important}
      .hero-content{grid-column:1!important;width:auto!important;max-width:none!important;min-height:650px!important;padding:52px 28px 46px 42px!important;background:#fff!important;justify-content:center!important}
      .hero h1{font-size:clamp(72px,7vw,112px)!important;line-height:.86!important;margin:24px 0 20px!important}
      .hero p{font-size:16px!important;line-height:1.75!important;margin:25px 0 30px!important}
      .hero-product{grid-column:2;position:relative;z-index:4;display:flex;flex-direction:column;justify-content:center;padding:18px 48px 28px 8px;background:#fff;min-width:0}
      .hero-shoe-wrap{height:400px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff}
      .hero-shoe{display:block;width:100%;height:100%;object-fit:contain;object-position:center center;opacity:1!important;filter:none!important;transform:none!important}
      .hero-sales{margin:8px 0 0 52px;padding:18px 18px 20px;border:2px solid #111;background:#fff;box-shadow:8px 8px 0 #111;color:#111}
      .hero-sales-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .hero-sales-badge{display:inline-flex;background:var(--acid);padding:10px 14px;font-size:12px;font-weight:900;letter-spacing:2px;color:#000}
      .hero-sales-title{font-size:29px;font-weight:950;line-height:1;text-transform:uppercase}
      .hero-sales-points{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}
      .hero-sales-points span{border:1px solid #111;padding:7px 11px;font-size:12px;font-weight:800;background:#fff}
      .hero-sales-text{margin:0 0 15px!important;font-size:13px!important;line-height:1.55!important;color:#222!important}
      .hero-sales-button{display:flex;align-items:center;justify-content:center;min-height:52px;background:#20bd63;color:#fff;text-decoration:none;font-size:15px;font-weight:900;border:2px solid #111;box-shadow:4px 4px 0 #111}
      .hero-sales-button::before{content:'◉';font-size:19px;margin-right:10px}
      @media(max-width:980px){
        .hero{grid-template-columns:45% 55%!important;min-height:680px!important}
        .hero-content{min-height:680px!important;padding:44px 24px 40px 30px!important}
        .hero-product{padding:20px 30px 28px 4px}
        .hero-shoe-wrap{height:350px}
        .hero-sales{margin-left:24px}
      }
      @media(max-width:720px){
        .hero{display:block!important;min-height:auto!important}
        .hero-content{min-height:auto!important;padding:36px 22px 30px!important}
        .hero-product{width:100%;padding:12px 18px 30px}
        .hero-shoe-wrap{height:300px}
        .hero-sales{margin:6px 4px 0}
        .hero::after{right:9px;top:18px;bottom:auto;font-size:10px;letter-spacing:3px}
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    const hero = document.querySelector('.hero');
    if (!hero) return null;
    hero.querySelectorAll('.hero-product,.hero-showcase,.hero-sales').forEach(node => node.remove());
    addStyle();

    const product = document.createElement('section');
    product.className = 'hero-product';
    product.innerHTML = `
      <div class="hero-shoe-wrap"><img class="hero-shoe" decoding="async" fetchpriority="high" alt=""></div>
      <aside class="hero-sales">
        <div class="hero-sales-top"><span class="hero-sales-badge"></span><strong class="hero-sales-title"></strong></div>
        <div class="hero-sales-points"></div>
        <p class="hero-sales-text"></p>
        <a class="hero-sales-button" href="https://wa.me/8613159065939?text=Hello%2C%20I%20want%20the%20latest%20price%20and%20shipping%20quote%20for%20the%20black%20AJ4." target="_blank" rel="noopener noreferrer"></a>
      </aside>`;
    hero.appendChild(product);

    const image = product.querySelector('.hero-shoe');
    const applyCopy = () => {
      const t = COPY[language()];
      product.querySelector('.hero-sales-badge').textContent = t.badge;
      product.querySelector('.hero-sales-title').textContent = t.title;
      product.querySelector('.hero-sales-points').innerHTML = t.points.map(point => `<span>${point}</span>`).join('');
      product.querySelector('.hero-sales-text').textContent = t.text;
      product.querySelector('.hero-sales-button').textContent = t.button;
      image.alt = t.alt;
    };
    applyCopy();
    new MutationObserver(applyCopy).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    return {product,image};
  }

  const ui = install();
  if (!ui) return;

  Promise.all(IMAGE_PARTS.map(async url => {
    const r = await fetch(url, {cache:'no-store'});
    if (!r.ok) throw new Error(`${url} -> ${r.status}`);
    return r.text();
  })).then(parts => {
    const base64 = parts.join('').replace(/\s+/g,'');
    const dataUrl = `data:image/webp;base64,${base64}`;
    ui.image.onload = () => {
      const card = document.querySelector('.dept.sneakers');
      if (card) card.style.setProperty('--image', `url("${dataUrl}")`);
      document.documentElement.classList.add('hero-image-ready');
    };
    ui.image.onerror = () => console.error('AJ4 image data URL failed to decode');
    ui.image.src = dataUrl;
  }).catch(err => console.error('AJ4 image parts failed to load', err));
})();
