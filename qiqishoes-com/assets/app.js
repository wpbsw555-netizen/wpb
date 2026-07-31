const WHATSAPP = '8613159065939';
const sourceDomains = {
  fashion: 'https://qiqiyg.com',
  accessories: 'https://acc.qiqiyg.com',
  bags: 'https://bags.qiqiyg.com',
  shoes: 'https://shoes.qiqiyg.com'
};

const item = (id, zh, en, count, tags, group = 'category') => ({ id, zh, en, es: en, count, tags, group });

const fashionCategories = [
  item('3', '2026 新款 0724', '2026 New 0724', '91,693', 'new'),
  item('1580', '款式分类 0724', 'By Style 0724', '708,851', 'style'),
  item('11', 'T恤 0724', 'T Shirt 0724', '345,718', 'shirt'),
  item('139496', '高版本 0717', 'High Quality 0717', '112,300', 'quality'),
  item('10', '短翻领 Polo 0724', 'Polo Short 0724', '51,163', 'polo'),
  item('394', '外套夹克 0724', 'Jacket 0724', '84,127', 'jacket'),
  item('87630', '羽绒服 0720', 'Down Jacket 0720', '32,826', 'jacket quality'),
  item('58658', '泳装 0613', 'Bikini 0613', '14,216', 'bikini'),
  item('155306', '时装 0714', 'Fashion Dress 0714', '6,249', 'dress'),
  item('41628', 'Lululemon ALO 瑜伽服 0714', 'Lululemon ALO 0714', '41,981', 'style quality')
];

const fashionBrands = [
  ['1595','Louis Vuitton','1'],['1602','Gucci','0'],['65045','AF HOC','903'],['1618','Adidas NIKE Jordan','6,302'],
  ['1619','AAPE BAPE','0'],['61968','Amiri','0'],['1616','Armani','0'],['1615','Balenciaga','0'],
  ['1614','Balmain','0'],['1611','Burberry','0'],['1610','Chanel','0'],['1609','Chrome Hearts','0'],
  ['1607','DG','0'],['1606','Dior','0'],['1605','DSQ','0'],['19629','Fear Of God','0'],
  ['1604','Fendi','0'],['40865','Gallery Dept','0'],['1603','Givenchy','0'],['1600','Juicy','778'],
  ['67580','Lacoste','317'],['68696','Ralph Lauren','6,728'],['1593','Moncler','0'],['1592','Moschino','0'],
  ['1591','Off White','0'],['1590','Palm Angels','0'],['1589','Philipp Plein','0'],['1587','Prada','0'],
  ['40773','REPRESENT','0'],['49906','RHUDE','0'],['1586','Stone Island','0'],['1585','Supreme','0'],
  ['1584','Tommy','0'],['45005','Trapstar','0'],['1583','Valentino','0'],['1582','Versace','0'],
  ['1581','YSL','0'],['1612','BOSS','0'],['1608','CK','0'],['1601','Hermes','0'],
  ['1599','Kenzo','0'],['9879','热销更新','Hotsale updating','6,271']
].map((row) => row.length === 3
  ? item(row[0], row[1], row[1], row[2], 'brand', 'brand')
  : item(row[0], row[1], row[2], row[3], 'brand', 'brand'));

const accessories = [
  item('16511','新品 0731','New Arrival 0731','52,464','new'),
  item('43569','首饰 0707','Jewelry 0707','294,544','jewelry brand'),
  item('392','眼镜 0629','Glasses 0629','78,207','glasses brand'),
  item('391','平光眼镜 0728','Plain Glasses 0728','5,422','glasses'),
  item('28251','眼镜工厂 0728','Glasses Factory 0728','31,709','glasses quality'),
  item('393','腰带 0724','Belts 0724','54,742','belt brand'),
  item('383','手表 0721','Watches 0721','125,046','watch brand'),
  item('385','帽子 0730','Caps 0730','45,956','hat'),
  item('384','渔夫帽 0730','Bucket Hat 0730','6,615','hat'),
  item('168165','26 帽子 0730','26 Hat 0730','2,978','hat'),
  item('386','更多帽子 0730','More Caps Hats 0730','18,148','hat'),
  item('263724','香水 0727','Perfume 0727','12,325','perfume brand'),
  item('380','袜子 0725','Sock 0725','11,262','sock'),
  item('70206','袜子系列 0725','Socks 0725','8,232','sock'),
  item('390','围巾 0728','Scarf F1st 0728','45,856','scarf')
];

const bags = [
  item('29314','新品包包','New Arrival','5,298','new','category'),
  item('38931','2026 LV 原版','2026 LV Original','55,647','lv brand','brand'),
  item('6279','2026 LV 1:1','2026 LV 1:1','62,048','lv brand','brand'),
  item('41554','2026 Gucci 原版','2026 Gucci Original','34,005','gucci brand','brand'),
  item('31206','2026 Gucci 1:1','2026 Gucci 1:1','54,275','gucci brand','brand'),
  item('42002','2026 Chanel 原版','2026 Chanel Original','37,413','chanel brand','brand'),
  item('11064','2026 Burberry','2026 Burberry','15,283','burberry brand','brand'),
  item('11053','2026 Bottega Veneta','2026 Bottega Veneta','27,073','bv brand','brand'),
  item('11082','2025 Balenciaga','2025 Balenciaga','33,063','balenciaga brand','brand'),
  item('2412','2025 Prada','2025 Prada','48,073','prada brand','brand'),
  item('43139','2025 Hermes 原版','2025 Hermes Original','14,215','hermes brand','brand'),
  item('23237','2025 Goyard','2025 Goyard','24,911','goyard brand','brand'),
  item('2408','2026 Fendi','2026 Fendi','29,085','fendi brand','brand'),
  item('11074','2025 CHLOE','2025 CHLOE','4,311','chloe brand','brand'),
  item('102526','2025 Loro Piana','2025 Loro Piana','4,495','loro brand','brand'),
  item('39326','Stella McCartney','Stella McCartney','1,099','stella brand','brand')
];

const shoes = [
  item('355','新品鞋子','NEW ARRIVAL','26,916','new','category'),
  item('65136','鞋子工厂 B','Factory B','151,607','factory','category'),
  item('367','鞋子工厂 C','Factory C','183,771','factory','category'),
  item('336','Gucci 鞋子','Gucci','50,170','gucci brand','brand'),
  item('327','Louis Vuitton 鞋子','Louis Vuitton','64,033','lv brand','brand'),
  item('347','Alexander McQueen','Alexander McQueen','5,524','mcqueen brand','brand'),
  item('350','Armani 鞋子','Armani','6,602','armani brand','brand'),
  item('234','BOSS 鞋子','BOSS','9,594','boss brand','brand'),
  item('224','Burberry 鞋子','Burberry','10,329','burberry brand','brand'),
  item('229','Chanel 鞋子','Chanel','17,265','chanel brand','brand'),
  item('151','Dior 鞋子','Dior','10,283','dior brand','brand'),
  item('104','Hermes 鞋子','Hermes','15,571','hermes brand','brand'),
  item('140','Christian Louboutin','Christian Louboutin','8,142','louboutin brand','brand'),
  item('52','Tods 鞋子','Tods','6,391','tods brand','brand'),
  item('132','Givenchy 鞋子','Givenchy','9,035','givenchy brand','brand'),
  item('142649','Brunello Cucinelli','Brunello Cucinelli','4,134','cucinelli brand','brand')
];

const CATALOGS = {
  fashion: {
    brandCn:'服饰', brandEn:'FASHION', title:{zh:'服饰目录',en:'Fashion Catalog',es:'Fashion Catalog'},
    nav:[['','家','Home'],['new','新产品','New Products'],['style','款式','Styles'],['shirt','T恤','T-Shirts'],['quality','高质量','High Quality'],['brand','品牌目录','Brands'],['bikini','泳装','Bikini']],
    products:[...fashionCategories,...fashionBrands]
  },
  accessories: {
    brandCn:'附件', brandEn:'ACCESSORIES', title:{zh:'附件目录',en:'Accessories Catalog',es:'Accessories Catalog'},
    nav:[['','家','Home'],['new','新产品','New Products'],['jewelry','首饰','Jewelry'],['watch','手表','Watches'],['hat','帽子','Hats'],['belt','腰带','Belts'],['glasses','眼镜','Glasses']],
    products:accessories
  },
  bags: {
    brandCn:'包包', brandEn:'BAGS', title:{zh:'包包目录',en:'Bags Catalog',es:'Bags Catalog'},
    nav:[['','家','Home'],['new','新产品','New Products'],['lv','LV','LV'],['gucci','Gucci','Gucci'],['chanel','Chanel','Chanel'],['hermes','Hermes','Hermes'],['brand','品牌目录','Brands']],
    products:bags
  },
  shoes: {
    brandCn:'鞋子', brandEn:'SHOES', title:{zh:'鞋子目录',en:'Shoes Catalog',es:'Shoes Catalog'},
    nav:[['','家','Home'],['new','新产品','New Products'],['factory','工厂分类','Factories'],['gucci','Gucci','Gucci'],['lv','LV','LV'],['chanel','Chanel','Chanel'],['brand','品牌目录','Brands']],
    products:shoes
  }
};

const UI = {
  zh:{home:'家',back:'←返回上一关',guide:'如何订购',guideSmall:'查看订购指南',all:'全部',description:'描述',placeholder:'ID/描述',search:'搜索',empty:'没有找到匹配的目录',wa:'在 WhatsApp 上聊天',unit:'种产品',category:'分类目录',brand:'品牌目录',footer:'QIQI SHOES 商品目录 · WhatsApp：+86 13159065939'},
  en:{home:'Home',back:'← Back',guide:'How to Order',guideSmall:'View ordering guide',all:'All',description:'Description',placeholder:'ID / Description',search:'Search',empty:'No matching catalog entries found',wa:'Chat on WhatsApp',unit:'products',category:'Category',brand:'Brand Directory',footer:'QIQI SHOES Catalog · WhatsApp: +86 13159065939'},
  es:{home:'Inicio',back:'← Volver',guide:'Cómo pedir',guideSmall:'Ver guía',all:'Todos',description:'Descripción',placeholder:'ID / Descripción',search:'Buscar',empty:'No se encontraron categorías',wa:'Chat en WhatsApp',unit:'productos',category:'Categorías',brand:'Directorio de marcas',footer:'Catálogo QIQI SHOES · WhatsApp: +86 13159065939'}
};

const department = document.body.dataset.department || 'fashion';
const catalog = CATALOGS[department] || CATALOGS.fashion;
const departmentPage = /\/(fashion|accessories|bags|shoes)\/(?:index\.html)?$/.test(location.pathname);
const assetRoot = departmentPage ? '../assets/' : './assets/';
let lang = 'zh';
let activeFilter = '';
const grid = document.querySelector('#productGrid');
const empty = document.querySelector('#noResults');
grid.classList.remove('product-grid');
grid.classList.add('catalog-groups');

function landingUrl(product) {
  return `${sourceDomains[department]}/categoryen_${product.id}.html?path=0_${product.id}`;
}

function imageCandidates(product) {
  const remoteRoot = `https://qiqiygsheet.com/catalog/${department}/${product.id}`;
  return [
    `${assetRoot}catalog/${department}/${product.id}.jpg`,
    `${remoteRoot}.jpg`, `${remoteRoot}.png`, `${remoteRoot}.jpeg`, `${remoteRoot}.webp`
  ];
}

function armImage(img) {
  const candidates = JSON.parse(img.dataset.candidates);
  let index = 0;
  const next = () => {
    if (index >= candidates.length) {
      img.style.display = 'none';
      return;
    }
    img.src = candidates[index++];
  };
  img.onerror = next;
  next();
}

function productCard(product) {
  const name = product[lang];
  const href = landingUrl(product);
  return `<article class="product">
    <a class="image-box" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${name}">
      <div class="image-fallback">${name}</div>
      <img alt="${name}" loading="lazy" data-candidates='${JSON.stringify(imageCandidates(product))}'>
    </a>
    <a class="product-title" href="${href}" target="_blank" rel="noopener noreferrer">${name}</a>
    <div class="product-count">(${product.count} ${UI[lang].unit})</div>
  </article>`;
}

function render(list = catalog.products) {
  const groups = ['category','brand'].filter((group) => list.some((product) => product.group === group));
  grid.innerHTML = groups.map((group) => {
    const entries = list.filter((product) => product.group === group);
    return `<section class="catalog-group">
      <h2 class="catalog-group-title">${UI[lang][group]}</h2>
      <div class="product-grid">${entries.map(productCard).join('')}</div>
    </section>`;
  }).join('');
  empty.style.display = list.length ? 'none' : 'block';
  grid.querySelectorAll('img[data-candidates]').forEach(armImage);
}

function renderNav() {
  const nav = document.querySelector('#categoryNav');
  nav.innerHTML = catalog.nav.map((entry, index) => `<button type="button" class="${(index === 0 && !activeFilter) || entry[0] === activeFilter ? 'active' : ''}" data-filter="${entry[0]}">${lang === 'zh' ? entry[1] : entry[2]}</button>`).join('');
  nav.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelector('#searchInput').value = '';
    renderNav();
    filterProducts();
  }));
}

function filterProducts() {
  const query = document.querySelector('#searchInput').value.trim().toLowerCase();
  const type = document.querySelector('#searchType').value;
  const list = catalog.products.filter((product) => {
    const filterOk = !activeFilter || product.tags.includes(activeFilter) || product.group === activeFilter;
    if (!filterOk) return false;
    if (!query) return true;
    if (type === 'id') return product.id.toLowerCase().includes(query);
    if (type === 'name') return `${product.zh} ${product.en}`.toLowerCase().includes(query);
    return `${product.id} ${product.zh} ${product.en} ${product.tags}`.toLowerCase().includes(query);
  });
  render(list);
}

function applyLanguage(next) {
  lang = next;
  const text = UI[lang];
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  document.querySelector('#brandCn').textContent = catalog.brandCn;
  document.querySelector('#brandEn').textContent = catalog.brandEn;
  document.querySelector('#sectionTitle').textContent = catalog.title[lang];
  document.querySelector('#breadcrumb').textContent = text.home;
  document.querySelector('#backBtn').textContent = text.back;
  document.querySelector('#guideTitle').textContent = text.guide;
  document.querySelector('#guideSmall').textContent = text.guideSmall;
  document.querySelector('#searchType').options[0].text = text.all;
  document.querySelector('#searchType').options[2].text = text.description;
  document.querySelector('#searchInput').placeholder = text.placeholder;
  document.querySelector('#searchBtn').textContent = text.search;
  empty.textContent = text.empty;
  document.querySelector('#waText').textContent = text.wa;
  document.querySelector('#footerText').textContent = text.footer;
  document.querySelectorAll('[data-lang]').forEach((button) => button.classList.toggle('active', button.dataset.lang === lang));
  renderNav();
  filterProducts();
}

document.querySelector('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); filterProducts(); });
document.querySelector('#searchInput').addEventListener('input', filterProducts);
document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
document.querySelectorAll('.portal-tab').forEach((link) => link.classList.toggle('active', link.dataset.department === department));
applyLanguage('zh');
