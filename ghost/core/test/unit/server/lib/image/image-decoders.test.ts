import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as imageTransform from '@tryghost/image-transform';
import {
  getAllowedImageLoaders,
  restrictImageDecoders,
} from '../../../../../core/server/lib/image/image-decoders';
import config from '../../../../../core/shared/config';

const readFixture = (fixture: string) =>
  fs.readFileSync(path.join(__dirname, '../../../../utils/fixtures/images', fixture));

describe('lib/image: image-decoders', function () {
  describe('getAllowedImageLoaders', function () {
    it('maps the default image extensions to their loaders', function () {
      assert.deepEqual(getAllowedImageLoaders(config.get('uploads').images.extensions), [
        'VipsForeignLoadJpeg',
        'VipsForeignLoadNsgif',
        'VipsForeignLoadPng',
        'VipsForeignLoadSvg',
        'VipsForeignLoadWebp',
      ]);
    });

    it('maps extra formats a site can enable', function () {
      assert.deepEqual(getAllowedImageLoaders(['.AVIF', '.heic', '.tiff']), [
        'VipsForeignLoadHeif',
        'VipsForeignLoadPng',
        'VipsForeignLoadSvg',
        'VipsForeignLoadTiff',
      ]);
    });

    it('maps every spelling of a format', function () {
      assert.deepEqual(getAllowedImageLoaders(['.jpe', '.jfif', '.tif', '.heif']), [
        'VipsForeignLoadHeif',
        'VipsForeignLoadJpeg',
        'VipsForeignLoadPng',
        'VipsForeignLoadSvg',
        'VipsForeignLoadTiff',
      ]);
    });

    it('always allows PNG and SVG for internal images', function () {
      assert.deepEqual(getAllowedImageLoaders(['.jpg', '.ico', '.unknown']), [
        'VipsForeignLoadJpeg',
        'VipsForeignLoadPng',
        'VipsForeignLoadSvg',
      ]);
    });
  });

  describe('restrictImageDecoders', function () {
    afterEach(function () {
      // The block is process-wide, so lift it for the rest of the unit tests
      imageTransform.setAllowedDecoders(null);
    });

    it('returns the allowed loaders', function () {
      assert.deepEqual(restrictImageDecoders(['.jpg']), [
        'VipsForeignLoadJpeg',
        'VipsForeignLoadPng',
        'VipsForeignLoadSvg',
      ]);
    });

    // Goes through @tryghost/image-transform, and then Ghost's own copy of
    // sharp, so this fails if either resolves a copy of sharp the block
    // doesn't cover
    it('stops image processing from decoding formats that are not allowed', async function () {
      const avif = readFixture('ghosticon.avif');
      const resize = () => imageTransform.resizeFromBuffer(avif, { width: 10, format: 'png' });

      await resize();

      restrictImageDecoders(config.get('uploads').images.extensions);

      await assert.rejects(resize, { code: 'IMAGE_PROCESSING' });
      await assert.rejects(sharp(avif).png().toBuffer());
    });

    it('keeps decoding the allowed formats', async function () {
      restrictImageDecoders(config.get('uploads').images.extensions);

      for (const fixture of [
        'ghosticon.jpg',
        'ghost-logo.png',
        'loadingcat.gif',
        'ghosticon.webp',
        'ghost-logo.svg',
      ]) {
        const resized = await imageTransform.resizeFromBuffer(readFixture(fixture), {
          width: 10,
          format: 'png',
        });

        assert.ok(resized.length > 0, fixture);
      }
    });
  });
});
