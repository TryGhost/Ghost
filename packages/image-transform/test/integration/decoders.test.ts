import assert from 'node:assert/strict';
import sharp from 'sharp';
import { afterEach, beforeAll, describe, it } from 'vitest';
import * as imageTransform from '../../src/index.ts';

const hasCode = (code: string) => (err: unknown) =>
  err instanceof Error && 'code' in err && err.code === code;

describe('Decoder restriction', function () {
  let avif: Buffer;
  let png: Buffer;

  beforeAll(async function () {
    const image = sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } });
    avif = await image.clone().avif().toBuffer();
    png = await image.clone().png().toBuffer();
  });

  afterEach(function () {
    // The restriction is process-wide
    imageTransform.setAllowedDecoders(null);
  });

  it('stops formats that are not allowed from being decoded', async function () {
    imageTransform.setAllowedDecoders(['VipsForeignLoadPng']);

    await assert.rejects(
      imageTransform.resizeFromBuffer(avif, { width: 4, format: 'png' }),
      hasCode('IMAGE_PROCESSING'),
    );
    assert.equal((await sharp(png).metadata()).format, 'png');
    assert.ok((await imageTransform.resizeFromBuffer(png, { width: 4, format: 'png' })).length);
  });

  it('restricts sharp returned by getSharp', async function () {
    imageTransform.setAllowedDecoders(['VipsForeignLoadPng']);

    await assert.rejects(imageTransform.getSharp()(avif).png().toBuffer());
  });

  it('decodes them again once the restriction is lifted', async function () {
    imageTransform.setAllowedDecoders(['VipsForeignLoadPng']);
    imageTransform.getSharp();

    imageTransform.setAllowedDecoders(null);

    assert.ok((await imageTransform.resizeFromBuffer(avif, { width: 4, format: 'png' })).length);
  });
});
