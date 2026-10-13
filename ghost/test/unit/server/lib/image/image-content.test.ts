import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';
import {
  detectFileExtension,
  getIgnoredImageContentTypes,
  isImageContentType,
  isAllowedImageContent,
  isAllowedImageExtension,
  isSvgExtension,
} from '../../../../../core/server/lib/image/image-content';

const fixturePath = (fixture: string) =>
  path.join(__dirname, '../../../../utils/fixtures/images', fixture);

// Turns a PNG into an APNG by adding an animation control chunk before the
// image data, which is what file-type looks for
const toApng = (png: Buffer) => {
  const data = Buffer.alloc(8);
  data.writeUInt32BE(1, 0);
  const type = Buffer.from('acTL');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([type, data])));
  const idat = png.indexOf('IDAT') - 4;

  return Buffer.concat([png.subarray(0, idat), length, type, data, crc, png.subarray(idat)]);
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.gif', '.png', '.svg', '.svgz', '.ico', '.webp'];

describe('lib/image: image-content', function () {
  describe('detectFileExtension', function () {
    it('detects the type from a path or a buffer', async function () {
      assert.equal(await detectFileExtension(fixturePath('ghosticon.jpg')), '.jpg');
      assert.equal(
        await detectFileExtension(fs.readFileSync(fixturePath('ghost-logo.png'))),
        '.png',
      );
    });

    it('detects formats regardless of the allowlist', async function () {
      const buffer = fs.readFileSync(fixturePath('ghosticon.avif'));

      assert.equal(await detectFileExtension(buffer), '.avif');
    });

    it('returns undefined for contents it cannot detect', async function () {
      assert.equal(await detectFileExtension(Buffer.from('not an image')), undefined);
    });
  });

  describe('isAllowedImageExtension', function () {
    it('treats .jpg and .jpeg as the same format', function () {
      assert.equal(isAllowedImageExtension('.jpg', ['.jpeg']), true);
      assert.equal(isAllowedImageExtension('.jpeg', ['.jpg']), true);
      assert.equal(isAllowedImageExtension('.JPG', ['.jpg']), true);
    });

    it('matches every spelling of a format', function () {
      assert.equal(isAllowedImageExtension('.tif', ['.tiff']), true);
      assert.equal(isAllowedImageExtension('.jpg', ['.jpe']), true);
      assert.equal(isAllowedImageExtension('.jpg', ['.jfif']), true);
      assert.equal(isAllowedImageExtension('.apng', ['.png']), true);
      assert.equal(isAllowedImageExtension('.heic', ['.heif']), true);
    });

    it('keeps formats that share a decoder separate', function () {
      assert.equal(isAllowedImageExtension('.avif', ['.heic', '.heif']), false);
      assert.equal(isAllowedImageExtension('.heic', ['.avif']), false);
    });

    it('matches extensions that are not image formats exactly', function () {
      assert.equal(isAllowedImageExtension('.BMP', ['.bmp']), true);
      assert.equal(isAllowedImageExtension('.bmp', ['.png']), false);
    });

    it('rejects extensions that are not allowed', function () {
      assert.equal(isAllowedImageExtension('.avif', IMAGE_EXTENSIONS), false);
      assert.equal(isAllowedImageExtension('.png', ['.jpg']), false);
      assert.equal(isAllowedImageExtension(undefined, IMAGE_EXTENSIONS), false);
    });
  });

  describe('isAllowedImageContent', function () {
    it('accepts each allowed raster image format', async function () {
      for (const fixture of [
        'ghosticon.jpg',
        'ghost-logo.png',
        'loadingcat.gif',
        'ghosticon.webp',
        'favicon.ico',
        'favicon_multi_sizes.ico',
      ]) {
        assert.equal(await isAllowedImageContent(fixturePath(fixture), IMAGE_EXTENSIONS), true);
      }
    });

    it('accepts contents whose detected extension is another spelling of an allowed one', async function () {
      const jpeg = fs.readFileSync(fixturePath('ghosticon.jpg'));
      const tiff = await sharp(jpeg).tiff().toBuffer();
      const apng = toApng(fs.readFileSync(fixturePath('ghost-logo.png')));

      assert.equal(await detectFileExtension(tiff), '.tif');
      assert.equal(await isAllowedImageContent(tiff, ['.tiff']), true);
      assert.equal(await isAllowedImageContent(jpeg, ['.jpe', '.jfif']), true);
      assert.equal(await detectFileExtension(apng), '.apng');
      assert.equal(await isAllowedImageContent(apng, IMAGE_EXTENSIONS), true);
    });

    it('rejects formats that are not in the allowed extensions', async function () {
      assert.equal(
        await isAllowedImageContent(fixturePath('ghosticon.avif'), IMAGE_EXTENSIONS),
        false,
      );
      assert.equal(await isAllowedImageContent(fixturePath('ghost-logo.png'), ['.jpg']), false);
    });

    it('rejects SVGs, which are left to the SVG sanitizer', async function () {
      assert.equal(
        await isAllowedImageContent(fixturePath('ghost-logo.svg'), IMAGE_EXTENSIONS),
        false,
      );
      assert.equal(
        await isAllowedImageContent(fixturePath('ghost-logo.svgz'), IMAGE_EXTENSIONS),
        false,
      );
    });
  });

  describe('isAllowedImageContent with a custom allowlist', function () {
    it('accepts explicitly allowed image formats outside the format table', async function () {
      // A valid 1x1, 24-bit BMP with one padded pixel row.
      const bmp = Buffer.from(
        '424d3a00000000000000360000002800000001000000010000000100180000000000040000000000000000000000000000000000000000000000',
        'hex',
      );
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-image-content-'));
      const filePath = path.join(tmpDir, 'pixel.bmp');

      try {
        fs.writeFileSync(filePath, bmp);

        for (const input of [bmp, filePath]) {
          assert.equal(await isAllowedImageContent(input, ['.bmp']), true);
          assert.equal(await isAllowedImageContent(input, IMAGE_EXTENSIONS), false);
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('rejects non-image contents even when their extension is explicitly allowed', async function () {
      const pdf = fixturePath('../files/test.pdf');

      assert.equal(await detectFileExtension(pdf), '.pdf');
      assert.equal(await isAllowedImageContent(pdf, ['.pdf']), false);
    });
  });

  describe('isImageContentType', function () {
    it('accepts image types and downloads', function () {
      assert.equal(isImageContentType('image/png'), true);
      assert.equal(isImageContentType('image/svg+xml'), true);
      assert.equal(isImageContentType(' IMAGE/JPEG '), true);
      assert.equal(isImageContentType('application/octet-stream'), true);
    });

    it('rejects types a browser could treat as a document', function () {
      assert.equal(isImageContentType('text/html'), false);
      assert.equal(isImageContentType('application/xhtml+xml'), false);
      assert.equal(isImageContentType('text/xml'), false);
      assert.equal(isImageContentType('application/pdf'), false);
    });
  });

  describe('getIgnoredImageContentTypes', function () {
    it('returns the configured types that are not image types', function () {
      assert.deepEqual(getIgnoredImageContentTypes(['image/png', 'text/html', 'text/xml']), [
        'text/html',
        'text/xml',
      ]);
      assert.deepEqual(getIgnoredImageContentTypes(['image/png', 'image/svg+xml']), []);
    });
  });

  describe('isSvgExtension', function () {
    it('matches .svg and .svgz in any case', function () {
      assert.equal(isSvgExtension('.svg'), true);
      assert.equal(isSvgExtension('.SVGZ'), true);
      assert.equal(isSvgExtension('.png'), false);
    });
  });
});
