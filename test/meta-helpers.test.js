'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { socialImagePath } = require('../scripts/meta-helpers');

test('resolves a bare post-asset filename against the page directory', () => {
  // post_asset_folder: true — `thumbnail: Skyline.avif` lives in the post folder,
  // so the social image must be resolved relative to the post's own path.
  assert.equal(
    socialImagePath('Skyline.avif', '2025-06/TripToTokyo2025JunPart1/index.html'),
    '2025-06/TripToTokyo2025JunPart1/Skyline.avif'
  );
});

test('passes root-relative paths through unchanged', () => {
  assert.equal(
    socialImagePath('/Works/Yoishigure/classical2.avif', 'Works/Yoishigure.html'),
    '/Works/Yoishigure/classical2.avif'
  );
});

test('passes absolute and protocol-relative URLs through unchanged', () => {
  assert.equal(
    socialImagePath('https://cdn.example.com/a.avif', 'x/index.html'),
    'https://cdn.example.com/a.avif'
  );
  assert.equal(
    socialImagePath('//cdn.example.com/a.avif', 'x/index.html'),
    '//cdn.example.com/a.avif'
  );
});

test('returns null when no thumbnail is set', () => {
  assert.equal(socialImagePath(undefined, 'x/index.html'), null);
  assert.equal(socialImagePath('', 'x/index.html'), null);
});
