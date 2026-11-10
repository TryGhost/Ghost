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

  it('imports a Ghost(Pro) self-serve site export zip', async function () {
    const slug = `site-export-${crypto.randomUUID()}`;
    const imageBytes = await fs.readFile(
      path.join(__dirname, '../../utils/fixtures/images/ghost-logo.png'),
    );
    // `/db/backup` output, beside the unzipped themes and settings the archive carries
    const content = JSON.stringify({
      meta: { version: '6.76.0' },
      data: {
        posts: [
          {
            title: 'From a site export',
            slug,
            status: 'draft',
            feature_image: `/content/images/2026/11/${slug}.png`,
          },
        ],
      },
    });
    await importFile(
      await archive('site-export.zip', {
        'content/themes/source/package.json': JSON.stringify({ name: 'source', version: '1.0.0' }),
        'content/themes/source/locales/en.json': JSON.stringify({ Hi: 'Hi', Bye: 'Bye' }),
        'content/themes/source/assets/logo.png': imageBytes,
        'content/data/redirects.json': JSON.stringify([
          { from: '/a/', to: '/b/' },
          { from: '/c/', to: '/d/' },
        ]),
        'content/settings/routes.yaml': 'routes: {}\n',
        [`content/images/2026/11/${slug}.png`]: imageBytes,
        'metadata.json': JSON.stringify({ exportId: 'abc', siteId: '1' }),
        'members.csv': 'email,name\nmember@example.com,Member\n',
        'post-analytics.csv': 'post_id,sends\n1,2\n',
        'export.json': content,
      }),
    );

    const post = await findPost(slug);
    assert.equal(post.get('title'), 'From a site export');
    assert.match(post.get('feature_image'), new RegExp(`/2026/11/${slug}.*\\.png$`));
  });
});
