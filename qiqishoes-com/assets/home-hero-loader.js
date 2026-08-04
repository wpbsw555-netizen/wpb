(() => {
  const script = document.currentScript;
  if (!script) return;

  const names = [
    'home-hero-aj4-mini.part0a',
    'home-hero-aj4-mini.part0b',
    'home-hero-aj4-mini.part0c',
    'home-hero-aj4-mini.part0d',
    'home-hero-aj4-mini.part1',
    'home-hero-aj4-mini.part2'
  ];
  const parts = names.map(name =>
    new URL(`../../scripts/${name}`, script.src).href
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
