(() => {
  const script = document.currentScript;
  if (!script) return;

  const names = [
    'home-hero-aj4-mini.part0a',
    'home-hero-aj4-mini.part0b',
    'home-hero-aj4-mini.part0c',
    'home-hero-aj4-mini.part0d',
    'home-hero-aj4-mini.part1',
    'home-hero-aj4-mini.part2'
  ];

  const cdnBase = 'https://cdn.jsdelivr.net/gh/wpbsw555-netizen/wpb@28bb6dcae30af7529a4bd97d137aed60f10f2a56/scripts/';
  const parts = names.map(name => `${cdnBase}${name}`);

  const copy = {
    zh: {
      badge: 'HOT SELLING',
      title: '黑色 AJ4',
      points: ['高品质', '批发价格', '快速发货'],
      text: '保存产品图片，通过 WhatsApp 获取最新价格与运输报价。',
      button: '立即询价 / Get Price Now'
    },
    en: {
      badge: 'HOT SELLING',
      title: 'BLACK AJ4',
      points: ['Top Quality', 'Wholesale Price', 'Fast Shipping'],
      text: 'Save the product image and contact us on WhatsApp for the latest price and shipping quote.',
      button: 'Get Price Now'
    },
    es: {
      badge: 'MÁS VENDIDO',
      title: 'AJ4 NEGRO',
      points: ['Alta calidad', 'Precio mayorista', 'Envío rápido'],
      text: 'Guarde la imagen y consulte por WhatsApp el precio y el envío más recientes.',
      button: 'Consultar precio'
    }
  };

  function currentLanguage() {
    const value = (document.documentElement.lang || 'zh').toLowerCase();
    if (value.startsWith('en')) return 'en';
    if (value.startsWith('es')) return 'es';
    return 'zh';
  }

  function installSalesPanel() {
    const hero = document.querySelector('.hero');
    if (!hero || hero.querySelector('.hero-sales')) return;

    const style = document.createElement('style');
    style.id = 'hero-sales-style';
    style.textContent = `
      .hero{min-height:610px}
      .hero::before{background-size:55% auto;background-position:right 52px top 44px;filter:contrast(1.03)}
      .hero-content{width:54%;min-height:610px;padding:52px 46px;background:linear-gradient(90deg,#fff 0%,#fff 77%,rgba(255,255,255,.90) 90%,rgba(255,255,255,0) 100%)}
      .hero-sales{position:absolute;z-index:5;right:66px;bottom:34px;width:min(43%,500px);padding:17px 18px 18px;background:rgba(255,255,255,.94);border:2px solid #111;box-shadow:8px 8px 0 #111;color:#111;backdrop-filter:blur(5px)}
      .hero-sales-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .hero-sales-badge{display:inline-flex;background:var(--acid);color:#000;padding:8px 11px;font-size:11px;font-weight:900;letter-spacing:1.6px;transform:rotate(-1deg)}
      .hero-sales-title{font-size:24px;line-height:1;font-weight:950;letter-spacing:-1px;text-transform:uppercase}
      .hero-sales-points{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 11px}
      .hero-sales-points span{padding:6px 9px;border:1px solid #111;background:#fff;font-size:11px;font-weight:800}
      .hero-sales-text{margin:0 0 12px!important;color:#333!important;font-size:12px!important;line-height:1.55!important}
      .hero-sales-button{display:flex;min-height:44px;align-items:center;justify-content:center;background:#20bd63;color:#fff;text-decoration:none;font-size:13px;font-weight:900;border:2px solid #111;box-shadow:4px 4px 0 #111;transition:.18s}
      .hero-sales-button:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #111}
      @media(max-width:980px){
        .hero{min-height:690px}
        .hero::before{background-size:58% auto;background-position:right 28px top 105px}
        .hero-content{width:60%;min-height:690px;padding:44px 32px}
        .hero-sales{right:38px;bottom:30px;width:44%}
      }
      @media(max-width:560px){
        .hero{min-height:900px!important}
        .hero::before{background-size:100% auto!important;background-position:center 408px!important}
        .hero-content{width:100%!important;min-height:900px!important;justify-content:flex-start!important;padding:34px 21px 455px!important;background:linear-gradient(180deg,#fff 0%,#fff 45%,rgba(255,255,255,.96) 53%,rgba(255,255,255,0) 68%)!important}
        .hero-sales{left:20px;right:20px;bottom:22px;width:auto;padding:15px 15px 16px}
        .hero-sales-title{font-size:21px}
        .hero-sales-text{font-size:11px!important}
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('aside');
    panel.className = 'hero-sales';
    panel.setAttribute('aria-label', 'Featured product');
    panel.innerHTML = `
      <div class="hero-sales-top">
        <span class="hero-sales-badge"></span>
        <strong class="hero-sales-title"></strong>
      </div>
      <div class="hero-sales-points"></div>
      <p class="hero-sales-text"></p>
      <a class="hero-sales-button" href="https://wa.me/8613159065939?text=Hello%2C%20I%20want%20the%20latest%20price%20and%20shipping%20quote%20for%20the%20black%20AJ4." target="_blank" rel="noopener noreferrer"></a>
    `;
    hero.appendChild(panel);

    const applyCopy = () => {
      const t = copy[currentLanguage()];
      panel.querySelector('.hero-sales-badge').textContent = t.badge;
      panel.querySelector('.hero-sales-title').textContent = t.title;
      panel.querySelector('.hero-sales-points').innerHTML = t.points.map(item => `<span>${item}</span>`).join('');
      panel.querySelector('.hero-sales-text').textContent = t.text;
      panel.querySelector('.hero-sales-button').textContent = t.button;
    };

    applyCopy();
    new MutationObserver(applyCopy).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  installSalesPanel();

  Promise.all(parts.map(async url => {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return response.text();
  }))
    .then(values => {
      const base64 = values.join('').replace(/\s+/g, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      document.documentElement.style.setProperty('--hero-image', `url("${objectUrl}")`);
      const sneakerCard = document.querySelector('.dept.sneakers');
      if (sneakerCard) sneakerCard.style.setProperty('--image', `url("${objectUrl}")`);
      document.documentElement.classList.add('hero-image-ready');
    })
    .catch(error => {
      console.error('Homepage AJ4 image failed to load', error);
    });
})();
