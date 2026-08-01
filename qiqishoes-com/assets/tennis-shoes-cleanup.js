(() => {
  const list = document.querySelector('#categoryList');
  if (!list) return;

  function isZeroCount(text) {
    return /^0(?:\D|$)/.test(String(text || '').trim());
  }

  function categoryLabel(button) {
    return String(button.querySelector('.category-copy strong')?.textContent || '').trim();
  }

  function jordanNumber(button) {
    const compact = categoryLabel(button).toUpperCase().replace(/\s+/g, '');
    const english = compact.match(/AIRJORDAN(\d+(?:\.\d+)?)/);
    if (english) return Number(english[1]);
    const chinese = compact.match(/乔丹(\d+(?:\.\d+)?)/);
    return chinese ? Number(chinese[1]) : null;
  }

  function categorySortKey(button, originalIndex) {
    const id = String(button.dataset.category || '');
    const label = categoryLabel(button).replace(/\s+/g, '').toUpperCase();

    // The two main categories requested by the customer always come first.
    if (id === '3551881' || label === 'AIRJORDAN1乔丹1代') return [0, 0, originalIndex];
    if (id === '3551883' || label === 'AIRJORDAN3乔丹3代') return [0, 1, originalIndex];

    const number = jordanNumber(button);
    if (number !== null) {
      // Continue with Jordan 3.5, 4, 5, 6... in numerical order.
      // Alternate Jordan 1/2/3 directories remain after the main numbered series.
      const order = number >= 3.5 ? number : 100 + number;
      return [1, order, originalIndex];
    }

    // Non-Jordan categories keep their existing relative order.
    return [2, 0, originalIndex];
  }

  function reorderCategories() {
    const current = Array.from(list.querySelectorAll('.category-chip'));
    const sorted = current
      .map((button, index) => ({ button, key: categorySortKey(button, index) }))
      .sort((a, b) =>
        a.key[0] - b.key[0] ||
        a.key[1] - b.key[1] ||
        a.key[2] - b.key[2]
      )
      .map(item => item.button);

    const changed = sorted.some((button, index) => button !== current[index]);
    if (changed) sorted.forEach(button => list.appendChild(button));
  }

  function cleanAndSortCategories() {
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
        image.addEventListener('error', () => {
          button.remove();
          cleanAndSortCategories();
        }, { once: true });
      }

      if (image.complete && image.naturalWidth === 0) button.remove();
    });

    reorderCategories();

    if (!list.querySelector('.category-chip.active')) {
      const first = list.querySelector('.category-chip');
      if (first) first.click();
    }
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      cleanAndSortCategories();
    });
  }).observe(list, { childList: true, subtree: true });

  cleanAndSortCategories();
})();
