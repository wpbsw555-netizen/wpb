(() => {
  const department = document.body.dataset.department || 'fashion';
  const sourceDomains = {
    fashion: 'https://www.tangma2088.com',
    accessories: 'https://acc.tangma2088.com',
    bags: 'https://bags.tangma2088.com',
    shoes: 'https://shoes.tangma2088.com'
  };
  const domain = sourceDomains[department] || sourceDomains.fashion;
  const STORAGE_KEY = 'qiqi-catalog-language';
  const SUPPORTED_LANGUAGES = new Set(['zh', 'en', 'es']);
  const PORTAL_LABELS = {
    zh: ['网球鞋链接', '时尚链接', '附件链接', '包包链接', '鞋子链接'],
    en: ['Tennis Shoes', 'Fashion', 'Accessories', 'Bags', 'Shoes'],
    es: ['Tenis', 'Moda', 'Accesorios', 'Bolsos', 'Zapatos']
  };
  const LANGUAGE_LABELS = {
    zh: { zh: '中文', en: '英语', es: '西班牙语' },
    en: { zh: 'Chinese', en: 'English', es: 'Spanish' },
    es: { zh: 'Chino', en: 'Inglés', es: 'Español' }
  };

  function currentLanguage() {
    const value = (document.documentElement.lang || 'zh').toLowerCase();
    if (value.startsWith('en')) return 'en';
    if (value.startsWith('es')) return 'es';
    return 'zh';
  }

  function savedLanguage() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED_LANGUAGES.has(value) ? value : null;
    } catch {
      return null;
    }
  }

  function saveLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable in privacy modes; language switching still works.
    }
  }

  function forceSamePageSneakerNavigation() {
    document.querySelectorAll('.portal-tabs .portal-tab[href*="tennis-shoes"]').forEach((link) => {
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.target = '_self';

      if (link.dataset.samePageReady === '1') return;
      link.dataset.samePageReady = '1';
      link.addEventListener('click', (event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.location.href = link.href;
      });
    });
  }

  function applyHeaderLanguage(language = currentLanguage()) {
    const portalLabels = PORTAL_LABELS[language] || PORTAL_LABELS.zh;
    document.querySelectorAll('.portal-tabs .portal-tab').forEach((link, index) => {
      if (portalLabels[index]) link.textContent = portalLabels[index];
    });
    forceSamePageSneakerNavigation();

    const languageLabels = LANGUAGE_LABELS[language] || LANGUAGE_LABELS.zh;
    document.querySelectorAll('.langs [data-lang]').forEach((button) => {
      const key = button.dataset.lang;
      if (languageLabels[key]) button.textContent = languageLabels[key];
    });
  }

  function restoreSavedLanguage() {
    const saved = savedLanguage();
    if (!saved || saved === currentLanguage()) {
      applyHeaderLanguage(currentLanguage());
      return;
    }
    const button = document.querySelector(`.langs [data-lang="${saved}"]`);
    if (button) button.click();
  }

  document.querySelectorAll('.langs [data-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      const language = button.dataset.lang;
      if (!SUPPORTED_LANGUAGES.has(language)) return;
      saveLanguage(language);
      queueMicrotask(() => applyHeaderLanguage(language));
    });
  });

  new MutationObserver(() => {
    const language = currentLanguage();
    applyHeaderLanguage(language);
    const saved = savedLanguage();
    if (saved && saved !== language) {
      const button = document.querySelector(`.langs [data-lang="${saved}"]`);
      if (button) queueMicrotask(() => button.click());
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  function rewriteOriginalLandingPages() {
    document.querySelectorAll('#productGrid a[href*="categoryen_"]').forEach((link) => {
      const match = link.href.match(/categoryen_(\d+)\.html/i);
      if (!match) return;
      const categoryId = match[1];
      link.href = `${domain}/categoryen_${categoryId}.html?path=0_${categoryId}`;
    });
  }

  function patchDamagedThumbnail() {
    if (department !== 'accessories') return;
    const link = document.querySelector('a[href*="categoryen_70206.html"]');
    const image = link?.querySelector('img');
    if (!image || image.dataset.sockFallback === '1') return;

    const assetRoot = /\/accessories\/(?:index\.html)?$/.test(location.pathname)
      ? '../assets/'
      : './assets/';
    image.dataset.sockFallback = '1';
    image.onerror = null;
    image.style.display = 'block';
    image.src = `${assetRoot}catalog/accessories/380.jpg`;
  }

  function enableOrderGuideLink() {
    const card = document.querySelector('.order-guide');
    if (!card || card.dataset.guideLinkReady === '1') return;

    const rootMatch = location.pathname.match(/^(.*\/qiqishoes-com\/)/);
    const guideUrl = rootMatch
      ? `${location.origin}${rootMatch[1]}order-guide/`
      : new URL('../order-guide/', location.href).href;

    const openGuide = () => {
      location.href = guideUrl;
    };

    card.dataset.guideLinkReady = '1';
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.style.cursor = 'pointer';
    card.style.textDecoration = 'none';
    card.addEventListener('click', openGuide);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openGuide();
      }
    });
  }

  function patchCatalog() {
    rewriteOriginalLandingPages();
    patchDamagedThumbnail();
    forceSamePageSneakerNavigation();
  }

  applyHeaderLanguage(currentLanguage());
  setTimeout(restoreSavedLanguage, 0);
  enableOrderGuideLink();
  patchCatalog();
  const grid = document.querySelector('#productGrid');
  if (grid) new MutationObserver(patchCatalog).observe(grid, { childList: true, subtree: true });
})();
