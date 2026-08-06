(() => {
  const script = document.currentScript;
  if (!script) return;

  const IMAGE_PARTS = [0, 1, 2, 3].map(index =>
    `https://cdn.jsdelivr.net/gh/wpbsw555-netizen/wpb@28bb6dcae30af7529a4bd97d137aed60f10f2a56/scripts/home-hero-final.part${index}`
  );

  const copy = {
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

  function currentLanguage() {
    const value = (document.documentElement.lang || 'zh').toLowerCase();
    if (value.startsWith('en')) return 'en';
    if (value.startsWith('es')) return 'es';
    return 'zh';
  }

  function addStyles() {
    if (document.getElementById('hero-showcase-style')) return;
    const style = document.createElement('style');
    style.id = 'hero-showcase-style';
    style.textContent = `
      .hero{
        display:grid!important;
        grid-template-columns:minmax(0,1.08fr) minmax(430px,.92fr)!important;
        min-height:620px!important;
        background:#fff!important;
      }
      .hero::before{display:none!important;background-image:none!important}
      .hero-content{
        width:auto!important;
        max-width:none!important;
        min-height:620px!important;
        padding:52px 44px!important;
        background:#fff!important;
      }
      .hero-showcase{
        position:relative;
        z-index:4;
        min-width:0;
        display:flex;
        flex-direction:column;
        justify-content:center;
        gap:16px;
        padding:30px 48px 28px 10px;
        background:linear-gradient(145deg,#fff 0%,#f5f5f5 100%);
      }
      .hero-shoe-wrap{
        min-height:330px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:visible;
      }
      .hero-shoe{
        display:block;
        width:100%;
        max-width:610px;
        height:auto;
        max-height:390px;
        object-fit:contain;
        image-rendering:auto;
        transform:translateZ(0);
        filter:drop-shadow(0 20px 22px rgba(0,0,0,.18));
      }
      .hero-sales{
        position:relative;
        width:100%;
        padding:17px 18px 18px;
        color:#111;
        background:rgba(255,255,255,.98);
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
        .hero{grid-template-columns:1fr!important;min-height:0!important}
        .hero-content{min-height:530px!important;padding:46px 34px!important}
        .hero-showcase{padding:30px 42px 38px!important}
        .hero-shoe-wrap{min-height:300px}
        .hero-shoe{max-width:680px;max-height:none}
      }
      @media(max-width:560px){
        .hero{min-height:0!important}
        .hero-content{min-height:0!important;padding:36px 22px 34px!important;background:#fff!important}
        .hero-showcase{padding:8px 18px 30px!important;gap:10px}
        .hero-shoe-wrap{min-height:220px}
        .hero-shoe{width:112%;max-width:none;filter:drop-shadow(0 13px 14px rgba(0,0,0,.16))}
        .hero-sales{padding:15px 15px 16px;box-shadow:5px 5px 0 #111}
        .hero-sales-title{font-size:21px}
        .hero-sales-text{font-size:11px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function installShowcase(imageUrl) {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    hero.querySelectorAll('.hero-sales,.hero-showcase').forEach(node => node.remove());
    addStyles();

    const showcase = document.createElement('section');
    showcase.className = 'hero-showcase';
    showcase.setAttribute('aria-label', 'Featured product');
    showcase.innerHTML = `
      <div class="hero-shoe-wrap">
        <img class="hero-shoe" decoding="async" fetchpriority="high" alt="" />
      </div>
      <aside class="hero-sales">
        <div class="hero-sales-top">
          <span class="hero-sales-badge"></span>
          <strong class="hero-sales-title"></strong>
        </div>
        <div class="hero-sales-points"></div>
        <p class="hero-sales-text"></p>
        <a class="hero-sales-button" href="https://wa.me/8613159065939?text=Hello%2C%20I%20want%20the%20latest%20price%20and%20shipping%20quote%20for%20the%20black%20AJ4." target="_blank" rel="noopener noreferrer"></a>
      </aside>
    `;

    hero.appendChild(showcase);
    const image = showcase.querySelector('.hero-shoe');
    image.src = imageUrl;

    const applyCopy = () => {
      const t = copy[currentLanguage()];
      showcase.querySelector('.hero-sales-badge').textContent = t.badge;
      showcase.querySelector('.hero-sales-title').textContent = t.title;
      showcase.querySelector('.hero-sales-points').innerHTML = t.points.map(item => `<span>${item}</span>`).join('');
      showcase.querySelector('.hero-sales-text').textContent = t.text;
      showcase.querySelector('.hero-sales-button').textContent = t.button;
      image.alt = t.alt;
    };

    applyCopy();
    new MutationObserver(applyCopy).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });

    const sneakerCard = document.querySelector('.dept.sneakers');
    if (sneakerCard) sneakerCard.style.setProperty('--image', `url("${imageUrl}")`);
  }

  Promise.all(IMAGE_PARTS.map(async url => {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return response.text();
  }))
    .then(values => {
      const base64 = values.join('').replace(/\s+/g, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const imageUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      installShowcase(imageUrl);
      document.documentElement.classList.add('hero-image-ready');
    })
    .catch(error => {
      console.error('Homepage high-resolution AJ4 image failed to load', error);
    });
})();
