'use strict';

// Resolve a thumbnail front-matter value to a path suitable for full_url_for().
// External URLs and root-relative paths pass through untouched; a bare filename
// (the post_asset_folder convention, e.g. `thumbnail: Skyline.avif`) is resolved
// against the page's own directory so it points inside the post asset folder.
function socialImagePath(thumbnail, pagePath) {
  if (!thumbnail) return null;
  if (/^(https?:)?\/\//.test(thumbnail) || thumbnail.charAt(0) === '/') {
    return thumbnail;
  }
  const dir = String(pagePath || '').replace(/[^/]*$/, '');
  return dir + thumbnail;
}

module.exports = { socialImagePath };

if (typeof hexo !== 'undefined') {
  hexo.extend.helper.register('social_image_path', socialImagePath);
}
