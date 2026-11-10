// text.js - Frontend XSS Sanitization & Text Helpers
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHtml(str) {
  return escapeHtml(str);
}

export default { escapeHtml, sanitizeHtml };
