const WHATSAPP='8613159065939';
const products=[
{id:'0721',zh:'春夏童装 0721',en:'Spring Kids Set 0721',es:'Conjunto infantil 0721',count:'81,319',img:'https://qiqiygsheet.com/catalog/fashion/3.png'},
{id:'0724',zh:'T恤 0724',en:'T-Shirt 0724',es:'Camiseta 0724',count:'345,716',img:'https://qiqiygsheet.com/catalog/fashion/11.jpg'},
{id:'0724-P',zh:'Polo 短裤 0724',en:'Polo Shorts 0724',es:'Polo y shorts 0724',count:'51,162',img:'https://qiqiygsheet.com/catalog/fashion/10.jpg'},
{id:'0724-L',zh:'长款T恤 0724',en:'Long Sleeve T-Shirt 0724',es:'Camiseta manga larga 0724',count:'34,048',img:'https://qiqiygsheet.com/catalog/fashion/139496.jpg'},
{id:'0720-D',zh:'羽绒服 0720',en:'Down Jacket 0720',es:'Chaqueta de plumas 0720',count:'32,826',img:'https://qiqiygsheet.com/catalog/fashion/87630.jpeg'},
{id:'0601',zh:'运动球衣 0601',en:'Sports Jersey 0601',es:'Camiseta deportiva 0601',count:'204',img:'https://qiqiygsheet.com/catalog/fashion/58658.jpg'},
{id:'0723-2',zh:'两件套短裤 0723',en:'Two-Piece Shorts 0723',es:'Conjunto de shorts 0723',count:'81,665',img:'https://qiqiygsheet.com/catalog/fashion/1580.jpg'},
{id:'0720-S',zh:'衬衫短裤 0720',en:'Shirt & Shorts 0720',es:'Camisa y shorts 0720',count:'13,312',img:'https://qiqiygsheet.com/catalog/fashion/394.jpg'},
{id:'0723-J',zh:'防晒夹克 0723',en:'Sun Protection Jacket 0723',es:'Chaqueta solar 0723',count:'2,803',img:'https://qiqiygsheet.com/catalog/fashion/3.png'},
{id:'0724-S',zh:'短裤 0724',en:'Shorts 0724',es:'Shorts 0724',count:'28,480',img:'https://qiqiygsheet.com/catalog/fashion/10.jpg'},
{id:'0724-B',zh:'印花短裤 0724',en:'Printed Shorts 0724',es:'Shorts estampados 0724',count:'19,610',img:'https://qiqiygsheet.com/catalog/fashion/1580.jpg'},
{id:'0723-W',zh:'运动套装 0723',en:'Sports Set 0723',es:'Conjunto deportivo 0723',count:'37,502',img:'https://qiqiygsheet.com/catalog/fashion/11.jpg'},
{id:'0723-H',zh:'连帽套装 0723',en:'Hooded Set 0723',es:'Conjunto con capucha 0723',count:'22,391',img:'https://qiqiygsheet.com/catalog/fashion/394.jpg'},
{id:'0722-D',zh:'牛仔短裤 0722',en:'Denim Shorts 0722',es:'Shorts de mezclilla 0722',count:'16,208',img:'https://qiqiygsheet.com/catalog/fashion/139496.jpg'},
{id:'0721-C',zh:'休闲短裤 0721',en:'Casual Shorts 0721',es:'Shorts casuales 0721',count:'26,834',img:'https://qiqiygsheet.com/catalog/fashion/87630.jpeg'}
];
const copy={
zh:{title:'款式 0724',home:'家',back:'←返回上一关',guide:'如何订购',guideSmall:'查看订购指南',all:'全部',placeholder:'ID/描述',search:'搜索',empty:'没有找到匹配的商品',wa:'在 WhatsApp 上聊天',footer:'QIQI SHOES 商品目录 · WhatsApp：+86 13159065939'},
en:{title:'Styles 0724',home:'Home',back:'← Back',guide:'How to Order',guideSmall:'View ordering guide',all:'All',placeholder:'ID / Description',search:'Search',empty:'No matching products found',wa:'Chat on WhatsApp',footer:'QIQI SHOES Catalog · WhatsApp: +86 13159065939'},
es:{title:'Estilos 0724',home:'Inicio',back:'← Volver',guide:'Cómo pedir',guideSmall:'Ver guía de pedido',all:'Todos',placeholder:'ID / Descripción',search:'Buscar',empty:'No se encontraron productos',wa:'Chat en WhatsApp',footer:'Catálogo QIQI SHOES · WhatsApp: +86 13159065939'}
};
let lang='zh';
const grid=document.querySelector('#productGrid');
const empty=document.querySelector('#noResults');
function waLink(p){return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello, I want to ask about ${p.en} (ID: ${p.id})`)}`}
function render(list=products){grid.innerHTML=list.map(p=>`<article class="product" data-id="${p.id}" data-search="${[p.zh,p.en,p.es,p.id].join(' ').toLowerCase()}"><div class="image-box" data-wa="${waLink(p)}"><div class="image-fallback">${p[lang]}</div><img src="${p.img}" alt="${p[lang]}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div><a class="product-title" href="${waLink(p)}" target="_blank" rel="noopener">${p[lang]}</a><div class="product-count">(${p.count} ${lang==='zh'?'种产品':lang==='es'?'productos':'products'})</div></article>`).join('');empty.style.display=list.length?'none':'block';grid.querySelectorAll('.image-box').forEach(el=>el.addEventListener('click',()=>window.open(el.dataset.wa,'_blank','noopener')))}
function applyLanguage(next){lang=next;const t=copy[lang];document.documentElement.lang=lang==='zh'?'zh-CN':lang;document.querySelector('#sectionTitle').textContent=t.title;document.querySelector('#breadcrumb').textContent=t.home;document.querySelector('#backBtn').textContent=t.back;document.querySelector('#guideTitle').textContent=t.guide;document.querySelector('#guideSmall').textContent=t.guideSmall;document.querySelector('#searchType').options[0].text=t.all;document.querySelector('#searchInput').placeholder=t.placeholder;document.querySelector('#searchBtn').textContent=t.search;empty.textContent=t.empty;document.querySelector('#waText').textContent=t.wa;document.querySelector('#footerText').textContent=t.footer;document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));filterProducts()}
function filterProducts(){const q=document.querySelector('#searchInput').value.trim().toLowerCase();const type=document.querySelector('#searchType').value;const list=products.filter(p=>{if(!q)return true;if(type==='id')return p.id.toLowerCase().includes(q);if(type==='name')return `${p.zh} ${p.en} ${p.es}`.toLowerCase().includes(q);return `${p.id} ${p.zh} ${p.en} ${p.es}`.toLowerCase().includes(q)});render(list)}
document.querySelector('#searchForm').addEventListener('submit',e=>{e.preventDefault();filterProducts()});document.querySelector('#searchInput').addEventListener('input',filterProducts);document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>applyLanguage(b.dataset.lang)));document.querySelectorAll('.portal-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.portal-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const q=b.dataset.filter||'';document.querySelector('#searchInput').value=q;filterProducts()}));
render();applyLanguage('zh');