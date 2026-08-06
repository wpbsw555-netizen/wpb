(() => {
  'use strict';

  const script = document.currentScript;
  if (!script) return;

  const IMAGE_PARTS = [0, 1, 2, 3].map(index =>
    `https://raw.githubusercontent.com/wpbsw555-netizen/wpb/28bb6dcae30af7529a4bd97d137aed60f10f2a56/scripts/home-hero-final.part${index}`
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

  function addLayout() {
    const hero = document.querySelector('.hero');
    if (!hero) return null;

    document.getElementById('hero-clear-layout-style')?.remove();
    hero.querySelector('.hero-product')?.remove();

    const style = document.createElement('style');
    style.id = 'hero-clear-layout-style';
    style.textContent = `
      .hero{
        display:grid!important;
        grid-template-columns:minmax(0,54%) minmax(0,46%)!important;
        min-height:620px!important;
        background:#fff!important;
        overflow:hidden!important;
      }
      .hero::before{content:none!important;display:none!important;background:none!important;filter:none!important}
      .hero-content{
        grid-column:1!important;
        width:auto!important;
        max-width:none!important;
        min-height:620px!important;
        padding:52px 46px!important;
        background:#fff!important;
      }
      .hero-product{
        grid-column:2;
        position:relative;
        z-index:4;
        min-width:0;
        padding:30px 42px 34px 22px;
        display:flex;
        flex-direction:column;
        justify-content:center;
        background:linear-gradient(145deg,#fafafa 0%,#ededed 100%);
        color:#111;
      }
      .hero-shoe-wrap{
        min-height:335px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      }
      .hero-shoe{
        display:block;
        width:100%;
        max-width:650px;
        height:auto;
        max-height:385px;
        object-fit:contain;
        image-rendering:auto;
        filter:none!important;
        opacity:1!important;
        transform:none!important;
      }
      .hero-sales{
        margin-top:12px;
        padding:17px 18px 18px;
        background:#fff;
        border:2px solid #111;
        box-shadow:7px 7px 0 #111;
      }
      .hero-sales-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .hero-sales-badge{display:inline-flex;background:var(--acid);color:#000;padding:8px 11px;font-size:11px;font-weight:900;letter-spacing:1.6px;transform:rotate(-1deg)}
      .hero-sales-title{font-size:24px;line-height:1;font-weight:950;letter-spacing:-1px;text-transform:uppercase}
      .hero-sales-points{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 11px}
      .hero-sales-points span{padding:6px 9px;border:1px solid #111;background:#fff;font-size:11px;font-weight:800}
      .hero-sales-text{margin:0 0 12px!important;color:#333!important;font-size:12px!important;line-height:1.55!important}
      .hero-sales-button{display:flex;min-height:44px;align-items:center;justify-content:center;background:#20bd63;color:#fff;text-decoration:none;font-size:13px;font-weight:900;border:2px solid #111;box-shadow:4px 4px 0 #111;transition:.18s}
      .hero-sales-button:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #111}
      @media(max-width:980px){
        .hero{grid-template-columns:minmax(0,56%) minmax(0,44%)!important;min-height:680px!important}
        .hero-content{min-height:680px!important;padding:42px 32px!important}
        .hero-product{padding:26px 31px 29px 14px}
        .hero-shoe-wrap{min-height:310px}
        .hero-shoe{max-height:345px}
      }
      @media(max-width:720px){
        .hero{display:block!important;min-height:auto!important}
        .hero-content{width:100%!important;min-height:auto!important;padding:36px 22px 34px!important;background:#fff!important}
        .hero-product{width:100%;padding:22px 22px 30px;background:linear-gradient(180deg,#fafafa,#ededed)}
        .hero-shoe-wrap{min-height:260px}
        .hero-shoe{width:100%;max-height:320px}
        .hero-sales{margin-top:8px}
        .hero::after{right:9px;top:18px;bottom:auto;font-size:10px;letter-spacing:3px}
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

    const applyCopy = () => {
      const t = COPY[language()];
      product.querySelector('.hero-sales-badge').textContent = t.badge;
      product.querySelector('.hero-sales-title').textContent = t.title;
      product.querySelector('.hero-sales-points').innerHTML = t.points.map(point => `<span>${point}</span>`).join('');
      product.querySelector('.hero-sales-text').textContent = t.text;
      product.querySelector('.hero-sales-button').textContent = t.button;
      product.querySelector('.hero-shoe').alt = t.alt;
    };

    applyCopy();
    new MutationObserver(applyCopy).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });

    return product;
  }

  const product = addLayout();
  if (!product) return;

  Promise.all(IMAGE_PARTS.map(async url => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return response.text();
  }))
    .then(parts => {
      const base64 = parts.join('').replace(/\s+/g, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      const image = product.querySelector('.hero-shoe');
      image.src = objectUrl;

      const sneakerCard = document.querySelector('.dept.sneakers');
      if (sneakerCard) sneakerCard.style.setProperty('--image', `url("${objectUrl}")`);

      document.documentElement.classList.add('hero-image-ready');
    })
    .catch(error => {
      console.error('Homepage AJ4 image failed to load', error);
    });
})();
