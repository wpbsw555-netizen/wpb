(() => {
  const script = document.currentScript;
  if (!script) return;

  const parts = [0, 1, 2].map(index =>
    new URL(`../../scripts/home-hero-aj4-mini.part${index}`, script.src).href
  );

  Promise.all(parts.map(async url => {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
    return response.text();
  }))
    .then(values => {
      const base64 = values.join('').replace(/\s+/g, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      document.documentElement.style.setProperty('--hero-image', `url("${objectUrl}")`);
      document.documentElement.classList.add('hero-image-ready');
    })
    .catch(error => {
      console.error('Homepage hero image failed to load', error);
    });
})();
