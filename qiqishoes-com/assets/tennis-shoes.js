(() => {
  const script = document.currentScript;
  const assetsRoot = new URL('./', script.src);
  const manifestUrl = new URL(`tennis-shoes/catalog.json?v=${Date.now()}`, assetsRoot);
  const STORAGE_KEY = 'qiqi-catalog-language';
  const PAGE_SIZE = 40;

  const TEXT = {
    zh: {
      slogan: '中国鞋具批发商',
      tabs: ['网球鞋链接', '时尚链接', '附件链接', '包包链接', '鞋子链接'],
      langs: ['中文', '英语', '西班牙语'],
      intro: '所有已迁移的分类、目录和产品图片都保存在本网站。点击产品进入本站详情页，再通过 WhatsApp 咨询价格。',
      categories: '产品分类目录',
      searchPh: '搜索产品名称或 ID',
      search: '搜索',
      loading: '正在加载本地产品目录…',
      loadingCategory: '正在加载该分类…',
      total: n => `共 ${n} 个产品`,
      categoryCount: n => `${n} 个产品`,
      empty: '没有找到匹配的产品',
      unavailable: '该分类暂时无法加载，请刷新后重试。',
      prev: '上一页',
      next: '下一页',
      page: (a, b) => `第 ${a} / ${b} 页`,
      wa: '在 WhatsApp 上聊天',
      stats: (a, b) => `已迁移 ${a} 个分类，共 ${b} 个产品`,
    },
    en: {
      slogan: 'Chinese Footwear Wholesaler',
      tabs: ['Sneakers', 'Fashion', 'Accessories', 'Bags', 'Shoes'],
      langs: ['Chinese', 'English', 'Spanish'],
      intro: 'All imported categories, directories and product images are stored on this website. Open a product here, then contact us on WhatsApp for a quote.',
      categories: 'Product Category Directory',
      searchPh: 'Search product name or ID',
      search: 'Search',
      loading: 'Loading local product catalog…',
      loadingCategory: 'Loading this category…',
      total: n => `${n} products`,
      categoryCount: n => `${n} products`,
      empty: 'No matching products found',
      unavailable: 'This category could not be loaded. Please refresh and try again.',
      prev: 'Previous',
      next: 'Next',
      page: (a, b) => `Page ${a} / ${b}`,
      wa: 'Chat on WhatsApp',
      stats: (a, b) => `${a} categories imported · ${b} products`,
    },
    es: {
      slogan: 'Mayorista chino de calzado',
      tabs: ['Zapatillas', 'Moda', 'Accesorios', 'Bolsos', 'Zapatos'],
      langs: ['Chino', 'Inglés', 'Español'],
      intro: 'Todas las categorías, directorios e imágenes importadas están guardadas en este sitio. Abra un producto aquí y contáctenos por WhatsApp para pedir precio.',
      categories: 'Directorio de categorías',
      searchPh: 'Buscar nombre o ID',
      search: 'Buscar',
      loading: 'Cargando catálogo local…',
      loadingCategory: 'Cargando esta categoría…',
      total: n => `${n} productos`,
      categoryCount: n => `${n} productos`,
      empty: 'No se encontraron productos',
      unavailable: 'No se pudo cargar esta categoría. Actualice la página.',
      prev: 'Anterior',
      next: 'Siguiente',
      page: (a, b) => `Página ${a} / ${b}`,
      wa: 'Chat por WhatsApp',
      stats: (a, b) => `${a} categorías importadas · ${b} productos`,
    },
  };

  let lang = 'zh';
  let manifest = { categories: [], defaultCategory: null, importedCategoryCount: 0, totalProducts: 0 };
  let categoryData = { category: {}, products: [] };
  let selectedCategory = new URLSearchParams(location.search).get('category');
  let query = '';
  let page = 1;
  const cache = new Map();

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

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  function assetUrl(path) {
    const url = new URL(`tennis-shoes/${path}`, assetsRoot);
    url.searchParams.set('v', String(Date.now()));
    return url.href;
  }

  function selectedMeta() {
    return manifest.categories.find(item => String(item.id) === String(selectedCategory)) || null;
  }

  function categoryName(meta) {
    return meta?.name || 'Sneaker Catalog';
  }

  function setLanguage(value) {
    lang = ['zh', 'en', 'es'].includes(value) ? value : 'zh';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    const t = TEXT[lang];

    document.querySelector('#sneakerSlogan').textContent = t.slogan;
    document.querySelectorAll('[data-tab]').forEach((node, index) => {
      node.textContent = t.tabs[index];
    });
    document.querySelectorAll('[data-lang]').forEach((node, index) => {
      node.textContent = t.langs[index];
      node.classList.toggle('active', node.dataset.lang === lang);
    });
    document.querySelector('#catalogTitle').textContent = categoryName(selectedMeta());
    document.querySelector('#catalogIntro').textContent = t.intro;
    document.querySelector('#categoryTitle').textContent = `${t.categories} · ${t.stats(manifest.importedCategoryCount || 0, manifest.totalProducts || 0)}`;
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
    const t = TEXT[lang];
    list.innerHTML = manifest.categories.map(category => {
      const active = String(category.id) === String(selectedCategory) ? ' active' : '';
      const cover = category.cover
        ? `<span class="category-thumb"><img src="${assetUrl(category.cover)}" alt="" loading="lazy"></span>`
        : '<span class="category-thumb category-thumb-empty">•••</span>';
      return `<button type="button" class="category-chip${active}" data-category="${escapeHtml(category.id)}">${cover}<span class="category-copy"><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(t.categoryCount(Number(category.count || 0)))}</small></span></button>`;
    }).join('');

    list.querySelectorAll('[data-category]').forEach(button => {
      button.onclick = async () => {
        selectedCategory = button.dataset.category;
        query = '';
        page = 1;
        document.querySelector('#catalogQuery').value = '';
        history.replaceState(null, '', `?category=${encodeURIComponent(selectedCategory)}`);
        renderCategories();
        await loadCategory(selectedCategory);
      };
    });
  }

  function currentProducts() {
    const products = Array.isArray(categoryData.products) ? categoryData.products : [];
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(item => `${item.id} ${item.title}`.toLowerCase().includes(q));
  }

  function renderProducts() {
    const t = TEXT[lang];
    const meta = selectedMeta();
    document.querySelector('#catalogTitle').textContent = categoryName(meta);

    if (!meta || !meta.imported) {
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
    const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    content.innerHTML = `<section class="sneaker-grid">${visible.map(item => {
      const detail = `product.html?category=${encodeURIComponent(selectedCategory)}&id=${encodeURIComponent(item.id)}`;
      return `<article class="sneaker-card"><a class="sneaker-image" href="${detail}"><span class="sneaker-image-fallback">${escapeHtml(item.title)}</span><img src="${assetUrl(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy"></a><a class="sneaker-name" href="${detail}">${escapeHtml(item.title)}</a><div class="sneaker-id">ID: ${escapeHtml(item.id)}</div></article>`;
    }).join('')}</section>`;

    pager.hidden = false;
    document.querySelector('#pageInfo').textContent = t.page(page, pages);
    document.querySelector('#prevPage').disabled = page <= 1;
    document.querySelector('#nextPage').disabled = page >= pages;
  }

  async function loadCategory(categoryId) {
    const meta = manifest.categories.find(item => String(item.id) === String(categoryId));
    if (!meta?.data) {
      categoryData = { category: meta || {}, products: [] };
      renderProducts();
      return;
    }

    if (cache.has(categoryId)) {
      categoryData = cache.get(categoryId);
      renderProducts();
      return;
    }

    status.textContent = TEXT[lang].loadingCategory;
    content.innerHTML = `<div class="empty-catalog">${TEXT[lang].loadingCategory}</div>`;
    pager.hidden = true;

    try {
      const response = await fetch(assetUrl(meta.data), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      categoryData = await response.json();
      if (!Array.isArray(categoryData.products)) categoryData.products = [];
      cache.set(categoryId, categoryData);
    } catch (error) {
      console.error(error);
      categoryData = { category: meta, products: [] };
    }
    renderProducts();
  }

  async function init() {
    lang = savedLanguage();
    status.textContent = TEXT[lang].loading;

    try {
      const response = await fetch(manifestUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      manifest = await response.json();
      if (!Array.isArray(manifest.categories)) manifest.categories = [];
    } catch (error) {
      console.error(error);
      manifest = { categories: [], defaultCategory: null, importedCategoryCount: 0, totalProducts: 0 };
    }

    if (!selectedCategory || !manifest.categories.some(item => String(item.id) === String(selectedCategory))) {
      selectedCategory = manifest.defaultCategory || manifest.categories[0]?.id || null;
    }

    setLanguage(lang);
    if (selectedCategory) await loadCategory(selectedCategory);
  }

  document.querySelectorAll('[data-lang]').forEach(button => {
    button.onclick = () => setLanguage(button.dataset.lang);
  });
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
  document.querySelector('#prevPage').onclick = () => {
    if (page > 1) {
      page -= 1;
      renderProducts();
      scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  document.querySelector('#nextPage').onclick = () => {
    page += 1;
    renderProducts();
    scrollTo({ top: 0, behavior: 'smooth' });
  };

  init();
})();
