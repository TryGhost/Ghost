const path = require('path');
const express = require('../../../shared/express');
const controller = require('./controller');

// Long-cache static texture assets shared by the gift card aesthetic
// (gift preview OG image, reader-side gift toast, Portal gift card).
// Filenames are fixed, so the public URLs at /gift/assets/* can be safely
// cached forever.
const ASSET_DIR = __dirname;
const ASSETS = {
  'gift-card-orb.png': 'image/png',
  'gift-card-noise.png': 'image/png',
  'gift-card-orb.webp': 'image/webp',
  'gift-card-noise.webp': 'image/webp',
};

module.exports = function giftPreviewApp() {
  const app = express('gift-preview');

  Object.keys(ASSETS).forEach((filename) => {
    app.get(`/assets/${filename}`, (req, res) => {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.type(ASSETS[filename]);
      res.sendFile(path.join(ASSET_DIR, filename));
    });
  });

  app.get('/:token/image', controller.giftPreviewImage);
  app.get('/:token', controller.giftPreview);

  return app;
};
