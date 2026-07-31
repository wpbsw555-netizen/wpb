(() => {
  if (document.body.dataset.department !== 'accessories') return;

  const assetRoot = /\/accessories\/(?:index\.html)?$/.test(location.pathname)
    ? '../assets/'
    : './assets/';

  function patchDamagedThumbnail() {
    const link = document.querySelector('a[href*="categoryen_70206.html"]');
    const image = link?.querySelector('img');
    if (!image || image.dataset.sockFallback === '1') return;

    image.dataset.sockFallback = '1';
    image.onerror = null;
    image.style.display = 'block';
    image.src = `${assetRoot}catalog/accessories/380.jpg`;
  }

  patchDamagedThumbnail();
  const grid = document.querySelector('#productGrid');
  if (grid) new MutationObserver(patchDamagedThumbnail).observe(grid, { childList: true, subtree: true });
})();
