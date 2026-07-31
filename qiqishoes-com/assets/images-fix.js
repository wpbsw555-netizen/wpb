(() => {
  const department = document.body.dataset.department || 'fashion';
  const sourceDomains = {
    fashion: 'https://www.tangma2088.com',
    accessories: 'https://acc.tangma2088.com',
    bags: 'https://bags.tangma2088.com',
    shoes: 'https://shoes.tangma2088.com'
  };
  const domain = sourceDomains[department] || sourceDomains.fashion;

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

  function patchCatalog() {
    rewriteOriginalLandingPages();
    patchDamagedThumbnail();
  }

  patchCatalog();
  const grid = document.querySelector('#productGrid');
  if (grid) new MutationObserver(patchCatalog).observe(grid, { childList: true, subtree: true });
})();
