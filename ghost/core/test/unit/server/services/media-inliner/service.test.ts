import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';

// Required rather than imported so the stub lands on the same module instance
// the service requires
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');

const readFixture = (fixture: string) =>
  fs.readFileSync(path.join(__dirname, '../../../../utils/fixtures/images', fixture));

describe('media-inliner service', function () {
  const imageStorage = { type: 'images' };
  const mediaStorage = { type: 'media' };
  const fileStorage = { type: 'files' };

  let getMediaStorage: (extension: string, fileBuffer: Buffer) => Promise<unknown>;

  beforeEach(async function () {
    const storages: Record<string, unknown> = {
      'storage:images': imageStorage,
      'storage:media': mediaStorage,
      'storage:files': fileStorage,
    };
    sinon.stub(adapterManager, 'getAdapter').callsFake((name) => storages[name as string]);

    await mediaInlinerService.init();
    getMediaStorage = mediaInlinerService.getInstance().getMediaStorage;
  });

  afterEach(function () {
    sinon.restore();
  });

  it('stores images whose contents are an allowed image format', async function () {
    assert.equal(await getMediaStorage('.jpg', readFixture('ghosticon.jpg')), imageStorage);
    assert.equal(await getMediaStorage('.png', readFixture('ghost-logo.png')), imageStorage);
  });

  it('does not store images whose contents are not an allowed image format', async function () {
    assert.equal(await getMediaStorage('.jpg', readFixture('ghosticon.avif')), null);
    assert.equal(await getMediaStorage('.gif', Buffer.from('not an image')), null);
  });

  it('stores SVGs as images', async function () {
    assert.equal(await getMediaStorage('.svg', readFixture('ghost-logo.svg')), imageStorage);
  });

  it('picks media and file storage by extension', async function () {
    assert.equal(await getMediaStorage('.mp4', Buffer.from('')), mediaStorage);
    assert.equal(await getMediaStorage('.pdf', Buffer.from('')), fileStorage);
    assert.equal(await getMediaStorage('.exe', Buffer.from('')), null);
  });
});
