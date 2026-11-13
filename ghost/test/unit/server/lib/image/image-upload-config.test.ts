import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import * as imageTransform from '@tryghost/image-transform';
import { applyImageUploadConfig } from '../../../../../core/server/lib/image/image-upload-config';
import config from '../../../../../core/shared/config';

describe('lib/image: image-upload-config', function () {
  let warn: sinon.SinonStub;

  beforeEach(function () {
    warn = sinon.stub(logging, 'warn');
  });

  afterEach(function () {
    sinon.restore();
    // The block is process-wide, so lift it for the rest of the unit tests
    imageTransform.setAllowedDecoders(null);
  });

  it('limits image processing to the default configured formats without warning', function () {
    assert.deepEqual(applyImageUploadConfig(config.get('uploads')), [
      'VipsForeignLoadJpeg',
      'VipsForeignLoadNsgif',
      'VipsForeignLoadPng',
      'VipsForeignLoadSvg',
      'VipsForeignLoadWebp',
    ]);
    sinon.assert.notCalled(warn);
  });

  it('allows the formats of every image upload type', function () {
    assert.deepEqual(
      applyImageUploadConfig({
        images: { extensions: ['.jpg'] },
        thumbnails: { extensions: ['.webp'] },
        icons: { extensions: ['.avif'] },
      }),
      [
        'VipsForeignLoadHeif',
        'VipsForeignLoadJpeg',
        'VipsForeignLoadPng',
        'VipsForeignLoadSvg',
        'VipsForeignLoadWebp',
      ],
    );
  });

  it('accepts upload types that are not configured', function () {
    assert.deepEqual(applyImageUploadConfig({}), ['VipsForeignLoadPng', 'VipsForeignLoadSvg']);
    sinon.assert.notCalled(warn);
  });

  it('points out configured content types that are not image types', function () {
    applyImageUploadConfig({
      images: { contentTypes: ['image/png', 'text/html', 'application/pdf'] },
      thumbnails: { contentTypes: ['image/webp'] },
      icons: { contentTypes: ['text/plain'] },
    });

    sinon.assert.calledTwice(warn);
    sinon.assert.calledWithExactly(
      warn,
      'Ignoring uploads.images.contentTypes that are not image types: text/html, application/pdf',
    );
    sinon.assert.calledWithExactly(
      warn,
      'Ignoring uploads.icons.contentTypes that are not image types: text/plain',
    );
  });
});
