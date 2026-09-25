const upload = require('../../../../../../core/server/web/api/middleware/upload');
const validation = upload._test;
const imageFixturePath = '../../../../../utils/fixtures/images/';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const config = require('../../../../../../core/shared/config');

describe('web utils', function () {
  describe('checkFileExists', function () {
    it('should return true if file exists in input', function () {
      assert.equal(validation.checkFileExists({ mimetype: 'file', path: 'path' }), true);
    });

    it('should return false if file does not exist in input', function () {
      assert.equal(validation.checkFileExists({}), false);
    });

    it('should return false if file is incorrectly structured', function () {
      assert.equal(validation.checkFileExists({ type: 'file' }), false);
    });
  });

  describe('checkFileIsValid', function () {
    it('returns true if file has valid extension and type', function () {
      assert.equal(
        validation.checkFileIsValid(
          {
            name: 'test.txt',
            mimetype: 'text',
            ext: '.txt',
          },
          ['text'],
          ['.txt'],
        ),
        true,
      );

      assert.equal(
        validation.checkFileIsValid(
          {
            name: 'test.jpg',
            mimetype: 'jpeg',
            ext: '.jpg',
          },
          ['text', 'jpeg'],
          ['.txt', '.jpg'],
        ),
        true,
      );
    });

    it('returns false if file has invalid extension', function () {
      assert.equal(
        validation.checkFileIsValid({ name: 'test.txt', mimetype: 'text' }, ['text'], ['.tar']),
        false,
      );
      assert.equal(
        validation.checkFileIsValid({ name: 'test', mimetype: 'text' }, ['text'], ['.txt']),
        false,
      );
    });

    it('returns false if file has invalid type', function () {
      assert.equal(
        validation.checkFileIsValid({ name: 'test.txt', mimetype: 'text' }, ['archive'], ['.txt']),
        false,
      );
    });
  });

  describe('getCompressedSizeLimitError', function () {
    it('returns a structured theme upload size limit error', function () {
      const expectedLimit = config.get('theme:uploadLimits:compressedBytes');
      const expectedObserved = expectedLimit + 1;
      const err = validation.getCompressedSizeLimitError(
        { field: 'file' },
        {
          get: () => `${expectedObserved}`,
        },
      );

      assert.equal(err.errorType, 'UnsupportedMediaTypeError');
      assert.equal(err.message, 'Theme upload exceeds maximum compressed size.');
      assert.equal(err.context, 'Theme upload exceeds the maximum compressed size.');
      assert.equal(err.code, 'COMPRESSED_TOO_LARGE');
      assert.deepEqual(err.errorDetails, {
        observedBytes: expectedObserved,
        limitBytes: expectedLimit,
        fieldName: 'file',
      });
    });
  });

  describe('sanitizeSvgContent', function () {
    it('it removes <script> tags from SVGs', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-script.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      assert.ok(original.includes('<script'));

      const sanitized = validation.sanitizeSvgContent(original);
      assert.ok(!sanitized.includes('<script'), 'Sanitized SVG should not contain a <script> tag');
    });

    it('it removes <foreignObject> tags from SVGs', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-foreign-object.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      assert.ok(original.includes('<foreignObject'));

      const sanitized = validation.sanitizeSvgContent(original);
      assert.ok(
        !sanitized.includes('<foreignObject'),
        'Sanitized SVG should not contain a <foreignObject> tag',
      );
    });

    it('it removes <embed> tags from SVGs', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-embed.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      assert.ok(original.includes('<embed'));

      const sanitized = validation.sanitizeSvgContent(original);
      assert.ok(!sanitized.includes('<embed'), 'Sanitized SVG should not contain a <embed> tag');
    });

    it('it removes on* attributes from SVGs', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-onclick.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      assert.ok(original.includes('onclick'));

      const sanitized = validation.sanitizeSvgContent(original);
      assert.ok(
        !sanitized.includes('onclick'),
        'Sanitized SVG should not contain an onclick attribute',
      );
    });

    it('it removes href attributes from SVGs', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-href.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      assert.ok(original.includes('href'));

      const sanitized = validation.sanitizeSvgContent(original);
      assert.ok(!sanitized.includes('href'), 'Sanitized SVG should not contain an href attribute');
    });

    it('it removes xlink:href attributes from SVGs', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-xlink-href.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      assert.ok(original.includes('xlink:href'));

      const sanitized = validation.sanitizeSvgContent(original);
      assert.ok(
        !sanitized.includes('xlink:href'),
        'Sanitized SVG should not contain an xlink:href attribute',
      );
    });

    it('it returns null for malformed SVGs', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'svg-malformed.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      const sanitized = validation.sanitizeSvgContent(original);
      assert.equal(sanitized, null, 'Malformed SVG should return null after sanitization');
    });

    it('returns true for a safe svg file', async function () {
      const filepath = path.join(__dirname, imageFixturePath, 'ghost-logo.svg');
      const original = fs.readFileSync(filepath, 'utf8');

      assert.ok(!original.includes('<script'));
      assert.ok(!original.includes('onclick'));

      const sanitized = validation.sanitizeSvgContent(original);
      assert.ok(sanitized, 'Safe SVG should return a string after sanitization');
    });
  });

  describe('mediaValidation', function () {
    let tmpDir;

    beforeEach(function () {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-media-validation-'));
    });

    afterEach(function () {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    const runMediaValidation = async (thumbnailFixture, originalname = thumbnailFixture) => {
      const thumbnailPath = path.join(tmpDir, thumbnailFixture);
      fs.copyFileSync(path.join(__dirname, imageFixturePath, thumbnailFixture), thumbnailPath);

      const req = {
        files: {
          file: [{ originalname: 'video.mp4', mimetype: 'video/mp4', path: 'video.mp4' }],
          thumbnail: [{ originalname, mimetype: 'image/svg+xml', path: thumbnailPath }],
        },
      };
      const nextArgs = await new Promise((resolve) => {
        upload.mediaValidation({ type: 'media' })(req, {}, (...args) => resolve(args));
      });

      return { nextArgs, thumbnailPath };
    };

    it('sanitizes SVG thumbnails', async function () {
      const { nextArgs, thumbnailPath } = await runMediaValidation('svg-with-unsafe-script.svg');

      assert.deepEqual(nextArgs, []);
      const stored = fs.readFileSync(thumbnailPath, 'utf8');
      assert.ok(stored.includes('<svg'));
      assert.ok(!stored.includes('<script'), 'Stored thumbnail should not contain a <script> tag');
    });

    it('sanitizes thumbnails with an SVG content type and a non-SVG extension', async function () {
      const { nextArgs, thumbnailPath } = await runMediaValidation(
        'svg-with-unsafe-script.svg',
        'thumbnail.png',
      );

      assert.deepEqual(nextArgs, []);
      const stored = fs.readFileSync(thumbnailPath, 'utf8');
      assert.ok(!stored.includes('<script'), 'Stored thumbnail should not contain a <script> tag');
    });

    it('rejects non-SVG thumbnails with an SVG content type', async function () {
      const { nextArgs } = await runMediaValidation('ghost-logo.png');

      assert.equal(nextArgs[0].errorType, 'UnsupportedMediaTypeError');
      assert.equal(nextArgs[0].message, 'Please select a valid SVG image');
    });

    it('rejects SVG thumbnails that cannot be sanitized', async function () {
      const { nextArgs } = await runMediaValidation('svg-malformed.svg');

      assert.equal(nextArgs[0].errorType, 'UnsupportedMediaTypeError');
      assert.equal(nextArgs[0].message, 'Please select a valid SVG image');
    });
  });
});
