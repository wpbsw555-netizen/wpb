(() => {
  const list = document.querySelector('#categoryList');
  if (!list) return;

  function isZeroCount(text) {
    return /^0(?:\D|$)/.test(String(text || '').trim());
  }

  function removeEmptyCategories() {
    list.querySelectorAll('.category-chip').forEach((button) => {
      const image = button.querySelector('.category-thumb img');
      const hasEmptyThumb = Boolean(button.querySelector('.category-thumb-empty'));
      const countText = button.querySelector('.category-copy small')?.textContent || '';
      const shouldRemove = button.classList.contains('pending') || hasEmptyThumb || isZeroCount(countText) || !image;

      if (shouldRemove) {
        button.remove();
        return;
      }

      if (image.dataset.emptyCategoryGuard !== '1') {
        image.dataset.emptyCategoryGuard = '1';
        image.addEventListener('error', () => button.remove(), { once: true });
      }

      if (image.complete && image.naturalWidth === 0) button.remove();
    });

    if (!list.querySelector('.category-chip.active')) {
      const first = list.querySelector('.category-chip');
      if (first) first.click();
    }
  }

  new MutationObserver(removeEmptyCategories).observe(list, { childList: true, subtree: true });
  removeEmptyCategories();
})();
