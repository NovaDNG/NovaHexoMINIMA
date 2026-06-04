// themes/minima/test/exif-injector.test.js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  formatAperture,
  formatShutterSpeed,
  formatFocalLength,
  buildExifHTML,
  getExifClass,
  processHtml,
} = require('../scripts/exif-injector');

// ── formatAperture ────────────────────────────────────────
test('formatAperture: integer', () => {
  assert.equal(formatAperture(4), 'f/4');
});
test('formatAperture: decimal', () => {
  assert.equal(formatAperture(1.4), 'f/1.4');
});
test('formatAperture: null', () => {
  assert.equal(formatAperture(null), null);
});

// ── formatShutterSpeed ────────────────────────────────────
test('formatShutterSpeed: fractional < 1s', () => {
  assert.equal(formatShutterSpeed('1/500'), '<sup>1</sup><sub>500</sub>s');
});
test('formatShutterSpeed: whole seconds', () => {
  assert.equal(formatShutterSpeed('2'), '2s');
});
test('formatShutterSpeed: 1 second', () => {
  assert.equal(formatShutterSpeed('1'), '1s');
});
test('formatShutterSpeed: null', () => {
  assert.equal(formatShutterSpeed(null), null);
});

// ── formatFocalLength ─────────────────────────────────────
test('formatFocalLength: strips .0', () => {
  assert.equal(formatFocalLength('50.0 mm'), '50 mm');
});
test('formatFocalLength: keeps decimal', () => {
  assert.equal(formatFocalLength('18.3 mm'), '18.3 mm');
});
test('formatFocalLength: null', () => {
  assert.equal(formatFocalLength(null), null);
});
test('formatFocalLength: numeric input', () => {
  assert.equal(formatFocalLength(50), '50');
});

// ── buildExifHTML ─────────────────────────────────────────
test('buildExifHTML: all four fields', () => {
  const html = buildExifHTML({ aperture: 'f/1.4', shutter: '<sup>1</sup><sub>500</sub>s', iso: 'ISO 400', focal: '50 mm' });
  assert.equal(html, 'f/1.4<br><sup>1</sup><sub>500</sub>s<br>ISO 400<br>50 mm');
});
test('buildExifHTML: missing iso', () => {
  const html = buildExifHTML({ aperture: 'f/2.8', shutter: '2s', iso: null, focal: '90 mm' });
  assert.equal(html, 'f/2.8<br>2s<br>90 mm');
});
test('buildExifHTML: all null returns null', () => {
  assert.equal(buildExifHTML({ aperture: null, shutter: null, iso: null, focal: null }), null);
});
test('buildExifHTML: numeric iso', () => {
  const html = buildExifHTML({ aperture: 'f/1.8', shutter: '2s', iso: 100, focal: '50 mm' });
  assert.equal(html, 'f/1.8<br>2s<br>ISO 100<br>50 mm');
});

// ── getExifClass ──────────────────────────────────────────
test('getExifClass: gallery with < → gallery-left', () => {
  assert.equal(getExifClass('photo _gallery <'), 'exif-gallery-left');
});
test('getExifClass: gallery with > → gallery-right', () => {
  assert.equal(getExifClass('photo _gallery >'), 'exif-gallery-right');
});
test('getExifClass: gallery with >< → gallery-right', () => {
  assert.equal(getExifClass('photo _gallery ><'), 'exif-gallery-right');
});
test('getExifClass: gallery no direction → gallery-right', () => {
  assert.equal(getExifClass('photo _gallery'), 'exif-gallery-right');
});
test('getExifClass: no gallery flag → exif-right', () => {
  assert.equal(getExifClass('a nice photo'), 'exif-right');
});
test('getExifClass: empty alt → exif-right', () => {
  assert.equal(getExifClass(''), 'exif-right');
});
test('getExifClass: stray < in alt text before _gallery → gallery-right', () => {
  assert.equal(getExifClass('bus going <left _gallery >'), 'exif-gallery-right');
});
test('getExifClass: HTML-encoded &lt; → gallery-left', () => {
  assert.equal(getExifClass('photo _gallery &lt;'), 'exif-gallery-left');
});
test('getExifClass: HTML-encoded &gt; → gallery-right', () => {
  assert.equal(getExifClass('photo _gallery &gt;'), 'exif-gallery-right');
});

// ── processHtml ───────────────────────────────────────────
test('processHtml: injects exif-right into full-bleed paragraph', () => {
  const input = '<p><img src="a.avif" alt="photo"></p>';
  const exifMap = { 'a.avif': 'f/2.8<br><sup>1</sup><sub>500</sub>s<br>ISO 100<br>50 mm' };
  const result = processHtml(input, exifMap);
  assert.ok(result.includes('class="exif-para"'), 'adds exif-para class');
  assert.ok(result.includes('<small class="exif exif-right">'), 'injects exif-right label');
  assert.ok(result.includes('f/2.8'), 'includes exif content');
});

test('processHtml: no injection when exifMap has no entry for src', () => {
  const input = '<p><img src="b.avif" alt="photo"></p>';
  const result = processHtml(input, {});
  assert.equal(result, input);
});

test('processHtml: data-exif override used verbatim', () => {
  const input = '<p><img src="a.avif" alt="photo" data-exif="f/1.4<br>custom"></p>';
  const result = processHtml(input, {});
  assert.ok(result.includes('<small class="exif exif-right">f/1.4<br>custom</small>'));
});

test('processHtml: data-exif="none" suppresses injection', () => {
  const input = '<p><img src="a.avif" alt="photo" data-exif="none"></p>';
  const exifMap = { 'a.avif': 'f/2.8<br>...' };
  const result = processHtml(input, exifMap);
  assert.ok(!result.includes('<small'), 'no small injected');
});

test('processHtml: gallery paragraph gets gallery classes', () => {
  const input = '<p><img src="a.avif" alt="photo _gallery <"><img src="b.avif" alt="photo _gallery"></p>';
  const exifMap = {
    'a.avif': 'f/1.8<br><sup>1</sup><sub>400</sub>s<br>ISO 100<br>50 mm',
    'b.avif': 'f/2.0<br><sup>1</sup><sub>60</sub>s<br>ISO 400<br>65 mm',
  };
  const result = processHtml(input, exifMap);
  assert.ok(result.includes('exif-gallery-left'), 'left image gets gallery-left');
  assert.ok(result.includes('exif-gallery-right'), 'right image gets gallery-right');
  assert.ok(!result.includes('exif-para'), 'gallery paragraph does not get exif-para');
});

test('processHtml: paragraph with text + image is skipped', () => {
  const input = '<p>Some text <img src="a.avif" alt="photo"> more text</p>';
  const exifMap = { 'a.avif': 'f/2.8<br>...' };
  const result = processHtml(input, exifMap);
  assert.equal(result, input);
});
