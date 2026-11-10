// globalFooter.js - KampüsStok Global Footer (Kaldırıldı)
export function renderGlobalFooter(container) {
  if (!container) return;
  const existing = container.querySelector('.global-footer');
  if (existing) existing.remove();
}

export default renderGlobalFooter;
