import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { sanitizeSvgFile } from '../../../../../core/server/lib/image/svg-sanitizer';

const fixturePath = (fixture: string) =>
  path.join(__dirname, '../../../../utils/fixtures/images', fixture);

describe('lib/image: svg-sanitizer', function () {
  describe('sanitizeSvgFile', function () {
    let tmpDir: string;

    const copyFixture = (fixture: string) => {
      const filePath = path.join(tmpDir, fixture);
      fs.copyFileSync(fixturePath(fixture), filePath);
      return filePath;
    };

    beforeEach(function () {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-svg-sanitizer-'));
    });

    afterEach(function () {
      sinon.restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('sanitizes an SVG file in place', async function () {
      const filePath = copyFixture('svg-with-unsafe-script.svg');

      assert.equal(await sanitizeSvgFile(filePath), true);

      const svg = fs.readFileSync(filePath, 'utf8');
      assert.match(svg, /<svg/);
      assert.doesNotMatch(svg, /<script/);
    });

    it('sanitizes an SVGZ file in place', async function () {
      const filePath = copyFixture('svgz-with-unsafe-script.svgz');

      assert.equal(await sanitizeSvgFile(filePath, true), true);

      const svg = zlib.gunzipSync(fs.readFileSync(filePath)).toString();
      assert.match(svg, /<svg/);
      assert.doesNotMatch(svg, /<script/);
    });

    it('returns false for SVGs that cannot be sanitized', async function () {
      assert.equal(await sanitizeSvgFile(copyFixture('svg-malformed.svg')), false);
    });

    it('does not touch files outside the temp directory', async function () {
      const error = sinon.stub(logging, 'error');
      const filePath = fixturePath('svg-with-unsafe-script.svg');
      const original = fs.readFileSync(filePath, 'utf8');

      assert.equal(await sanitizeSvgFile(filePath), false);
      assert.equal(await sanitizeSvgFile(path.join(os.tmpdir(), '..', 'file.svg')), false);

      assert.equal(fs.readFileSync(filePath, 'utf8'), original);
      sinon.assert.calledTwice(error);
    });
  });
});
