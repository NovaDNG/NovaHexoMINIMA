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
  return raw.replace(/\.0(\s)/, '$1');
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
  if (!alt.includes('_gallery')) return 'exif-right';
  // '>' means right (default), '<' means left. If both appear, '>' wins.
  if (alt.includes('<') && !alt.includes('>')) return 'exif-gallery-left';
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
