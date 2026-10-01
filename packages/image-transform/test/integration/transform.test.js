'use strict';

const sharp = require('sharp');
const assert = require('assert');
const imageTransform = require('../../');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fixtures = require('./fixtures');

let outputDir;

const makeOutpath = (inPath, mod, ext) => {
  if (!ext) {
    ext = path.extname(inPath);
  }
  const fileName = path.basename(inPath, ext);
  return path.join(outputDir, `${fileName}_${mod}${ext}`);
};

describe('Image compression', function () {
  // Encoded bytes vary with the platform's libvips, so keep outputs out of the repo
  beforeAll(function () {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-transform-'));
  });

  afterAll(function () {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  describe('JPEG', function () {
    let fixtureBuffer;

    beforeAll(async function () {
      fixtureBuffer = await sharp(fixtures.inputJpeg).toBuffer();
    });

    it('should always compress JPEG images', async function () {
      const inPath = fixtures.inputJpeg;
      const outPath = makeOutpath(inPath, 'base', '.jpg');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath });

      await sharp(outPath).toBuffer(function (err, result) {
        if (err) {
          throw err;
        }
        assert(result instanceof Buffer);
        assert(result.length < fixtureBuffer.length);
      });
    });

    it('should compress JPEG images with width attribute', async function () {
      const inPath = fixtures.inputJpeg;
      const outPath = makeOutpath(inPath, '1000w', '.jpg');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath, width: 1000 });

      await sharp(outPath).toBuffer(function (err, result, info) {
        if (err) {
          throw err;
        }
        assert(result instanceof Buffer);
        assert(result.length < fixtureBuffer.length);
        assert(info.width === 1000);
      });
    });

    it('can create a JPEG from another format by passing the format option', async function () {
      const inputPngBuffer = await sharp(fixtures.inputPng).toBuffer();

      const outputBuffer = await imageTransform.resizeFromBuffer(inputPngBuffer, {
        format: 'jpeg',
      });

      sharp(outputBuffer)
        .metadata()
        .then(function (metadata) {
          assert.equal(metadata.format, 'jpeg');
        });
    });
  });

  describe('PNG', function () {
    let fixtureBuffer;

    beforeAll(async function () {
      fixtureBuffer = await sharp(fixtures.inputPng).toBuffer();
    });

    it('should compress PNG images with width attribute', async function () {
      const inPath = fixtures.inputPng;
      const outPath = makeOutpath(inPath, '1000w', '.png');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath, width: 1000 });

      await sharp(outPath).toBuffer(function (err, result, info) {
        if (err) {
          throw err;
        }
        assert(result instanceof Buffer);
        assert(result.length < fixtureBuffer.length);
        assert(info.width === 1000);
      });
    });

    it('can create PNG from another format by passing the format option', async function () {
      const inputJpegBuffer = await sharp(fixtures.inputJpeg).toBuffer();

      const outputBuffer = await imageTransform.resizeFromBuffer(inputJpegBuffer, {
        format: 'png',
      });

      sharp(outputBuffer)
        .metadata()
        .then(function (metadata) {
          assert.equal(metadata.format, 'png');
        });
    });
  });

  describe('WEBP', function () {
    let fixtureBuffer;

    beforeAll(async function () {
      fixtureBuffer = await sharp(fixtures.inputWebp).toBuffer();
    });

    it('should compress WEBP images with width attribute', async function () {
      const inPath = fixtures.inputWebp;
      const outPath = makeOutpath(inPath, '1000w', '.webp');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath, width: 1000 });

      await sharp(outPath).toBuffer(function (err, result, info) {
        if (err) {
          throw err;
        }
        assert(result instanceof Buffer);
        assert(result.length < fixtureBuffer.length);
        assert(info.width === 1000);
      });
    });
  });
});
