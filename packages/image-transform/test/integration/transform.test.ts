import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, it } from 'vitest';
import * as imageTransform from '../../src/index.ts';
import * as fixtures from './fixtures/index.ts';

let outputDir: string;

const makeOutpath = (inPath: string, mod: string, ext: string) => {
  const fileName = path.basename(inPath, ext);
  return path.join(outputDir, `${fileName}_${mod}${ext}`);
};

const readOutput = (outPath: string) => sharp(outPath).toBuffer({ resolveWithObject: true });

describe('Image compression', function () {
  // Encoded bytes vary with the platform's libvips, so keep outputs out of the repo
  beforeAll(function () {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-transform-'));
  });

  afterAll(function () {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  describe('JPEG', function () {
    let fixtureBuffer: Buffer;

    beforeAll(async function () {
      fixtureBuffer = await sharp(fixtures.inputJpeg).toBuffer();
    });

    it('should always compress JPEG images', async function () {
      const inPath = fixtures.inputJpeg;
      const outPath = makeOutpath(inPath, 'base', '.jpg');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath });

      const { data } = await readOutput(outPath);
      assert.ok(data.length < fixtureBuffer.length);
    });

    it('should compress JPEG images with width attribute', async function () {
      const inPath = fixtures.inputJpeg;
      const outPath = makeOutpath(inPath, '1000w', '.jpg');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath, width: 1000 });

      const { data, info } = await readOutput(outPath);
      assert.ok(data.length < fixtureBuffer.length);
      assert.equal(info.width, 1000);
    });

    it('can create a JPEG from another format by passing the format option', async function () {
      const inputPngBuffer = await sharp(fixtures.inputPng).toBuffer();

      const outputBuffer = await imageTransform.resizeFromBuffer(inputPngBuffer, {
        format: 'jpeg',
      });

      const metadata = await sharp(outputBuffer).metadata();
      assert.equal(metadata.format, 'jpeg');
    });
  });

  describe('PNG', function () {
    let fixtureBuffer: Buffer;

    beforeAll(async function () {
      fixtureBuffer = await sharp(fixtures.inputPng).toBuffer();
    });

    it('should compress PNG images with width attribute', async function () {
      const inPath = fixtures.inputPng;
      const outPath = makeOutpath(inPath, '1000w', '.png');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath, width: 1000 });

      const { data, info } = await readOutput(outPath);
      assert.ok(data.length < fixtureBuffer.length);
      assert.equal(info.width, 1000);
    });

    it('can create PNG from another format by passing the format option', async function () {
      const inputJpegBuffer = await sharp(fixtures.inputJpeg).toBuffer();

      const outputBuffer = await imageTransform.resizeFromBuffer(inputJpegBuffer, {
        format: 'png',
      });

      const metadata = await sharp(outputBuffer).metadata();
      assert.equal(metadata.format, 'png');
    });
  });

  describe('WEBP', function () {
    let fixtureBuffer: Buffer;

    beforeAll(async function () {
      fixtureBuffer = await sharp(fixtures.inputWebp).toBuffer();
    });

    it('should compress WEBP images with width attribute', async function () {
      const inPath = fixtures.inputWebp;
      const outPath = makeOutpath(inPath, '1000w', '.webp');

      await imageTransform.resizeFromPath({ in: inPath, out: outPath, width: 1000 });

      const { data, info } = await readOutput(outPath);
      assert.ok(data.length < fixtureBuffer.length);
      assert.equal(info.width, 1000);
    });
  });
});
