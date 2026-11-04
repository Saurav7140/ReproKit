(() => {
  let preference = 'system';
  try { const saved = localStorage.getItem('reprokit-appearance'); if (['light', 'dark', 'system'].includes(saved)) preference = saved; } catch {}
  const theme = preference === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.appearance = preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
