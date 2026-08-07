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

  function installLayout() {
    const hero = document.querySelector('.hero');
    if (!hero) return null;

    document.getElementById('hero-aj4-reference-style')?.remove();
    hero.querySelector('.hero-product')?.remove();

    const style = document.createElement('style');
    style.id = 'hero-aj4-reference-style';
    style.textContent = `
      .hero{
        display:grid!important;
        grid-template-columns:minmax(0,40%) minmax(0,60%)!important;
        min-height:690px!important;
        overflow:hidden!important;
        background:#fff!important;
        color:#111!important;
        border:1px solid #ddd!important;
      }
      .hero::before{content:none!important;display:none!important;background:none!important}
      .hero-content{
        grid-column:1!important;
        width:auto!important;
        max-width:none!important;
        min-height:690px!important;
        padding:54px 24px 48px 38px!important;
        background:#fff!important;
        justify-content:center!important;
      }
      .hero h1{
        margin:23px 0 18px!important;
        font-size:clamp(62px,7vw,112px)!important;
        line-height:.84!important;
        letter-spacing:-6px!important;
      }
      .hero p{font-size:16px!important;line-height:1.75!important;margin:22px 0 30px!important}
      .hero-product{
        grid-column:2;
        position:relative;
        z-index:4;
        min-width:0;
        padding:18px 48px 34px 20px;
        display:flex;
        flex-direction:column;
        justify-content:center;
        background:#fff;
      }
      .hero-shoe-wrap{
        height:390px;
        display:flex;
        align-items:flex-end;
        justify-content:center;
        overflow:hidden;
        background:#fff;
      }
      .hero-shoe{
        display:block;
        width:min(100%,760px);
        max-height:390px;
        height:auto;
        object-fit:contain;
        image-rendering:auto;
        opacity:0;
        transition:opacity .18s ease;
      }
      .hero-shoe.loaded{opacity:1}
      .hero-sales{
        margin-top:8px;
        width:100%;
        padding:19px 20px 20px;
        background:#fff;
        border:2px solid #111;
        box-shadow:8px 8px 0 #111;
      }
      .hero-sales-top{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:14px}
      .hero-sales-badge{display:inline-flex;background:var(--acid);color:#000;padding:10px 14px;font-size:12px;font-weight:900;letter-spacing:1.8px}
      .hero-sales-title{font-size:29px;line-height:1;font-weight:950;letter-spacing:-1px;text-transform:uppercase}
      .hero-sales-points{display:flex;gap:9px;flex-wrap:wrap;margin:0 0 13px}
      .hero-sales-points span{padding:8px 11px;border:1px solid #111;background:#fff;font-size:12px;font-weight:800}
      .hero-sales-text{margin:0 0 14px!important;color:#333!important;font-size:13px!important;line-height:1.55!important}
      .hero-sales-button{display:flex;min-height:53px;align-items:center;justify-content:center;background:#20bd63;color:#fff;text-decoration:none;font-size:16px;font-weight:900;border:2px solid #111;box-shadow:4px 4px 0 #111;transition:.18s}
      .hero-sales-button::before{content:'◉';margin-right:10px;font-size:18px}
      .hero-sales-button:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #111}

      @media(max-width:1100px){
        .hero{grid-template-columns:minmax(0,44%) minmax(0,56%)!important}
        .hero-content{padding:48px 25px 44px 30px!important}
        .hero-product{padding:20px 34px 30px 12px}
        .hero-shoe-wrap{height:350px}
        .hero-shoe{max-height:350px}
      }
      @media(max-width:820px){
        .hero{display:block!important;min-height:auto!important}
        .hero-content{width:100%!important;min-height:auto!important;padding:42px 28px 32px!important}
        .hero-product{width:100%;padding:8px 28px 38px!important}
        .hero-shoe-wrap{height:auto;min-height:290px}
        .hero-shoe{width:100%;max-height:none}
        .hero-sales{margin-top:10px}
      }
      @media(max-width:560px){
        .hero-content{padding:34px 20px 26px!important}
        .hero h1{font-size:58px!important;letter-spacing:-3px!important}
        .hero-product{padding:4px 16px 28px!important}
        .hero-shoe-wrap{min-height:220px}
        .hero-sales{padding:15px 15px 16px;box-shadow:5px 5px 0 #111}
        .hero-sales-title{font-size:22px}
        .hero-sales-text{font-size:11px!important}
        .hero-sales-button{font-size:14px;min-height:48px}
      }
    `;
    document.head.appendChild(style);

    const product = document.createElement('section');
    product.className = 'hero-product';
    product.setAttribute('aria-label', 'Featured product');
    product.innerHTML = `
      <div class="hero-shoe-wrap">
        <img class="hero-shoe" decoding="async" fetchpriority="high" alt="">
      </div>
      <div class="hero-sales">
        <div class="hero-sales-top">
          <span class="hero-sales-badge"></span>
          <strong class="hero-sales-title"></strong>
        </div>
        <div class="hero-sales-points"></div>
        <p class="hero-sales-text"></p>
        <a class="hero-sales-button" href="https://wa.me/8613159065939?text=Hello%2C%20I%20want%20the%20latest%20price%20and%20shipping%20quote%20for%20the%20black%20AJ4." target="_blank" rel="noopener noreferrer"></a>
      </div>
    `;
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
    new MutationObserver(applyCopy).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });

    return { product, image };
  }

  const view = installLayout();
  if (!view) return;

  Promise.all(IMAGE_PARTS.map(async url => {
    const response = await fetch(`${url}?v=20260807-final`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return response.text();
  }))
    .then(parts => {
      let base64 = parts.join('').replace(/\s+/g, '');
      while (base64.length % 4) base64 += '=';

      const dataUrl = `data:image/webp;base64,${base64}`;
      view.image.onload = () => view.image.classList.add('loaded');
      view.image.onerror = () => console.error('AJ4 image data could not be decoded');
      view.image.src = dataUrl;

      const sneakerCard = document.querySelector('.dept.sneakers');
      if (sneakerCard) sneakerCard.style.setProperty('--image', `url("${dataUrl}")`);

      document.documentElement.classList.add('hero-image-ready');
    })
    .catch(error => {
      console.error('Homepage AJ4 image failed to load', error);
    });
})();
