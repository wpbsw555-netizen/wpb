(() => {
  const script = document.currentScript;
  const ASSET_BASE = new URL('./tennis-shoes/', script.src);
  const DATA_URL = new URL('catalog.json?v=' + Date.now(), ASSET_BASE).href;
  const STORAGE_KEY = 'qiqi-catalog-language';
  const PAGE_SIZE = 40;
  const TEXT = {
    zh: {
      slogan: '中国鞋具批发商',
      tabs: ['网球鞋链接', '时尚链接', '附件链接', '包包链接', '鞋子链接'],
      langs: ['中文', '英语', '西班牙语'],
      intro: '产品图片已保存到本网站。点击产品可进入本站详情页，再通过 WhatsApp 咨询价格。',
      categories: '产品分类',
      searchPh: '搜索产品名称或 ID',
      search: '搜索',
      loading: '正在加载本地产品目录…',
      total: (n) => `共 ${n} 个产品`,
      unavailable: '该分类正在迁移中，当前先开放 AIR JORDAN 3 分类。',
      empty: '没有找到匹配的产品',
      prev: '上一页',
      next: '下一页',
      page: (a,b) => `第 ${a} / ${b} 页`,
      wa: '在 WhatsApp 上聊天',
    },
    en: {
      slogan: 'Chinese Footwear Wholesaler',
      tabs: ['Sneakers', 'Fashion', 'Accessories', 'Bags', 'Shoes'],
      langs: ['Chinese', 'English', 'Spanish'],
      intro: 'Product images are stored on this website. Open a product on this site, then contact us on WhatsApp for a quote.',
      categories: 'Product Categories',
      searchPh: 'Search product name or ID',
      search: 'Search',
      loading: 'Loading local product catalog…',
      total: (n) => `${n} products`,
      unavailable: 'This category is being migrated. AIR JORDAN 3 is available first.',
      empty: 'No matching products found',
      prev: 'Previous',
      next: 'Next',
      page: (a,b) => `Page ${a} / ${b}`,
      wa: 'Chat on WhatsApp',
    },
    es: {
      slogan: 'Mayorista chino de calzado',
      tabs: ['Zapatillas', 'Moda', 'Accesorios', 'Bolsos', 'Zapatos'],
      langs: ['Chino', 'Inglés', 'Español'],
      intro: 'Las imágenes están guardadas en este sitio. Abra un producto aquí y contáctenos por WhatsApp para pedir precio.',
      categories: 'Categorías de productos',
      searchPh: 'Buscar nombre o ID',
      search: 'Buscar',
      loading: 'Cargando catálogo local…',
      total: (n) => `${n} productos`,
      unavailable: 'Esta categoría se está migrando. AIR JORDAN 3 está disponible primero.',
      empty: 'No se encontraron productos',
      prev: 'Anterior',
      next: 'Siguiente',
      page: (a,b) => `Página ${a} / ${b}`,
      wa: 'Chat por WhatsApp',
    }
  };

  let lang = 'zh';
  let catalog = { categories: [], products: [], title: {} };
  let selectedCategory = '3551883';
  let query = '';
  let page = 1;

  const content = document.querySelector('#catalogContent');
  const status = document.querySelector('#catalogStatus');
  const pager = document.querySelector('#pager');

  function savedLanguage() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return ['zh', 'en', 'es'].includes(value) ? value : 'zh';
    } catch {
      return 'zh';
    }
  }

  function setLanguage(value) {
    lang = ['zh', 'en', 'es'].includes(value) ? value : 'zh';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    const t = TEXT[lang];
    document.querySelector('#sneakerSlogan').textContent = t.slogan;
    document.querySelectorAll('[data-tab]').forEach((node, index) => node.textContent = t.tabs[index]);
    document.querySelectorAll('[data-lang]').forEach((node, index) => {
      node.textContent = t.langs[index];
      node.classList.toggle('active', node.dataset.lang === lang);
    });
    document.querySelector('#catalogTitle').textContent = catalog.title?.[lang] || catalog.title?.en || 'AIR JORDAN 3';
    document.querySelector('#catalogIntro').textContent = t.intro;
    document.querySelector('#categoryTitle').textContent = t.categories;
    document.querySelector('#catalogQuery').placeholder = t.searchPh;
    document.querySelector('#catalogSearchButton').textContent = t.search;
    document.querySelector('#prevPage').textContent = t.prev;
    document.querySelector('#nextPage').textContent = t.next;
    document.querySelector('#waLabel').textContent = t.wa;
    renderCategories();
    renderProducts();
  }

  function renderCategories() {
    const list = document.querySelector('#categoryList');
    list.innerHTML = catalog.categories.map(category => {
      const active = category.id === selectedCategory ? ' active' : '';
      return `<button type="button" class="category-chip${active}" data-category="${category.id}">${escapeHtml(category.name)}</button>`;
    }).join('');
    list.querySelectorAll('[data-category]').forEach(button => {
      button.onclick = () => {
        selectedCategory = button.dataset.category;
        page = 1;
        renderCategories();
        renderProducts();
      };
    });
  }

  function currentProducts() {
    if (selectedCategory !== '3551883') return [];
    const q = query.trim().toLowerCase();
    if (!q) return catalog.products;
    return catalog.products.filter(item => `${item.id} ${item.title}`.toLowerCase().includes(q));
  }

  function imageUrl(item) {
    const url = new URL(item.image, ASSET_BASE);
    url.searchParams.set('v', String(Date.now()));
    return url.href;
  }

  function renderProducts() {
    const t = TEXT[lang];
    if (selectedCategory !== '3551883') {
      status.textContent = t.unavailable;
      content.innerHTML = `<div class="empty-catalog">${t.unavailable}</div>`;
      pager.hidden = true;
      return;
    }
    const items = currentProducts();
    status.textContent = t.total(items.length);
    if (!items.length) {
      content.innerHTML = `<div class="empty-catalog">${t.empty}</div>`;
      pager.hidden = true;
      return;
    }
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(page, pages);
    const start = (page - 1) * PAGE_SIZE;
    const visible = items.slice(start, start + PAGE_SIZE);
    content.innerHTML = `<section class="sneaker-grid">${visible.map(item => {
      const url = `product.html?id=${encodeURIComponent(item.id)}`;
      return `<article class="sneaker-card"><a class="sneaker-image" href="${url}"><span class="sneaker-image-fallback">${escapeHtml(item.title)}</span><img src="${imageUrl(item)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.style.display='none'"></a><a class="sneaker-name" href="${url}">${escapeHtml(item.title)}</a><div class="sneaker-id">ID: ${escapeHtml(item.id)}</div></article>`;
    }).join('')}</section>`;
    pager.hidden = false;
    document.querySelector('#pageInfo').textContent = t.page(page, pages);
    document.querySelector('#prevPage').disabled = page <= 1;
    document.querySelector('#nextPage').disabled = page >= pages;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  async function init() {
    lang = savedLanguage();
    status.textContent = TEXT[lang].loading;
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      catalog = await response.json();
      if (!Array.isArray(catalog.categories)) catalog.categories = [];
      if (!Array.isArray(catalog.products)) catalog.products = [];
      const current = catalog.categories.find(item => item.id === '3551883');
      if (current) {
        current.name = 'AIR JORDAN 3 乔丹3代';
      } else {
        catalog.categories.unshift({ id: '3551883', name: 'AIR JORDAN 3 乔丹3代', imported: true });
      }
    } catch (error) {
      console.error(error);
      catalog = { title: { zh: 'AIR JORDAN 3 乔丹3代', en: 'AIR JORDAN 3', es: 'AIR JORDAN 3' }, categories: [{ id: '3551883', name: 'AIR JORDAN 3 乔丹3代', imported: true }], products: [] };
    }
    setLanguage(lang);
  }

  document.querySelectorAll('[data-lang]').forEach(button => button.onclick = () => setLanguage(button.dataset.lang));
  document.querySelector('#catalogSearch').onsubmit = event => {
    event.preventDefault();
    query = document.querySelector('#catalogQuery').value;
    page = 1;
    renderProducts();
  };
  document.querySelector('#catalogQuery').oninput = event => {
    query = event.target.value;
    page = 1;
    renderProducts();
  };
  document.querySelector('#prevPage').onclick = () => { if (page > 1) { page -= 1; renderProducts(); scrollTo({ top: 0, behavior: 'smooth' }); } };
  document.querySelector('#nextPage').onclick = () => { page += 1; renderProducts(); scrollTo({ top: 0, behavior: 'smooth' }); };
  init();
})();
