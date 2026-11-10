import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest';

const { ZipArchive } = require('archiver');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const configUtils = require('../../utils/config-utils');
const models = require('../../../core/server/models');
const adapterManager = require('../../../core/server/services/adapter-manager').default;
const urlUtils = require('../../../core/shared/url-utils').default;

// What a user sees of a site content import: the request is accepted, an email
// reports the outcome, and the content is there. Runs as production would, so
// the import is queued rather than run inline as it is under a testing env.
describe('Site content import', function () {
  let agent: any;
  let directory: string;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    await agent.loginAsOwner();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'site-import-e2e-'));
  });

  afterAll(async function () {
    await fs.remove(directory);
  });

  beforeEach(function () {
    configUtils.set('env', 'production');
    mockManager.mockMail();
  });

  afterEach(async function () {
    sinon.restore();
    mockManager.restore();
    await configUtils.restore();
  });

  function exportWithPost(slug: string, title: string) {
    return JSON.stringify({
      db: [
        {
          meta: { version: '5.0.0' },
          data: {
            posts: [{ title, slug, status: 'draft', html: `<p>${title}</p>` }],
          },
        },
      ],
    });
  }

  async function write(name: string, content: string) {
    const file = path.join(directory, name);
    await fs.writeFile(file, content);
    return file;
  }

  async function archive(name: string, entries: Record<string, string | Buffer>) {
    const file = path.join(directory, name);
    const zip = new ZipArchive();
    const written = pipeline(zip, fs.createWriteStream(file));
    for (const [entry, content] of Object.entries(entries)) {
      zip.append(content, { name: entry });
    }
    await Promise.all([zip.finalize(), written]);
    return file;
  }

  async function importFile(file: string) {
    await agent.post('db/').attach('importfile', file).expectStatus(200);
    await mockManager.assert.sentEmailEventually(
      { subject: 'Your content import has finished' },
      { timeout: 10000 },
    );
    mockManager.assert.sentEmailCount(1);
  }

  async function readStored(type: 'images' | 'media' | 'files', url: string) {
    const storage = adapterManager.getAdapter(`storage:${type}`);
    return storage.read({ path: storage.urlToPath(urlUtils.transformReadyToAbsolute(url)) });
  }

  async function findPost(slug: string) {
    const post = await models.Post.findOne({ slug }, { context: { internal: true } });
    assert.ok(post, `expected the import to create the post "${slug}"`);
    return post;
  }

  it('imports a JSON export', async function () {
    const slug = `json-export-${crypto.randomUUID()}`;
    await importFile(await write('export.json', exportWithPost(slug, 'From a JSON export')));

    const post = await findPost(slug);
    assert.equal(post.get('title'), 'From a JSON export');
  });

  it('imports a zip containing a JSON export', async function () {
    const slug = `zip-export-${crypto.randomUUID()}`;
    await importFile(
      await archive('export.zip', { 'content.json': exportWithPost(slug, 'From a zip') }),
    );

    const post = await findPost(slug);
    assert.equal(post.get('title'), 'From a zip');
  });

  it('imports a zip whose content sits under a base directory', async function () {
    const slug = `based-export-${crypto.randomUUID()}`;
    await importFile(
      await archive('export-with-base-dir.zip', {
        'export/content.json': exportWithPost(slug, 'From a zip with a base directory'),
      }),
    );

    const post = await findPost(slug);
    assert.equal(post.get('title'), 'From a zip with a base directory');
  });

  it('imports a zip containing an image referenced by a post', async function () {
    const slug = `image-export-${crypto.randomUUID()}`;
    const imageName = `${slug}.png`;
    const imageBytes = await fs.readFile(
      path.join(__dirname, '../../utils/fixtures/images/ghost-logo.png'),
    );
    const content = JSON.stringify({
      db: [
        {
          meta: { version: '5.0.0' },
          data: {
            posts: [{ title: 'With an image', slug, status: 'draft', feature_image: imageName }],
          },
        },
      ],
    });
    await importFile(
      await archive('with-image.zip', { 'content.json': content, [imageName]: imageBytes }),
    );

    const post = await findPost(slug);
    assert.match(post.get('feature_image'), new RegExp(`${slug}.*\\.png$`));
  });

  it('imports images from a site export into image storage', async function () {
    const slug = `site-export-image-${crypto.randomUUID()}`;
    const imagePath = `content/images/2026/11/${slug}.png`;
    const imageBytes = await fs.readFile(
      path.join(__dirname, '../../utils/fixtures/images/ghost-logo.png'),
    );
    const content = JSON.stringify({
      db: [
        {
          meta: { version: '5.0.0' },
          data: {
            posts: [
              { title: 'With an image', slug, status: 'draft', feature_image: `/${imagePath}` },
            ],
          },
        },
      ],
    });
    await importFile(
      await archive('site-export-image.zip', { 'export.json': content, [imagePath]: imageBytes }),
    );

    const post = await findPost(slug);
    const featureImage = post.get('feature_image');
    assert.match(featureImage, new RegExp(`/content/images/2026/11/${slug}.*\\.png$`));
    assert.deepEqual(await readStored('images', featureImage), imageBytes);
  });

  it('imports media and files from a site export into their own storage', async function () {
    const slug = `site-export-assets-${crypto.randomUUID()}`;
    const mediaPath = `content/media/2026/11/${slug}.mp4`;
    const filePath = `content/files/2026/11/${slug}.pdf`;
    const mediaBytes = await fs.readFile(
      path.join(__dirname, '../../utils/fixtures/media/sample_640x360.mp4'),
    );
    const fileBytes = await fs.readFile(
      path.join(__dirname, '../../utils/fixtures/files/test.pdf'),
    );
    const html = `<p><a href="/${mediaPath}">Video</a> <a href="/${filePath}">File</a></p>`;
    const content = JSON.stringify({
      db: [
        {
          meta: { version: '5.0.0' },
          data: { posts: [{ title: 'With assets', slug, status: 'draft', html }] },
        },
      ],
    });
    await importFile(
      await archive('site-export-assets.zip', {
        'export.json': content,
        [mediaPath]: mediaBytes,
        [filePath]: fileBytes,
      }),
    );

    const post = await findPost(slug);
    const mediaUrl = post.get('html').match(/[^"]*\/content\/media\/[^"]+\.mp4/)?.[0];
    const fileUrl = post.get('html').match(/[^"]*\/content\/files\/[^"]+\.pdf/)?.[0];
    assert.ok(mediaUrl, `expected a media URL in ${post.get('html')}`);
    assert.ok(fileUrl, `expected a file URL in ${post.get('html')}`);
    assert.deepEqual(await readStored('media', mediaUrl), mediaBytes);
    assert.deepEqual(await readStored('files', fileUrl), fileBytes);
  });
});
