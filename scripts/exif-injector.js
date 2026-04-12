'use strict';

function formatAperture(fnumber) {
  if (fnumber == null) return null;
  return `f/${fnumber}`;
}

function formatShutterSpeed(raw) {
  if (raw == null) return null;
  const str = String(raw);
  if (str.includes('/')) {
    const [num, den] = str.split('/');
    return `<sup>${num}</sup><sub>${den}</sub>s`;
  }
  return `${str}s`;
}

function formatFocalLength(raw) {
  if (raw == null) return null;
  return String(raw).replace(/\.0(\s|$)/, '$1');
}

function buildExifHTML({ aperture, shutter, iso, focal }) {
  // iso may be a raw number (e.g. 100) or a pre-formatted string (e.g. 'ISO 400').
  // When it's a number, prefix with 'ISO '; when already prefixed or null, pass through.
  let isoStr = null;
  if (iso != null) {
    isoStr = typeof iso === 'number' ? `ISO ${iso}` : iso;
  }
  const parts = [aperture, shutter, isoStr, focal].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join('<br>');
}

function getExifClass(alt) {
  const decoded = alt.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const idx = decoded.indexOf('_gallery');
  if (idx === -1) return 'exif-right';
  const suffix = decoded.slice(idx);
  if (suffix.includes('<') && !suffix.includes('>')) return 'exif-gallery-left';
  return 'exif-gallery-right';
}

function getAttr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : '';
}

function isImageOnlyParagraph(content) {
  // Strip tags carefully: skip over attribute values that may contain '<' (e.g. data-exif="ƒ/1.4<br>custom")
  // Strategy: remove quoted attribute values first, then strip remaining tags.
  const withoutAttrs = content.replace(/"[^"]*"/g, '""');
  return withoutAttrs.replace(/<[^>]*>/g, '').trim() === '';
}

function processHtml(html, exifMap) {
  return html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/g, (match, pAttrs, content) => {
    if (!content.includes('<img')) return match;
    if (!isImageOnlyParagraph(content)) return match;

    const isGallery = content.includes('_gallery');
    // Detect layout markers in any alt attribute before stripping them.
    const hasMm   = /\balt="[^"]*\b_mm\b/.test(content);
    const hasMt   = /\balt="[^"]*\b_mt\b/.test(content);
    const hasXpan = /\balt="[^"]*\b_xpan\b/.test(content);
    const smalls = [];

    // Use a regex that handles attribute values containing '>' (e.g. data-exif="...<br>...")
    const imgRegex = /<img((?:\s+[\w-]+(?:="[^"]*")?)*)\s*\/?>/g;
    content.replace(imgRegex, (imgMatch, imgAttrs) => {
      const src = getAttr(imgAttrs, 'src');
      const alt = getAttr(imgAttrs, 'alt');
      const dataExif = getAttr(imgAttrs, 'data-exif');

      let exifHTML = null;
      if (dataExif === 'none') {
        // force-hide
      } else if (dataExif) {
        exifHTML = dataExif;
      } else if (exifMap[src]) {
        exifHTML = exifMap[src];
      }

      if (exifHTML) {
        const cls = getExifClass(alt);
        smalls.push(`<small class="exif ${cls}">${exifHTML}</small>`);
      }
    });

    // Skip paragraphs with no EXIF and no layout markers.
    if (smalls.length === 0 && !hasMm && !hasMt && !hasXpan) return match;

    // Add exif-para class to non-gallery paragraphs for position:relative
    let newPAttrs = pAttrs;
    if (smalls.length > 0 && !isGallery) {
      if (/\bclass="/.test(newPAttrs)) {
        newPAttrs = newPAttrs.replace(/\bclass="/, 'class="exif-para ');
      } else {
        newPAttrs = (newPAttrs + ' class="exif-para"').trimStart();
      }
    }

    // Convert layout markers to data attributes on <p> so CSS can target
    // p[data-mm] / p[data-mt] after the alt text has been cleaned.
    if (hasMm)   newPAttrs = (newPAttrs + ' data-mm').trimStart();
    if (hasMt)   newPAttrs = (newPAttrs + ' data-mt').trimStart();
    if (hasXpan) newPAttrs = (newPAttrs + ' data-xpan').trimStart();

    // Strip markers from alt text (accessibility + clean HTML output).
    const cleanedContent = content
      .replace(/(\balt="[^"]*?)\s*\b_mm\b\s*/g, '$1')
      .replace(/(\balt="[^"]*?)\s*\b_mt\b\s*/g, '$1')
      .replace(/(\balt="[^"]*?)\s*\b_xpan\b\s*/g, '$1');
    return `<p${newPAttrs ? ' ' + newPAttrs.trim() : ''}>${cleanedContent}${smalls.join('')}</p>`;
  });
}

module.exports = {
  formatAperture,
  formatShutterSpeed,
  formatFocalLength,
  buildExifHTML,
  getExifClass,
  processHtml,
  isImageOnlyParagraph,
  getAttr,
};

// ── Hexo filter (only loaded when running inside Hexo) ────────────────────
// Guard lets the file be required in tests without crashing on missing `hexo`
if (typeof hexo !== 'undefined' && !process.argv.includes('server')) {
  const path = require('path');
  const fs = require('fs');
  const { ExifTool } = require('exiftool-vendored');

  const et = new ExifTool({ taskTimeoutMillis: 5000 });

  // ── Persistent disk cache ─────────────────────────────────────────────────
  // Keyed by absolute path; each entry stores mtime+size for invalidation and
  // the pre-formatted EXIF HTML (or null when the file has no usable EXIF).
  // Lives at .cache/exif-cache.json (already gitignored via .cache/).
  const CACHE_FILE = path.join(hexo.base_dir, '.cache', 'exif-cache.json');

  let diskCache = {};
  try {
    diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    // First run or file missing/corrupt — start fresh.
  }

  // In-memory map for the current build (avoids redundant stat calls when the
  // same image appears in multiple posts during one hexo generate run).
  const exifCache = new Map();

  hexo.on('exit', () => {
    et.end();
    try {
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(diskCache, null, 2));
    } catch {
      // Non-fatal — worst case the next build re-reads everything.
    }
  });

  /**
   * Resolve an img src to an absolute filesystem path.
   * - Absolute src ('/Frames/…')  → hexo.source_dir + src (strip leading /)
   * - Relative src ('photo.avif') → post asset dir (source/_posts/<slug>/)
   */
  function resolveSrc(src, data) {
    if (src.startsWith('/')) {
      const directPath = path.join(hexo.source_dir, src.slice(1));
      if (fs.existsSync(directPath)) return directPath;
      // Post-asset permalink: Hexo rewrites post-folder images to '/YYYY-MM/PostSlug/file'.
      // Extract the slug from the URL itself — works when a PAGE references images that
      // live in a different post's asset folder (cross-page references like Frames pages).
      const m = src.match(/^\/\d{4}-\d{2}\/(.+)/);
      if (m) {
        const candidate = path.join(hexo.source_dir, '_posts', m[1]);
        if (fs.existsSync(candidate)) return candidate;
      }
      // Fallback: derive slug from this source file (for same-post relative assets).
      const slug = path.basename(data.source, path.extname(data.source));
      return path.join(hexo.source_dir, '_posts', slug, path.basename(src));
    }
    const slug = path.basename(data.source, path.extname(data.source));
    return path.join(hexo.source_dir, '_posts', slug, src);
  }

  /**
   * Read EXIF for one image file.
   * Returns the cached innerHTML string when the file is unchanged (same mtime
   * and size), otherwise calls ExifTool and updates the cache.
   */
  async function readExif(absPath) {
    if (exifCache.has(absPath)) return exifCache.get(absPath);

    // Stat the file first — if it doesn't exist, bail out early.
    let stat;
    try {
      stat = fs.statSync(absPath);
    } catch {
      exifCache.set(absPath, null);
      return null;
    }

    const cached = diskCache[absPath];
    if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
      // File unchanged — reuse stored value without invoking ExifTool.
      exifCache.set(absPath, cached.exifHTML);
      return cached.exifHTML;
    }

    // File is new or modified — read EXIF from disk.
    let result = null;
    try {
      const tags = await et.read(absPath);
      result = buildExifHTML({
        aperture: formatAperture(tags.FNumber),
        shutter:  formatShutterSpeed(tags.ExposureTime),
        iso:      tags.ISO ?? null,
        focal:    formatFocalLength(tags.FocalLength ?? null),
      });
    } catch {
      // File unreadable or no EXIF — leave as null.
    }

    diskCache[absPath] = { mtime: stat.mtimeMs, size: stat.size, exifHTML: result };
    exifCache.set(absPath, result);
    return result;
  }

  hexo.extend.filter.register('after_post_render', async function (data) {
    // Collect unique img srcs needing file reads (skip manual overrides and icons)
    const srcSet = new Set();
    const imgRegex = /<img((?:\s+[\w-]+(?:="[^"]*")?)*)\s*\/?>/g;
    let m;
    while ((m = imgRegex.exec(data.content)) !== null) {
      const attrs = m[1];
      const dataExif = getAttr(attrs, 'data-exif');
      if (dataExif === 'none' || dataExif) continue;  // manual override — no file read needed
      const src = getAttr(attrs, 'src');
      const alt = getAttr(attrs, 'alt');
      if (!src || alt.includes('icon')) continue;
      srcSet.add(src);
    }

    // Read EXIF for all srcs in parallel
    const exifMap = {};
    await Promise.all([...srcSet].map(async (src) => {
      const absPath = resolveSrc(src, data);
      const html = await readExif(absPath);
      if (html) exifMap[src] = html;
    }));

    data.content = processHtml(data.content, exifMap);
    return data;
  });
}
