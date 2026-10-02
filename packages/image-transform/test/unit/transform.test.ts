import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import Module from 'node:module';
import errors from '@tryghost/errors';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import * as transform from '../../src/index.ts';

// sharp is loaded with require() on demand, so stand in for it there
const stubSharpRequire = () =>
  sinon.stub(Module.prototype, 'require').callThrough().withArgs('sharp');

const missingModule = () =>
  new errors.InternalServerError({
    message: "Cannot find module 'sharp'",
    code: 'MODULE_NOT_FOUND',
  });

const hasErrorCode = (err: unknown, ErrorClass: typeof errors.InternalServerError, code: string) =>
  err instanceof ErrorClass && err.code === code;

describe('Transform', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('canTransformFiles', function () {
    it('returns true when sharp is available', function () {
      assert.equal(transform.canTransformFiles(), true);
    });

    it('returns false when sharp is not available', function () {
      stubSharpRequire().throws(missingModule());
      assert.equal(transform.canTransformFiles(), false);
    });
  });

  describe('canTransformFileExtension', function () {
    it('returns true for ".gif"', function () {
      assert.equal(transform.canTransformFileExtension('.gif'), true);
    });
    it('returns true for ".svg"', function () {
      assert.equal(transform.canTransformFileExtension('.svg'), true);
    });
    it('returns true for ".svgz"', function () {
      assert.equal(transform.canTransformFileExtension('.svgz'), true);
    });
    it('returns false for ".ico"', function () {
      assert.equal(transform.canTransformFileExtension('.ico'), false);
    });
  });

  describe('shouldResizeFileExtension', function () {
    it('returns true for ".gif"', function () {
      assert.equal(transform.shouldResizeFileExtension('.gif'), true);
    });
    it('returns false for ".svg"', function () {
      assert.equal(transform.shouldResizeFileExtension('.svg'), false);
    });
    it('returns false for ".svgz"', function () {
      assert.equal(transform.shouldResizeFileExtension('.svgz'), false);
    });
    it('returns false for ".ico"', function () {
      assert.equal(transform.shouldResizeFileExtension('.ico'), false);
    });
  });

  describe('canTransformToFormat', function () {
    it('returns true for supported formats', function () {
      for (const format of ['gif', 'jpeg', 'jpg', 'png', 'webp', 'avif']) {
        assert.equal(transform.canTransformToFormat(format), true, `expected true for "${format}"`);
      }
    });

    it('returns false for unsupported formats', function () {
      for (const format of ['ico', 'bmp', 'tiff', 'svg', '']) {
        assert.equal(
          transform.canTransformToFormat(format),
          false,
          `expected false for "${format}"`,
        );
      }
    });
  });

  describe('cases', function () {
    const original = Buffer.from('original');
    const paths = { in: 'in.jpg', out: 'out.jpg' };

    let sharpInstance: {
      resize: sinon.SinonStub;
      rotate: sinon.SinonStub;
      toBuffer: sinon.SinonStub;
      jpeg: sinon.SinonStub;
      toFormat: sinon.SinonStub;
      metadata: sinon.SinonStub;
      timeout: sinon.SinonStub;
    };
    let writeFile: sinon.SinonStub;

    beforeEach(function () {
      sinon.stub(fs, 'readFile').resolves(original);
      writeFile = sinon.stub(fs, 'writeFile').resolves();

      sharpInstance = {
        resize: sinon.stub().returnsThis(),
        rotate: sinon.stub().returnsThis(),
        toBuffer: sinon.stub(),
        jpeg: sinon.stub().returnsThis(),
        toFormat: sinon.stub().returnsThis(),
        metadata: sinon.stub().resolves({ format: 'test' }),
        timeout: sinon.stub().returnsThis(),
      };

      const sharp = Object.assign(sinon.stub().returns(sharpInstance), {
        cache: sinon.stub(),
        concurrency: sinon.stub(),
      });

      stubSharpRequire().returns(sharp);
    });

    it('resize image', async function () {
      sharpInstance.toBuffer.resolves(Buffer.from('small'));

      await transform.resizeFromPath({ ...paths, width: 1000 });

      sinon.assert.calledOnce(sharpInstance.resize);
      sinon.assert.calledOnce(sharpInstance.rotate);
      sinon.assert.calledOnceWithExactly(writeFile, 'out.jpg', Buffer.from('small'));
    });

    it('skip resizing if image is too small', async function () {
      sharpInstance.toBuffer.resolves(Buffer.from('small'));

      await transform.resizeFromPath({ ...paths, width: 1000 });

      sinon.assert.calledOnceWithExactly(sharpInstance.resize, 1000, undefined, {
        withoutEnlargement: true,
      });
    });

    it('uses original image as an output when the size (bytes) is bigger after manipulation', async function () {
      sharpInstance.toBuffer.resolves(
        Buffer.from('manipulated to a very very very very very very very large size'),
      );

      await transform.resizeFromPath({ ...paths, width: 1000 });

      sinon.assert.calledOnce(sharpInstance.toBuffer);
      sinon.assert.calledOnceWithExactly(writeFile, 'out.jpg', original);
    });

    it('re-encodes JPEGs with mozjpeg', async function () {
      sharpInstance.metadata.resolves({ format: 'jpeg' });
      sharpInstance.toBuffer.resolves(Buffer.from('small'));

      await transform.resizeFromBuffer(original);

      sinon.assert.calledOnceWithExactly(sharpInstance.jpeg, { mozjpeg: true });
    });

    it('converts to a requested format', async function () {
      const large = Buffer.from('manipulated to a very very very very very very very large size');
      sharpInstance.toBuffer.resolves(large);

      // A requested format is returned even when it's larger
      assert.equal(await transform.resizeFromBuffer(original, { format: 'jpg' }), large);
      sinon.assert.calledOnceWithExactly(sharpInstance.toFormat, 'jpeg');

      await transform.resizeFromBuffer(original, { format: 'jpeg' });
      sinon.assert.calledOnceWithExactly(sharpInstance.jpeg, { mozjpeg: true });
    });

    it('wraps processing errors', async function () {
      sharpInstance.toBuffer.resolves(Buffer.from('small'));
      writeFile.rejects(new errors.InternalServerError({ message: 'whoops' }));

      await assert.rejects(transform.resizeFromPath({ ...paths, width: 2000 }), (err) =>
        hasErrorCode(err, errors.InternalServerError, 'IMAGE_PROCESSING'),
      );
    });

    it('uses the default processing timeout when resizing an image', async function () {
      sharpInstance.toBuffer.resolves(Buffer.from('small'));

      await transform.resizeFromPath({ ...paths, width: 1000 });

      sinon.assert.calledOnceWithExactly(sharpInstance.timeout, {
        seconds: transform.DEFAULT_PROCESSING_TIMEOUT_SECONDS,
      });
    });

    it('uses the provided processing timeout when resizing an image', async function () {
      sharpInstance.toBuffer.resolves(Buffer.from('small'));

      await transform.resizeFromPath({ ...paths, width: 1000, timeout: 10 });

      sinon.assert.calledOnceWithExactly(sharpInstance.timeout, { seconds: 10 });
    });
  });

  describe('installation', function () {
    it('sharp was not installed', async function () {
      stubSharpRequire().throws(missingModule());

      await assert.rejects(transform.resizeFromPath({ in: 'in.jpg', out: 'out.jpg' }), (err) =>
        hasErrorCode(err, errors.InternalServerError, 'SHARP_INSTALLATION'),
      );
    });
  });

  describe('generateOriginalImageName', function () {
    it('correctly adds suffix', function () {
      assert.equal(transform.generateOriginalImageName('test.jpg'), 'test_o.jpg');
      assert.equal(
        transform.generateOriginalImageName('content/images/test.jpg'),
        'content/images/test_o.jpg',
      );
      assert.equal(
        transform.generateOriginalImageName('content/images/test_o.jpg'),
        'content/images/test_o_o.jpg',
      );
      assert.equal(
        transform.generateOriginalImageName('content/images/test-1.jpg'),
        'content/images/test-1_o.jpg',
      );
    });
  });
});
