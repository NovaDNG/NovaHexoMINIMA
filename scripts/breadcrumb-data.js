'use strict';

// Per-build memoization for template data that is identical across every page
// (e.g. the breadcrumb's all-pages/all-posts lookup). `crumb_meta(buildFn)`
// runs buildFn once and returns the cached value for the rest of the build.
if (typeof hexo !== 'undefined') {
  let cache = null;
  // hexo server regenerates on change — reset so edits are picked up.
  hexo.extend.filter.register('before_generate', function () { cache = null; });
  // Single cache slot is intentional: path_breadcrumb.ejs passes a fresh closure
  // on every page render, so the map is built once (first call) and reused for the
  // rest of the build. Do NOT key the cache on buildFn — a new function identity per
  // render would miss every time and defeat the memoization.
  hexo.extend.helper.register('crumb_meta', function (buildFn) {
    if (!cache) cache = buildFn();
    return cache;
  });
}
