'use strict';

function formatAperture(fnumber) {
  if (fnumber == null) return null;
  return `ƒ/${fnumber}`;
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

    if (smalls.length === 0) return match;

    // Add exif-para class to non-gallery paragraphs for position:relative
    let newPAttrs = pAttrs;
    if (!isGallery) {
      if (/\bclass="/.test(pAttrs)) {
        newPAttrs = pAttrs.replace(/\bclass="/, 'class="exif-para ');
      } else {
        newPAttrs = (pAttrs + ' class="exif-para"').trimStart();
      }
    }

    return `<p${newPAttrs ? ' ' + newPAttrs.trim() : ''}>${content}${smalls.join('')}</p>`;
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
if (typeof hexo !== 'undefined') {
  const path = require('path');
  const { ExifTool } = require('exiftool-vendored');

  const et = new ExifTool({ taskTimeoutMillis: 5000 });
  const exifCache = new Map();  // absolute file path → exif innerHTML string | null

  hexo.on('exit', () => et.end());

  /**
   * Resolve an img src to an absolute filesystem path.
   * - Absolute src ('/Frames/…')  → hexo.source_dir + src (strip leading /)
   * - Relative src ('photo.avif') → post asset dir (source/_posts/<slug>/)
   */
  function resolveSrc(src, data) {
    const fs = require('fs');
    if (src.startsWith('/')) {
      const directPath = path.join(hexo.source_dir, src.slice(1));
      if (fs.existsSync(directPath)) return directPath;
      // Post-asset: Hexo rewrote 'file.avif' → '/YEAR-MO/PostSlug/file.avif'
      // The source file lives at _posts/<slug>/<filename>
      const slug = path.basename(data.source, path.extname(data.source));
      return path.join(hexo.source_dir, '_posts', slug, path.basename(src));
    }
    const slug = path.basename(data.source, path.extname(data.source));
    return path.join(hexo.source_dir, '_posts', slug, src);
  }

  /**
   * Read EXIF for one image file, with in-memory caching.
   * Returns formatted innerHTML string or null.
   */
  async function readExif(absPath) {
    if (exifCache.has(absPath)) return exifCache.get(absPath);

    let result = null;
    try {
      const tags = await et.read(absPath);
      const html = buildExifHTML({
        aperture: formatAperture(tags.FNumber),
        shutter:  formatShutterSpeed(tags.ExposureTime),
        iso:      tags.ISO ?? null,
        focal:    formatFocalLength(tags.FocalLength ?? null),
      });
      result = html;
    } catch {
      // File not found, unreadable, or no EXIF — leave as null
    }

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
