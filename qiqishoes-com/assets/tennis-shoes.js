(() => {
  const STORAGE_KEY = 'qiqi-catalog-language';
  const TEXT = {
    zh: {
      slogan: '中国鞋具批发商',
      tabs: ['网球鞋链接', '时尚链接', '附件链接', '包包链接', '鞋子链接'],
      langs: ['中文', '英语', '西班牙语'],
      title: '网球鞋目录',
      intro: '该目录目前没有产品、图片和分类。',
      categories: '产品分类目录 · 已迁移 0 个分类，共 0 个产品',
      searchPh: '搜索产品名称或 ID',
      search: '搜索',
      total: '共 0 个产品',
      empty: '暂无产品',
      prev: '上一页',
      next: '下一页',
      wa: '在 WhatsApp 上聊天',
    },
    en: {
      slogan: 'Chinese Footwear Wholesaler',
      tabs: ['Sneakers', 'Fashion', 'Accessories', 'Bags', 'Shoes'],
      langs: ['Chinese', 'English', 'Spanish'],
      title: 'Sneaker Catalog',
      intro: 'This catalog currently has no products, images, or categories.',
      categories: 'Product Category Directory · 0 categories · 0 products',
      searchPh: 'Search product name or ID',
      search: 'Search',
      total: '0 products',
      empty: 'No products available',
      prev: 'Previous',
      next: 'Next',
      wa: 'Chat on WhatsApp',
    },
    es: {
      slogan: 'Mayorista chino de calzado',
      tabs: ['Zapatillas', 'Moda', 'Accesorios', 'Bolsos', 'Zapatos'],
      langs: ['Chino', 'Inglés', 'Español'],
      title: 'Catálogo de zapatillas',
      intro: 'Este catálogo no tiene productos, imágenes ni categorías.',
      categories: 'Directorio de categorías · 0 categorías · 0 productos',
      searchPh: 'Buscar nombre o ID',
      search: 'Buscar',
      total: '0 productos',
      empty: 'No hay productos disponibles',
      prev: 'Anterior',
      next: 'Siguiente',
      wa: 'Chat por WhatsApp',
    },
  };

  function savedLanguage() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return ['zh', 'en', 'es'].includes(value) ? value : 'zh';
    } catch {
      return 'zh';
    }
  }

  function setLanguage(value) {
    const lang = ['zh', 'en', 'es'].includes(value) ? value : 'zh';
    const t = TEXT[lang];
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;

    document.querySelector('#sneakerSlogan').textContent = t.slogan;
    document.querySelectorAll('[data-tab]').forEach((node, index) => {
      node.textContent = t.tabs[index];
    });
    document.querySelectorAll('[data-lang]').forEach((node, index) => {
      node.textContent = t.langs[index];
      node.classList.toggle('active', node.dataset.lang === lang);
    });

    document.querySelector('#catalogTitle').textContent = t.title;
    document.querySelector('#catalogIntro').textContent = t.intro;
    document.querySelector('#categoryTitle').textContent = t.categories;
    document.querySelector('#categoryList').innerHTML = '';
    document.querySelector('#catalogQuery').placeholder = t.searchPh;
    document.querySelector('#catalogSearchButton').textContent = t.search;
    document.querySelector('#catalogStatus').textContent = t.total;
    document.querySelector('#catalogContent').innerHTML = `<div class="empty-catalog">${t.empty}</div>`;
    document.querySelector('#pager').hidden = true;
    document.querySelector('#prevPage').textContent = t.prev;
    document.querySelector('#nextPage').textContent = t.next;
    document.querySelector('#waLabel').textContent = t.wa;
  }

  document.querySelectorAll('[data-lang]').forEach(button => {
    button.onclick = () => setLanguage(button.dataset.lang);
  });
  document.querySelector('#catalogSearch').onsubmit = event => {
    event.preventDefault();
  };

  setLanguage(savedLanguage());
})();
