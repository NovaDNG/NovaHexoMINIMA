'use strict';

// Normalize a URL or path to a bare route: strip origin, query/hash,
// index.html / .html, and leading/trailing slashes.
function normalizeRoute(p) {
  return String(p || '')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/[?#].*$/, '')
    .replace(/index\.html$/i, '')
    .replace(/\.html$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

module.exports = { normalizeRoute };

if (typeof hexo !== 'undefined') {
  hexo.extend.helper.register('normalize_route', normalizeRoute);
}
