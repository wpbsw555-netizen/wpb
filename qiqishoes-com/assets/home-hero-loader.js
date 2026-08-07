(() => {
  'use strict';
  const script = document.currentScript;
  if (!script) return;
  const IMAGE_URL = new URL('./aj4-black-500.webp?v=202608072340', script.src).href;
  const COPY = {
    zh:{badge:'HOT SELLING',title:'黑色 AJ4',points:['高品质','批发价格','快速发货'],text:'保存产品图片，通过 WhatsApp 获取最新价格与运输报价。',button:'立即询价 / Get Price Now',alt:'黑色 AJ4 鞋款'},
    en:{badge:'HOT SELLING',title:'BLACK AJ4',points:['Top Quality','Wholesale Price','Fast Shipping'],text:'Save the product image and contact us on WhatsApp for the latest price and shipping quote.',button:'Get Price Now',alt:'Black AJ4 sneakers'},
    es:{badge:'MÁS VENDIDO',title:'AJ4 NEGRO',points:['Alta calidad','Precio mayorista','Envío rápido'],text:'Guarde la imagen y consulte por WhatsApp el precio y el envío más recientes.',button:'Consultar precio',alt:'Zapatillas AJ4 negras'}
  };
  const language = () => {
    const v = (document.documentElement.lang || 'zh').toLowerCase();
    return v.startsWith('en') ? 'en' : v.startsWith('es') ? 'es' : 'zh';
  };

  const css = document.createElement('style');
  css.textContent = `
    .hero{display:grid!important;grid-template-columns:41% 59%!important;min-height:650px!important;background:#fff!important;overflow:hidden!important}
    .hero::before{display:none!important;content:none!important;background:none!important}
    .hero-content{grid-column:1!important;width:auto!important;max-width:none!important;min-height:650px!important;padding:52px 28px 46px 42px!important;background:#fff!important;justify-content:center!important}
    .hero h1{font-size:clamp(72px,7vw,112px)!important;line-height:.86!important;margin:24px 0 20px!important}
    .hero p{font-size:16px!important;line-height:1.75!important;margin:25px 0 30px!important}
    .hero-product{grid-column:2;display:flex;flex-direction:column;justify-content:center;padding:18px 48px 28px 8px;background:#fff;min-width:0}
    .hero-shoe-wrap{height:400px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff}
    .hero-shoe{display:block;width:100%;height:100%;object-fit:contain;object-position:center;opacity:1;visibility:visible}
    .hero-sales{margin:8px 0 0 52px;padding:18px;border:2px solid #111;background:#fff;box-shadow:8px 8px 0 #111}
    .hero-sales-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
    .hero-sales-badge{background:var(--acid);padding:10px 14px;font-size:12px;font-weight:900;letter-spacing:2px}
    .hero-sales-title{font-size:29px;font-weight:950}
    .hero-sales-points{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}
    .hero-sales-points span{border:1px solid #111;padding:7px 11px;font-size:12px;font-weight:800}
    .hero-sales-text{margin:0 0 15px!important;font-size:13px!important}
    .hero-sales-button{display:flex;align-items:center;justify-content:center;min-height:52px;background:#20bd63;color:#fff;text-decoration:none;font-size:15px;font-weight:900;border:2px solid #111;box-shadow:4px 4px 0 #111}
    @media(max-width:720px){.hero{display:block!important;min-height:auto!important}.hero-content{min-height:auto!important;padding:36px 22px 30px!important}.hero-product{padding:12px 18px 30px}.hero-shoe-wrap{height:300px}.hero-sales{margin:6px 4px 0}}
  `;
  document.head.appendChild(css);

  const hero = document.querySelector('.hero');
  if (!hero) return;
  hero.querySelectorAll('.hero-product,.hero-showcase,.hero-sales').forEach(n => n.remove());

  const product = document.createElement('section');
  product.className = 'hero-product';
  product.innerHTML = `
    <div class="hero-shoe-wrap"><img class="hero-shoe" src="${IMAGE_URL}" alt="黑色 AJ4 鞋款" width="500" height="314" decoding="async" fetchpriority="high"></div>
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
    product.querySelector('.hero-sales-points').innerHTML = t.points.map(x => `<span>${x}</span>`).join('');
    product.querySelector('.hero-sales-text').textContent = t.text;
    product.querySelector('.hero-sales-button').textContent = t.button;
    image.alt = t.alt;
  };
  applyCopy();
  new MutationObserver(applyCopy).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

  const card = document.querySelector('.dept.sneakers');
  if (card) card.style.setProperty('--image', `url("${IMAGE_URL}")`);
})();
