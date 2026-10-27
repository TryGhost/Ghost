const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sinon = require('sinon');
const _ = require('lodash');
const logging = require('@tryghost/logging');

const ImageHandler = require('../../../../../../core/server/data/importer/handlers/image');
const adapterManager = require('../../../../../../core/server/services/adapter-manager').default;
const configUtils = require('../../../../../utils/config-utils');

const imageFixturePath = path.join(__dirname, '../../../../../utils/fixtures/images');

describe('ImageHandler', function () {
  const store = adapterManager.getAdapter('storage:images');
  let tmpDir;

  // Copies an image fixture into the extracted import at the given path
  const fixture = (name, fixtureName = 'ghosticon.jpg') => {
    const filePath = path.join(tmpDir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.copyFileSync(path.join(imageFixturePath, fixtureName), filePath);
    return filePath;
  };

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-image-import-'));
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has the correct interface', function () {
    assert.equal(ImageHandler.type, 'images');
    assert(Array.isArray(ImageHandler.extensions));
    assert.equal(ImageHandler.extensions.length, 8);
    assert(ImageHandler.extensions.includes('.jpg'));
    assert(ImageHandler.extensions.includes('.jpeg'));
    assert(ImageHandler.extensions.includes('.gif'));
    assert(ImageHandler.extensions.includes('.png'));
    assert(ImageHandler.extensions.includes('.svg'));
    assert(ImageHandler.extensions.includes('.svgz'));
    assert(ImageHandler.extensions.includes('.ico'));
    assert(ImageHandler.extensions.includes('.webp'));
    assert(Array.isArray(ImageHandler.contentTypes));
    assert.equal(ImageHandler.contentTypes.length, 7);
    assert(ImageHandler.contentTypes.includes('image/jpeg'));
    assert(ImageHandler.contentTypes.includes('image/png'));
    assert(ImageHandler.contentTypes.includes('image/gif'));
    assert(ImageHandler.contentTypes.includes('image/svg+xml'));
    assert(ImageHandler.contentTypes.includes('image/x-icon'));
    assert(ImageHandler.contentTypes.includes('image/vnd.microsoft.icon'));
    assert(ImageHandler.contentTypes.includes('image/webp'));
    assert.equal(typeof ImageHandler.loadFile, 'function');
  });

  it('can load a single file', async function () {
    const filename = 'test-image.jpeg';

    const file = [
      {
        path: fixture(filename),
        name: filename,
      },
    ];

    const storeSpy = sinon.spy(store, 'getUniqueFileName');

    await ImageHandler.loadFile(_.clone(file));
    sinon.assert.calledOnce(storeSpy);
    assert.equal(storeSpy.firstCall.args[0].originalPath, 'test-image.jpeg');
    assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
    assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/test-image.jpeg');
  });

  it('can load a single file, maintaining structure', async function () {
    const filename = 'photos/my-cat.jpeg';

    const file = [
      {
        path: fixture(filename),
        name: filename,
      },
    ];

    const storeSpy = sinon.spy(store, 'getUniqueFileName');

    await ImageHandler.loadFile(_.clone(file));
    sinon.assert.calledOnce(storeSpy);
    assert.equal(storeSpy.firstCall.args[0].originalPath, 'photos/my-cat.jpeg');
    assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images(\/|\\)photos$/);
    assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/photos/my-cat.jpeg');
  });

  it('can load a single file, removing ghost dirs', async function () {
    const filename = 'content/images/my-cat.jpeg';

    const file = [
      {
        path: fixture('content/images/' + filename),
        name: filename,
      },
    ];

    const storeSpy = sinon.spy(store, 'getUniqueFileName');

    await ImageHandler.loadFile(_.clone(file));
    sinon.assert.calledOnce(storeSpy);
    assert.equal(storeSpy.firstCall.args[0].originalPath, 'content/images/my-cat.jpeg');
    assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
    assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/my-cat.jpeg');
  });

  it('can load a file (subdirectory)', async function () {
    configUtils.set({ url: 'http://localhost:65535/subdir' });

    const filename = 'test-image.jpeg';

    const file = [
      {
        path: fixture(filename),
        name: filename,
      },
    ];

    const storeSpy = sinon.spy(store, 'getUniqueFileName');

    await ImageHandler.loadFile(_.clone(file));
    sinon.assert.calledOnce(storeSpy);
    assert.equal(storeSpy.firstCall.args[0].originalPath, 'test-image.jpeg');
    assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
    assert.equal(storeSpy.firstCall.args[0].newPath, '/subdir/content/images/test-image.jpeg');
  });

  it('can load multiple files', async function () {
    const files = [
      {
        path: fixture('testing.png', 'ghost-logo.png'),
        name: 'testing.png',
      },
      {
        path: fixture('photo/kitten.jpg'),
        name: 'photo/kitten.jpg',
      },
      {
        path: fixture('content/images/animated/bunny.gif', 'loadingcat.gif'),
        name: 'content/images/animated/bunny.gif',
      },
      {
        path: fixture('images/puppy.jpg'),
        name: 'images/puppy.jpg',
      },
    ];

    const storeSpy = sinon.spy(store, 'getUniqueFileName');

    await ImageHandler.loadFile(_.clone(files));
    sinon.assert.callCount(storeSpy, 4);
    assert.equal(storeSpy.firstCall.args[0].originalPath, 'testing.png');
    assert.match(storeSpy.firstCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
    assert.equal(storeSpy.firstCall.args[0].newPath, '/content/images/testing.png');
    assert.equal(storeSpy.secondCall.args[0].originalPath, 'photo/kitten.jpg');
    assert.match(storeSpy.secondCall.args[0].targetDir, /(\/|\\)content(\/|\\)images(\/|\\)photo$/);
    assert.equal(storeSpy.secondCall.args[0].newPath, '/content/images/photo/kitten.jpg');
    assert.equal(storeSpy.thirdCall.args[0].originalPath, 'content/images/animated/bunny.gif');
    assert.match(
      storeSpy.thirdCall.args[0].targetDir,
      /(\/|\\)content(\/|\\)images(\/|\\)animated$/,
    );
    assert.equal(storeSpy.thirdCall.args[0].newPath, '/content/images/animated/bunny.gif');
    assert.equal(storeSpy.lastCall.args[0].originalPath, 'images/puppy.jpg');
    assert.match(storeSpy.lastCall.args[0].targetDir, /(\/|\\)content(\/|\\)images$/);
    assert.equal(storeSpy.lastCall.args[0].newPath, '/content/images/puppy.jpg');
  });

  it('skips files whose contents are not an allowed image format', async function () {
    const warn = sinon.stub(logging, 'warn');
    const files = [
      { path: fixture('photo.jpg'), name: 'photo.jpg' },
      { path: fixture('avif.jpg', 'ghosticon.avif'), name: 'avif.jpg' },
      { path: fixture('text.png', 'svg-malformed.svg'), name: 'text.png' },
    ];

    const storeSpy = sinon.spy(store, 'getUniqueFileName');

    const loaded = await ImageHandler.loadFile(_.clone(files));
    assert.deepEqual(
      loaded.map((file) => file.originalPath),
      ['photo.jpg'],
    );
    sinon.assert.calledOnce(storeSpy);
    sinon.assert.calledTwice(warn);
  });

  it('sanitizes SVG files', async function () {
    const svgPath = fixture('unsafe.svg', 'svg-with-unsafe-script.svg');

    const loaded = await ImageHandler.loadFile([{ path: svgPath, name: 'unsafe.svg' }]);

    assert.equal(loaded.length, 1);
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /<script/);
  });

  it('skips SVG files that cannot be sanitized', async function () {
    const warn = sinon.stub(logging, 'warn');
    sinon.stub(logging, 'error');
    const svgPath = fixture('malformed.svg', 'svg-malformed.svg');

    const loaded = await ImageHandler.loadFile([{ path: svgPath, name: 'malformed.svg' }]);

    assert.deepEqual(loaded, []);
    sinon.assert.calledOnce(warn);
  });
});
