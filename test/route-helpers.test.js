'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRoute } = require('../scripts/route-helpers');

test('strips origin, trailing slash, index.html', () => {
  assert.equal(normalizeRoute('https://novadng.studio/Frames/index.html'), 'Frames');
});
test('strips query and hash', () => {
  assert.equal(normalizeRoute('/Works/Yoishigure/?x=1#top'), 'Works/Yoishigure');
});
test('handles empty / nullish', () => {
  assert.equal(normalizeRoute(''), '');
  assert.equal(normalizeRoute(null), '');
});
test('strips .html and surrounding slashes', () => {
  assert.equal(normalizeRoute('/About/Now.html'), 'About/Now');
});
