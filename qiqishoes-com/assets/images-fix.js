(() => {
  const ids = {
    fashion: ['3','11','10','139496','87630','1580','394','3','11','10'],
    accessories: ['43569','43569','43569','383','383','385','384','393','393','392'],
    bags: ['38931','6279','41554','31206','42002','11064','11053','2412','23240','43139'],
    shoes: ['327','336','347','234','140','367','104','151','347','327']
  };
  const department = document.body.dataset.department || 'fashion';
  const categoryIds = ids[department] || ids.fashion;
  const base = `https://qiqiygsheet.com/catalog/${department}/`;
  const extensions = ['jpg', 'png', 'jpeg', 'webp', 'JPG', 'PNG'];
  let patching = false;

  function applyImage(img, categoryId) {
    const sources = extensions.map(ext => `${base}${categoryId}.${ext}`);
    img.style.display = 'block';
    img.dataset.originalSources = sources.join('|');
    img.dataset.originalIndex = '0';
    img.onerror = () => {
      const list = img.dataset.originalSources.split('|');
      const next = Number(img.dataset.originalIndex || 0) + 1;
      if (next < list.length) {
        img.dataset.originalIndex = String(next);
        img.src = list[next];
      } else {
        img.style.display = 'none';
      }
    };
    img.src = sources[0];
  }

  function patchImages() {
    if (patching) return;
    patching = true;
    document.querySelectorAll('#productGrid .product img').forEach((img, index) => {
      applyImage(img, categoryIds[index % categoryIds.length]);
    });
    patching = false;
  }

  const grid = document.querySelector('#productGrid');
  if (!grid) return;
  patchImages();
  new MutationObserver(patchImages).observe(grid, { childList: true });
})();
