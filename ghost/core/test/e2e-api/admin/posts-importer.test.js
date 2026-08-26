const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const FormData = require('form-data');
const os = require('node:os');
const {
  agentProvider,
  fixtureManager,
  assertions,
  mockManager,
  resetRateLimits,
} = require('../../utils/e2e-framework');
const { cacheInvalidateHeaderNotSet } = assertions;
const path = require('path');
const models = require('../../../core/server/models');
const jobsService = require('../../../core/server/services/jobs');
const adapterManager = require('../../../core/server/services/adapter-manager').default;
const { compress } = require('@tryghost/zip');
const sinon = require('sinon');

const csvPath = path.join(__dirname, '../../utils/fixtures/csv/valid-posts-import.csv');

// Test CSVs are written inline to a temp dir rather than committed as fixtures.
let tmpDir;
const getImportedAssetPaths = () => [
  path.join(adapterManager.getAdapter('storage:images').storagePath, 'csv-zip-photo.jpg'),
  path.join(adapterManager.getAdapter('storage:media').storagePath, 'csv-zip-movie.mp4'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'csv-zip-guide.pdf'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'attachment.csv'),
  path.join(adapterManager.getAdapter('storage:images').storagePath, 'canonical-image.jpg'),
  path.join(adapterManager.getAdapter('storage:media').storagePath, 'canonical-media.mp4'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'canonical-file.pdf'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'rollback-partial-one.pdf'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'rollback-partial-two.pdf'),
  path.join(adapterManager.getAdapter('storage:images').storagePath, 'rollback-cross-image.jpg'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'rollback-cross-file.pdf'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'rollback-incomplete-one.pdf'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'rollback-incomplete-two.pdf'),
  path.join(adapterManager.getAdapter('storage:files').storagePath, 'over-cap-guide.pdf'),
];

const csvFile = async (name, content) => {
  const filePath = path.join(tmpDir, name);
  await fs.writeFile(filePath, content);
  return filePath;
};

const zipFile = async (name, files) => {
  const source = path.join(tmpDir, `${name}-contents`);
  await fs.mkdir(source, { recursive: true });
  for (const [fileName, content] of Object.entries(files)) {
    const filePath = path.join(source, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }
  const zipPath = path.join(tmpDir, name);
  await compress(source, zipPath);
  return zipPath;
};

describe('Posts Importer API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'posts-importer-'));
  });

  afterAll(async function () {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async function () {
    // Each test logs in as a different role — reset the login rate limiter
    // so the repeated logins don't trip spam prevention
    await resetRateLimits();
    await Promise.all(getImportedAssetPaths().map((filePath) => fs.rm(filePath, { force: true })));
  });

  afterEach(async function () {
    // Every accepted upload schedules a background import — drain it so a job
    // doesn't run on into another test (or another file on this fork's DB)
    await jobsService.allSettled();
    await Promise.all(getImportedAssetPaths().map((filePath) => fs.rm(filePath, { force: true })));
    mockManager.restore();
    sinon.restore();
  });

  it('Can upload a posts CSV as Owner', async function () {
    await agent.loginAsOwner();

    await agent
      .post('posts/upload/')
      .attach('postsfile', csvPath)
      .expectStatus(202)
      .expect(cacheInvalidateHeaderNotSet());
  });

  it('Keeps content import initialization idempotent and rejects invalid service requests', async function () {
    const contentImportService =
      await import('../../../core/server/services/content-import/index.ts?coverage-lifecycle');

    assert.throws(
      () => contentImportService.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' }),
      /Content import service used before init/,
    );
    contentImportService.init();
    contentImportService.init();

    assert.throws(
      () => contentImportService.importCSV({ filePath: '', fileName: '' }),
      (error) => {
        assert.equal(error.errorType, 'ValidationError');
        assert.match(error.message, /Too small/);
        return true;
      },
    );
    await assert.rejects(
      contentImportService.importCSV({
        filePath: path.join(tmpDir, 'missing.csv'),
        fileName: 'missing.csv',
      }),
      /The file could not be parsed as a CSV file/,
    );
  });

  it('Can upload a posts CSV as Administrator', async function () {
    await agent.loginAsAdmin();

    await agent
      .post('posts/upload/')
      .attach('postsfile', csvPath)
      .expectStatus(202)
      .expect(cacheInvalidateHeaderNotSet());
  });

  it('Imports the single mapped CSV inside a ZIP', async function () {
    await agent.loginAsOwner();

    const zipPath = await zipFile('mapped-posts.zip', {
      'export/posts.CSV': 'Headline,Body\nZIP mapping post,<p>Mapped from ZIP</p>\n',
      'export/content/files/attachment.csv': 'download,only\n',
    });
    const form = new FormData();
    form.append('mapping[Headline]', 'title');
    form.append('mapping[Body]', 'html');
    form.append('postsfile', await fs.readFile(zipPath), {
      filename: path.basename(zipPath),
      contentType: 'application/zip',
    });

    const { body } = await agent.post('posts/upload/').body(form).expectStatus(202);
    assert.equal(body.meta.total, 1);

    await jobsService.allSettled();
    const post = await models.Post.findOne({ title: 'ZIP mapping post', status: 'all' });
    assert.ok(post);
    assert.match(post.get('html'), /Mapped from ZIP/);
  });

  it('Stores and rewrites wrapped image, media, and file assets before importing posts', async function () {
    await agent.loginAsOwner();

    const csv =
      'title,html,markdown,feature_image,og_image,twitter_image\n' +
      'ZIP HTML assets,"<p><img src=""/content/images/csv-zip-photo.jpg""></p><a href=""/content/media/csv-zip-movie.mp4"">Media</a><a href=""/content/files/csv-zip-guide.pdf"">File</a>",,/content/images/csv-zip-photo.jpg,/content/images/csv-zip-photo.jpg,/content/images/csv-zip-photo.jpg\n' +
      'ZIP Markdown assets,,"![Image](/content/images/csv-zip-photo.jpg)\n\n[Media](/content/media/csv-zip-movie.mp4)\n\n[File](/content/files/csv-zip-guide.pdf)",,,\n' +
      'ZIP short asset path,"<p><img src=""/images/csv-zip-photo.jpg""></p>",,,,\n';
    const zipPath = await zipFile('posts-with-assets.zip', {
      'export/posts.csv': csv,
      'export/content/images/csv-zip-photo.jpg': 'image bytes',
      'export/content/media/csv-zip-movie.mp4': 'media bytes',
      'export/content/files/csv-zip-guide.pdf': 'file bytes',
    });

    const { body } = await agent
      .post('posts/upload/')
      .attach('postsfile', zipPath)
      .expectStatus(202);
    assert.equal(body.meta.total, 3);
    await jobsService.allSettled();

    for (const filePath of getImportedAssetPaths().slice(0, 3)) {
      assert.equal(await fs.stat(filePath).then(() => true), true, `${filePath} was stored`);
    }
    const htmlPost = await models.Post.findOne(
      { title: 'ZIP HTML assets', status: 'all' },
      { withRelated: ['posts_meta'] },
    );
    const markdownPost = await models.Post.findOne({
      title: 'ZIP Markdown assets',
      status: 'all',
    });
    const shortPathPost = await models.Post.findOne({
      title: 'ZIP short asset path',
      status: 'all',
    });
    assert.ok(htmlPost);
    assert.ok(markdownPost);
    assert.ok(shortPathPost);
    for (const assetPath of [
      '/content/images/csv-zip-photo.jpg',
      '/content/media/csv-zip-movie.mp4',
      '/content/files/csv-zip-guide.pdf',
    ]) {
      assert.match(htmlPost.get('html'), new RegExp(assetPath));
      assert.match(markdownPost.get('html'), new RegExp(assetPath));
    }
    assert.ok(htmlPost.get('feature_image').endsWith('/content/images/csv-zip-photo.jpg'));
    assert.ok(
      htmlPost.related('posts_meta').get('og_image').endsWith('/content/images/csv-zip-photo.jpg'),
    );
    assert.ok(
      htmlPost
        .related('posts_meta')
        .get('twitter_image')
        .endsWith('/content/images/csv-zip-photo.jpg'),
    );
    assert.match(shortPathPost.get('html'), /\/content\/images\/csv-zip-photo\.jpg/);
  });

  it('Rewrites canonical asset URLs for top-level ZIP asset directories', async function () {
    await agent.loginAsOwner();

    const csv =
      'title,html,feature_image,og_image,twitter_image\n' +
      'Canonical ZIP assets,"<p><img src=""__GHOST_URL__/content/images/canonical-image.jpg""></p><a href=""__GHOST_URL__/content/media/canonical-media.mp4"">Media</a><a href=""__GHOST_URL__/content/files/canonical-file.pdf"">File</a>",__GHOST_URL__/content/images/canonical-image.jpg,__GHOST_URL__/content/images/canonical-image.jpg,__GHOST_URL__/content/images/canonical-image.jpg\n';
    const zipPath = await zipFile('posts-with-canonical-assets.zip', {
      'posts.csv': csv,
      'images/canonical-image.jpg': 'image bytes',
      'media/canonical-media.mp4': 'media bytes',
      'files/canonical-file.pdf': 'file bytes',
    });

    const { body } = await agent
      .post('posts/upload/')
      .attach('postsfile', zipPath)
      .expectStatus(202);
    assert.equal(body.meta.total, 1);
    await jobsService.allSettled();

    for (const filePath of getImportedAssetPaths().slice(4, 7)) {
      assert.equal(await fs.stat(filePath).then(() => true), true, `${filePath} was stored`);
    }
    const post = await models.Post.findOne(
      { title: 'Canonical ZIP assets', status: 'all' },
      { withRelated: ['posts_meta'] },
    );
    assert.ok(post);
    for (const assetPath of [
      '/content/images/canonical-image.jpg',
      '/content/media/canonical-media.mp4',
      '/content/files/canonical-file.pdf',
    ]) {
      assert.match(post.get('html'), new RegExp(assetPath));
    }
    assert.doesNotMatch(post.get('html'), /\/content\/content\//);
    assert.ok(post.get('feature_image').endsWith('/content/images/canonical-image.jpg'));
    assert.ok(
      post.related('posts_meta').get('og_image').endsWith('/content/images/canonical-image.jpg'),
    );
    assert.ok(
      post
        .related('posts_meta')
        .get('twitter_image')
        .endsWith('/content/images/canonical-image.jpg'),
    );
  });

  it('Creates no posts when ZIP asset storage fails', async function () {
    await agent.loginAsOwner();
    sinon
      .stub(adapterManager.getAdapter('storage:files'), 'save')
      .rejects(new Error('storage unavailable'));
    const zipPath = await zipFile('posts-with-failed-assets.zip', {
      'posts.csv': 'title,html\nZIP failed assets,<p>Must not import</p>\n',
      'content/files/csv-zip-guide.pdf': 'file bytes',
    });

    await agent.post('posts/upload/').attach('postsfile', zipPath).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne({ title: 'ZIP failed assets', status: 'all' });
    assert.equal(post, null);
  });

  it('Rolls back a stored file when another file in the same group fails', async function () {
    await agent.loginAsOwner();
    const fileStorage = adapterManager.getAdapter('storage:files');
    const save = fileStorage.save.bind(fileStorage);
    let saveCount = 0;
    sinon.stub(fileStorage, 'save').callsFake(async (file, targetDir) => {
      saveCount += 1;
      if (saveCount === 2) {
        throw new Error('second file failed');
      }
      return save(file, targetDir);
    });
    const zipPath = await zipFile('posts-with-partial-file-failure.zip', {
      'posts.csv': 'title,html\nZIP partial file failure,<p>Must not import</p>\n',
      'content/files/rollback-partial-one.pdf': 'first file',
      'content/files/rollback-partial-two.pdf': 'second file',
    });

    await agent.post('posts/upload/').attach('postsfile', zipPath).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne({ title: 'ZIP partial file failure', status: 'all' });
    assert.equal(post, null);
    for (const filePath of getImportedAssetPaths().slice(7, 9)) {
      await assert.rejects(fs.stat(filePath), { code: 'ENOENT' });
    }
  });

  it('Rolls back a successful asset group when another group fails', async function () {
    await agent.loginAsOwner();
    sinon
      .stub(adapterManager.getAdapter('storage:files'), 'save')
      .rejects(new Error('file storage failed'));
    const zipPath = await zipFile('posts-with-cross-group-failure.zip', {
      'posts.csv': 'title,html\nZIP cross-group failure,<p>Must not import</p>\n',
      'content/images/rollback-cross-image.jpg': 'image bytes',
      'content/files/rollback-cross-file.pdf': 'file bytes',
    });

    await agent.post('posts/upload/').attach('postsfile', zipPath).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne({ title: 'ZIP cross-group failure', status: 'all' });
    assert.equal(post, null);
    for (const filePath of getImportedAssetPaths().slice(9, 11)) {
      await assert.rejects(fs.stat(filePath), { code: 'ENOENT' });
    }
  });

  it('Reports incomplete rollback without creating posts', async function () {
    await agent.loginAsOwner();
    const fileStorage = adapterManager.getAdapter('storage:files');
    const save = fileStorage.save.bind(fileStorage);
    let saveCount = 0;
    sinon.stub(fileStorage, 'save').callsFake(async (file, targetDir) => {
      saveCount += 1;
      if (saveCount === 2) {
        throw new Error('second file failed');
      }
      return save(file, targetDir);
    });
    sinon.stub(fileStorage, 'delete').rejects(new Error('rollback failed'));
    const zipPath = await zipFile('posts-with-incomplete-rollback.zip', {
      'posts.csv': 'title,html\nZIP incomplete rollback,<p>Must not import</p>\n',
      'content/files/rollback-incomplete-one.pdf': 'first file',
      'content/files/rollback-incomplete-two.pdf': 'second file',
    });

    await agent.post('posts/upload/').attach('postsfile', zipPath).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne({ title: 'ZIP incomplete rollback', status: 'all' });
    assert.equal(post, null);
    const storedFiles = await Promise.all(
      getImportedAssetPaths()
        .slice(11, 13)
        .map((filePath) =>
          fs.stat(filePath).then(
            () => true,
            () => false,
          ),
        ),
    );
    assert.equal(storedFiles.filter(Boolean).length, 1);
  });

  it('Rejects ZIPs with no data CSV, multiple data CSVs, or mixed data formats', async function () {
    await agent.loginAsOwner();

    const cases = [
      {
        name: 'no-data-csv.zip',
        files: {
          'ghost-import.json': '{}',
          'content/files/attachment.csv': 'download,only\n',
        },
        reason: /must contain one CSV file/,
      },
      {
        name: 'multiple-data-csv.zip',
        files: {
          'one.csv': 'title\nOne\n',
          'two.csv': 'title\nTwo\n',
        },
        reason: /only one CSV file/,
      },
      {
        name: 'mixed-data.zip',
        files: {
          'posts.csv': 'title\nMixed\n',
          'posts.json': '{}',
        },
        reason: /cannot contain CSV, JSON, or Markdown import files together/,
      },
      {
        name: 'no-importable-content.zip',
        files: {
          'readme.txt': 'Nothing to import',
        },
        status: 415,
        reason: /did not include any content to import/,
      },
      {
        name: 'nested-data-csv.zip',
        files: {
          'export/data/posts.csv': 'title\nNested\n',
        },
        status: 415,
        reason: /Invalid zip file structure/,
      },
      {
        name: 'split-wrapper.zip',
        files: {
          'export/posts.csv': 'title\nWrapped\n',
          'content/files/attachment.csv': 'download,only\n',
        },
        reason: /Invalid ZIP file structure/,
      },
      {
        name: 'malformed-csv.zip',
        files: {
          'posts.csv': 'title,html\nBroken quote,"<p>never closed\n',
        },
        reason: /could not be parsed as a CSV file/,
      },
      {
        name: 'deeply-nested-json.zip',
        files: {
          'posts.csv': 'title\nCSV post\n',
          'export/2024/ghost.json': '{}',
        },
        reason: /cannot contain CSV, JSON, or Markdown import files together/,
      },
      {
        name: 'deeply-nested-markdown.zip',
        files: {
          'posts.csv': 'title\nCSV post\n',
          'export/2024/posts.md': '# Markdown post',
        },
        reason: /cannot contain CSV, JSON, or Markdown import files together/,
      },
    ];

    for (const testCase of cases) {
      const zipPath = await zipFile(testCase.name, testCase.files);
      const { body } = await agent
        .post('posts/upload/')
        .attach('postsfile', zipPath)
        .expectStatus(testCase.status ?? 422);
      assert.match(body.errors[0].message, testCase.reason);
    }
  });

  it('Rejects a corrupt ZIP before scheduling an import', async function () {
    await agent.loginAsOwner();

    const { body } = await agent
      .post('posts/upload/')
      .attach('postsfile', path.join(__dirname, '../../utils/fixtures/import/zips/empty.zip'))
      .expectStatus(415);

    assert.match(body.errors[0].message, /uploaded zip could not be read/i);
  });

  it('Cannot upload a posts CSV as Editor', async function () {
    await agent.loginAsEditor();

    await agent.post('posts/upload/').attach('postsfile', csvPath).expectStatus(403);
  });

  it('Cannot upload a posts CSV as Author', async function () {
    await agent.loginAsAuthor();

    await agent.post('posts/upload/').attach('postsfile', csvPath).expectStatus(403);
  });

  it('Can upload a posts CSV as the Self-Serve Migration Integration', async function () {
    await agent.useSelfServeMigrationAdminAPIKey();

    await agent
      .post('posts/upload/')
      .attach('postsfile', csvPath)
      .expectStatus(202)
      .expect(cacheInvalidateHeaderNotSet());
  });

  it('Cannot upload a posts CSV as a regular Admin Integration', async function () {
    await agent.useZapierAdminAPIKey();

    await agent.post('posts/upload/').attach('postsfile', csvPath).expectStatus(403);
  });

  it('Cannot upload a posts CSV as Contributor', async function () {
    await agent.loginAsContributor();

    await agent.post('posts/upload/').attach('postsfile', csvPath).expectStatus(403);
  });

  it('Rejects an explicit mapping without a title target', async function () {
    await agent.loginAsOwner();

    const bodyOnlyCsvPath = await csvFile(
      'posts-import-body-only-mapping.csv',
      'Body\n<p>This mapping has no title target</p>\n',
    );
    const form = new FormData();
    form.append('mapping[Body]', 'html');
    form.append('postsfile', await fs.readFile(bodyOnlyCsvPath), {
      filename: path.basename(bodyOnlyCsvPath),
      contentType: 'text/csv',
    });

    const { body } = await agent.post('posts/upload/').body(form).expectStatus(422);

    assert.match(body.errors[0].message, /mapping must include "title"/);
  });

  it('Rejects unsafe, unknown, and duplicate field mappings', async function () {
    await agent.loginAsOwner();

    const mappedCsvPath = await csvFile(
      'posts-import-invalid-mappings.csv',
      'First,Second\nOne,Two\n',
    );
    const cases = [
      {
        mapping: { constructor: 'title' },
        reason: /Invalid CSV header mapping: "constructor"/,
      },
      {
        mapping: { First: 'title', Second: 'newsletter_id' },
        reason: /Unknown post field mapping: "newsletter_id"/,
      },
      {
        mapping: { First: 'title', Second: 'title' },
        reason: /Post field is mapped more than once: "title"/,
      },
    ];

    for (const { mapping, reason } of cases) {
      const form = new FormData();
      for (const [header, field] of Object.entries(mapping)) {
        form.append(`mapping[${header}]`, field);
      }
      form.append('postsfile', await fs.readFile(mappedCsvPath), {
        filename: path.basename(mappedCsvPath),
        contentType: 'text/csv',
      });

      const { body } = await agent.post('posts/upload/').body(form).expectStatus(422);
      assert.match(body.errors[0].message, reason);
    }
  });

  it('Imports each CSV row as a post with its content and publish date', async function () {
    await agent.loginAsOwner();

    const contentCsvPath = await csvFile(
      'valid-posts-import-content.csv',
      'title,html,published_at\n' +
        'Content check post one,"<p>First <strong>imported</strong> body</p>",2024-05-01T08:00:00.000Z\n' +
        '"Content check post two, with a comma","<p>Second body, with a comma</p>",2024-06-15T18:45:00.000Z\n',
    );

    const { body } = await agent
      .post('posts/upload/')
      .attach('postsfile', contentCsvPath)
      .expectStatus(202);

    assert.match(body.meta.import_id, /^[0-9a-f]{24}$/);
    assert.equal(body.meta.total, 2);

    await jobsService.allSettled();

    const { data: posts } = await models.Post.findPage({
      filter: `title:~'Content check post'`,
      status: 'all',
      limit: 'all',
      withRelated: ['tags', 'authors'],
    });

    assert.equal(posts.length, 2);

    const one = posts.find((post) => post.get('title') === 'Content check post one');
    const two = posts.find((post) => post.get('title') === 'Content check post two, with a comma');

    assert.ok(one, 'first row was imported');
    assert.ok(two, 'second row was imported');

    // Fields the CSV doesn't carry fall back to the import defaults
    const owner = await models.User.getOwnerUser();
    for (const post of [one, two]) {
      assert.equal(post.get('status'), 'published');
      assert.equal(post.get('type'), 'post');
      assert.equal(post.get('visibility'), 'public');
      assert.deepEqual(
        post.related('authors').map((author) => author.get('id')),
        [owner.get('id')],
        'the owner is the sole author',
      );
    }

    // Both rows share the same two internal batch tags: a date stamp and a run tag
    const tagsOne = one.related('tags').models;
    const tagsTwo = two.related('tags').models;
    assert.equal(tagsOne.length, 2);
    assert.match(tagsOne[0].get('name'), /^#Import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    assert.equal(tagsOne[1].get('name'), `#Import Run ${body.meta.import_id}`);
    for (const tag of tagsOne) {
      assert.equal(tag.get('visibility'), 'internal');
    }
    assert.deepEqual(
      tagsOne.map((tag) => tag.get('id')),
      tagsTwo.map((tag) => tag.get('id')),
      'shared tag rows, not new ones per post',
    );

    // html is rendered from the converted lexical, not passed through
    assert.match(one.get('html'), /First <strong>imported<\/strong> body/);
    assert.match(two.get('html'), /Second body, with a comma/);

    assert.equal(one.get('published_at').toISOString(), '2024-05-01T08:00:00.000Z');
    assert.equal(two.get('published_at').toISOString(), '2024-06-15T18:45:00.000Z');

    // Slugs come from the importer's own slugify: the model's importing-context
    // pass would keep the comma's double dash
    assert.equal(one.get('slug'), 'content-check-post-one');
    assert.equal(two.get('slug'), 'content-check-post-two-with-a-comma');

    // created_at/updated_at follow the CSV date because the write runs under
    // options.importing
    assert.equal(one.get('created_at').toISOString(), '2024-05-01T08:00:00.000Z');
    assert.equal(one.get('updated_at').toISOString(), '2024-05-01T08:00:00.000Z');
    assert.equal(two.get('created_at').toISOString(), '2024-06-15T18:45:00.000Z');
    assert.equal(two.get('updated_at').toISOString(), '2024-06-15T18:45:00.000Z');
  });

  it('Skips existing post slugs when the same CSV is imported again', async function () {
    await agent.loginAsOwner();

    const duplicateCsvPath = await csvFile(
      'posts-import-deduplication.csv',
      'title,slug,html\n' +
        'CSV deduplication check,csv-deduplication-check,<p>Only one copy</p>\n',
    );

    await agent.post('posts/upload/').attach('postsfile', duplicateCsvPath).expectStatus(202);
    await jobsService.allSettled();
    await agent.post('posts/upload/').attach('postsfile', duplicateCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const { data: posts } = await models.Post.findPage({
      filter: "slug:'csv-deduplication-check'",
      status: 'all',
      limit: 'all',
    });

    assert.equal(posts.length, 1);
    assert.equal(posts[0].get('title'), 'CSV deduplication check');
    assert.match(posts[0].get('html'), /Only one copy/);
  });

  it('Matches explicit CSV source IDs before falling back to slugs', async function () {
    await agent.loginAsOwner();

    const originalCsvPath = await csvFile(
      'posts-import-source-id-original.csv',
      'title,slug,comment_id\n' +
        'CSV source ID original,csv-source-id-original,m5-source-id-primary\n',
    );
    await agent.post('posts/upload/').attach('postsfile', originalCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const comparisonCsvPath = await csvFile(
      'posts-import-source-id-comparisons.csv',
      'Headline,Address,Source\n' +
        'CSV source ID duplicate,csv-source-id-different,m5-source-id-primary\n' +
        'CSV source ID slug fallback,csv-source-id-original,m5-source-id-unmatched\n' +
        `CSV source ID too long,csv-source-id-too-long,${'x'.repeat(51)}\n` +
        'CSV source ID distinct,csv-source-id-distinct,m5-source-id-distinct\n',
    );
    const form = new FormData();
    form.append('mapping[Headline]', 'title');
    form.append('mapping[Address]', 'slug');
    form.append('mapping[Source]', 'comment_id');
    form.append('postsfile', await fs.readFile(comparisonCsvPath), {
      filename: path.basename(comparisonCsvPath),
      contentType: 'text/csv',
    });
    await agent.post('posts/upload/').body(form).expectStatus(202);
    await jobsService.allSettled();

    const original = await models.Post.findOne({ slug: 'csv-source-id-original', status: 'all' });
    const sourceDuplicate = await models.Post.findOne({
      slug: 'csv-source-id-different',
      status: 'all',
    });
    const tooLong = await models.Post.findOne({
      slug: 'csv-source-id-too-long',
      status: 'all',
    });
    const distinct = await models.Post.findOne({ slug: 'csv-source-id-distinct', status: 'all' });

    assert.ok(original);
    assert.equal(original.get('title'), 'CSV source ID original');
    assert.equal(original.get('comment_id'), 'm5-source-id-primary');
    assert.equal(sourceDuplicate, null, 'the source ID match takes precedence over its new slug');
    assert.equal(tooLong, null, 'an invalid source ID skips only its row');
    assert.ok(distinct, 'a valid row after the invalid source ID is still imported');
    assert.equal(distinct.get('comment_id'), 'm5-source-id-distinct');
  });

  it('Updates matching posts only when the CSV has a newer explicit updated_at', async function () {
    await agent.loginAsOwner();

    const originalCsvPath = await csvFile(
      'posts-import-update-originals.csv',
      'title,slug,comment_id,updated_at\n' +
        'CSV update original,csv-update-original,m5-update-source,2025-01-01T00:00:00.000Z\n' +
        'CSV update slug original,csv-update-by-slug,,2025-01-01T00:00:00.000Z\n',
    );
    await agent.post('posts/upload/').attach('postsfile', originalCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const updatesCsvPath = await csvFile(
      'posts-import-update-comparisons.csv',
      'title,slug,comment_id,updated_at\n' +
        'CSV update newer,csv-update-newer,m5-update-source,2025-02-01T00:00:00.000Z\n' +
        'CSV update equal,csv-update-equal,m5-update-source,2025-02-01T01:00:00.000+01:00\n' +
        'CSV update older,csv-update-older,m5-update-source,2025-01-31T23:59:59.999Z\n' +
        'CSV update by slug,csv-update-by-slug,,2025-03-01T00:00:00.000Z\n' +
        'CSV update invalid date,csv-update-invalid-date,,not-a-date\n' +
        'CSV update after invalid,csv-update-after-invalid,,2025-04-01T00:00:00.000Z\n',
    );
    await agent.post('posts/upload/').attach('postsfile', updatesCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const newer = await models.Post.findOne({
      comment_id: 'm5-update-source',
      status: 'all',
    });
    const updatedBySlug = await models.Post.findOne({
      slug: 'csv-update-by-slug',
      status: 'all',
    });
    const invalid = await models.Post.findOne({ slug: 'csv-update-invalid-date', status: 'all' });
    const afterInvalid = await models.Post.findOne({
      slug: 'csv-update-after-invalid',
      status: 'all',
    });

    assert.ok(newer);
    assert.equal(newer.get('updated_at').toISOString(), '2025-02-01T00:00:00.000Z');
    assert.equal(newer.get('title'), 'CSV update newer');
    assert.ok(updatedBySlug);
    assert.equal(updatedBySlug.get('title'), 'CSV update by slug');
    assert.equal(updatedBySlug.get('updated_at').toISOString(), '2025-03-01T00:00:00.000Z');
    assert.equal(invalid, null, 'an invalid updated_at skips only its row');
    assert.ok(afterInvalid, 'a valid row after the invalid date is still imported');
  });

  it('Imports public posts even when the site default visibility is paid', async function () {
    mockManager.mockSetting('default_content_visibility', 'paid');
    await agent.loginAsOwner();

    const paidSiteCsvPath = await csvFile(
      'posts-import-paid-site.csv',
      'title,html,published_at\n' + 'Visibility check post,<p>Body</p>,2024-04-01T00:00:00.000Z\n',
    );

    await agent.post('posts/upload/').attach('postsfile', paidSiteCsvPath).expectStatus(202);

    await jobsService.allSettled();

    const post = await models.Post.findOne({ title: 'Visibility check post', status: 'all' });
    // left to the model, visibility would have followed default_content_visibility
    assert.equal(post.get('visibility'), 'public');
  });

  it('Imports arbitrarily headed CSV fields across every editorial category', async function () {
    await agent.loginAsOwner();

    const fullCsvPath = await csvFile(
      'posts-import-full-fields.csv',
      'Headline,Body,Address,Kind,State,Audience,Hero,Show title,Search title,Social copy,Template,Created,Published\n' +
        'Mapped field post,"<p>Mapped body</p>",Custom Address,page,draft,members,1,0,Mapped SEO title,Mapped social description,wide,2024-01-02T00:00:00.000Z,2024-02-03T00:00:00.000Z\n',
    );

    const form = new FormData();
    for (const [header, field] of Object.entries({
      Headline: 'title',
      Body: 'html',
      Address: 'slug',
      Kind: 'type',
      State: 'status',
      Audience: 'visibility',
      Hero: 'featured',
      'Show title': 'show_title_and_feature_image',
      'Search title': 'meta_title',
      'Social copy': 'twitter_description',
      Template: 'custom_template',
      Created: 'created_at',
      Published: 'published_at',
    })) {
      form.append(`mapping[${header}]`, field);
    }
    form.append('postsfile', await fs.readFile(fullCsvPath), {
      filename: path.basename(fullCsvPath),
      contentType: 'text/csv',
    });

    await agent.post('posts/upload/').body(form).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne(
      { title: 'Mapped field post', status: 'all' },
      { withRelated: ['posts_meta'] },
    );
    assert.ok(post);
    assert.equal(post.get('slug'), 'custom-address');
    assert.equal(post.get('type'), 'page');
    assert.equal(post.get('status'), 'draft');
    assert.equal(post.get('visibility'), 'members');
    assert.equal(post.get('featured'), true);
    assert.equal(post.get('show_title_and_feature_image'), false);
    assert.equal(post.get('custom_template'), 'wide');
    assert.equal(post.get('created_at').toISOString(), '2024-01-02T00:00:00.000Z');
    assert.equal(post.get('published_at').toISOString(), '2024-02-03T00:00:00.000Z');
    assert.equal(post.get('updated_at').toISOString(), '2024-02-03T00:00:00.000Z');
    assert.equal(post.related('posts_meta').get('meta_title'), 'Mapped SEO title');
    assert.equal(
      post.related('posts_meta').get('twitter_description'),
      'Mapped social description',
    );
    assert.match(post.get('html'), /Mapped body/);
  });

  it('Reconciles mapped CSV authors and tags with existing records', async function () {
    await agent.loginAsOwner();

    const emailAuthor = fixtureManager.get('users', 1);
    const nameAuthor = fixtureManager.get('users', 3);
    const tagOptions = { context: { internal: true } };
    const exactTag = await models.Tag.add(
      { name: 'CSV exact relation', slug: 'csv-exact-relation-stored' },
      tagOptions,
    );
    const explicitSlugTag = await models.Tag.add(
      { name: 'Stored explicit relation', slug: 'csv-explicit-relation' },
      tagOptions,
    );
    const normalizedSlugTag = await models.Tag.add(
      { name: 'Stored normalized relation', slug: 'csv-normalized-relation' },
      tagOptions,
    );
    const relationsCsvPath = await csvFile(
      'posts-import-existing-relations.csv',
      'Headline,Bylines,Emails,Topics\n' +
        `CSV existing relations,"${emailAuthor.name}, ${nameAuthor.name}, ${emailAuthor.name}","${emailAuthor.email.toUpperCase()}, , ${emailAuthor.email}","CSV exact relation,csv-explicit-relation,CSV normalized relation,CSV exact relation"\n`,
    );
    const form = new FormData();
    for (const [header, field] of Object.entries({
      Headline: 'title',
      Bylines: 'authors',
      Emails: 'author_emails',
      Topics: 'tags',
    })) {
      form.append(`mapping[${header}]`, field);
    }
    form.append('postsfile', await fs.readFile(relationsCsvPath), {
      filename: path.basename(relationsCsvPath),
      contentType: 'text/csv',
    });

    await agent.post('posts/upload/').body(form).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne(
      { title: 'CSV existing relations', status: 'all' },
      { withRelated: ['authors', 'tags'] },
    );
    assert.ok(post);
    assert.deepEqual(
      post.related('authors').map((author) => author.id),
      [emailAuthor.id, nameAuthor.id],
      'email and name-only matches retain source order and remove duplicates',
    );
    const importedTags = post.related('tags').models;
    assert.deepEqual(
      importedTags.slice(0, 3).map((tag) => tag.id),
      [exactTag.id, explicitSlugTag.id, normalizedSlugTag.id],
      'exact names, explicit slugs, and normalized slugs retain source order',
    );
    assert.equal(importedTags.length, 5);
    assert.match(importedTags[3].get('name'), /^#Import /);
    assert.match(importedTags[4].get('name'), /^#Import Run /);
  });

  it('Creates missing CSV authors as locked Contributors and falls back to Owner', async function () {
    await agent.loginAsOwner();

    const authorsCsvPath = await csvFile(
      'posts-import-new-authors.csv',
      'title,authors,author_emails\n' +
        'CSV created contributor,"New CSV Contributor, New CSV Contributor","new-csv-contributor@example.com, new-csv-contributor@example.com"\n' +
        'CSV missing author email,Missing CSV Email,\n' +
        'CSV invalid author email,Invalid CSV Email,not-an-email\n',
    );

    await agent.post('posts/upload/').attach('postsfile', authorsCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const contributor = await models.User.findOne(
      { email: 'new-csv-contributor@example.com', status: 'all' },
      { withRelated: ['roles'] },
    );
    assert.ok(contributor);
    assert.equal(contributor.get('status'), 'locked');
    assert.deepEqual(
      contributor.related('roles').map((role) => role.get('name')),
      ['Contributor'],
    );

    const owner = await models.User.getOwnerUser();
    const createdPost = await models.Post.findOne(
      { title: 'CSV created contributor', status: 'all' },
      { withRelated: ['authors'] },
    );
    const missingEmailPost = await models.Post.findOne(
      { title: 'CSV missing author email', status: 'all' },
      { withRelated: ['authors'] },
    );
    const invalidEmailPost = await models.Post.findOne(
      { title: 'CSV invalid author email', status: 'all' },
      { withRelated: ['authors'] },
    );
    assert.deepEqual(
      createdPost.related('authors').map((author) => author.id),
      [contributor.id],
      'duplicate author inputs create and attach one Contributor',
    );
    for (const post of [missingEmailPost, invalidEmailPost]) {
      assert.deepEqual(
        post.related('authors').map((author) => author.id),
        [owner.id],
      );
    }
    assert.equal(await models.User.findOne({ slug: 'missing-csv-email', status: 'all' }), null);
    assert.equal(await models.User.findOne({ slug: 'invalid-csv-email', status: 'all' }), null);
  });

  it('Rolls back a newly created Contributor when the post model fails', async function () {
    await agent.loginAsOwner();
    sinon.stub(models.Post, 'add').rejects(new Error('post model failed'));
    const authorsCsvPath = await csvFile(
      'posts-import-author-rollback.csv',
      'title,authors,author_emails\n' +
        'CSV contributor rollback,Rollback Contributor,csv-rollback-contributor@example.com\n',
    );

    await agent.post('posts/upload/').attach('postsfile', authorsCsvPath).expectStatus(202);
    await jobsService.allSettled();

    assert.equal(
      await models.User.findOne({ email: 'csv-rollback-contributor@example.com', status: 'all' }),
      null,
    );
    assert.equal(
      await models.Post.findOne({ title: 'CSV contributor rollback', status: 'all' }),
      null,
    );
  });

  it('Creates missing CSV tags once and preserves their order and visibility', async function () {
    await agent.loginAsOwner();

    const firstCsvPath = await csvFile(
      'posts-import-new-tags.csv',
      'title,tags\n' +
        'CSV created tags one,"New CSV Tag,#CSV Internal Tag,New CSV Tag"\n' +
        'CSV created tags two,"#CSV Internal Tag,New CSV Tag"\n',
    );
    await agent.post('posts/upload/').attach('postsfile', firstCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const secondCsvPath = await csvFile(
      'posts-import-reused-tags.csv',
      'title,tags\nCSV reused tags,New CSV Tag\n',
    );
    await agent.post('posts/upload/').attach('postsfile', secondCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const publicTags = await models.Tag.findAll({ filter: "name:'New CSV Tag'" });
    const internalTags = await models.Tag.findAll({ filter: "name:'#CSV Internal Tag'" });
    assert.equal(publicTags.length, 1, 'later rows and imports reuse the created public tag');
    assert.equal(internalTags.length, 1, 'duplicate inputs create one internal tag');
    const publicTag = publicTags.at(0);
    const internalTag = internalTags.at(0);
    assert.equal(publicTag.get('visibility'), 'public');
    assert.equal(internalTag.get('visibility'), 'internal');

    const firstPost = await models.Post.findOne(
      { title: 'CSV created tags one', status: 'all' },
      { withRelated: ['tags'] },
    );
    const secondPost = await models.Post.findOne(
      { title: 'CSV created tags two', status: 'all' },
      { withRelated: ['tags'] },
    );
    const reusedPost = await models.Post.findOne(
      { title: 'CSV reused tags', status: 'all' },
      { withRelated: ['tags'] },
    );
    assert.deepEqual(
      firstPost
        .related('tags')
        .models.slice(0, 2)
        .map((tag) => tag.id),
      [publicTag.id, internalTag.id],
    );
    assert.deepEqual(
      secondPost
        .related('tags')
        .models.slice(0, 2)
        .map((tag) => tag.id),
      [internalTag.id, publicTag.id],
    );
    assert.equal(firstPost.related('tags').length, 4, 'the two batch tags remain attached');
    assert.equal(secondPost.related('tags').length, 4, 'the two batch tags remain attached');
    assert.deepEqual(
      reusedPost
        .related('tags')
        .models.slice(0, 1)
        .map((tag) => tag.id),
      [publicTag.id],
    );
    assert.equal(reusedPost.related('tags').length, 3, 'a later import gets its own batch tags');
  });

  it('Rolls back a newly created tag when the post model fails', async function () {
    await agent.loginAsOwner();
    sinon.stub(models.Post, 'add').rejects(new Error('post model failed'));
    const tagsCsvPath = await csvFile(
      'posts-import-tag-rollback.csv',
      'title,tags\nCSV tag rollback,CSV Rollback Tag\n',
    );

    await agent.post('posts/upload/').attach('postsfile', tagsCsvPath).expectStatus(202);
    await jobsService.allSettled();

    assert.equal(await models.Tag.findOne({ name: 'CSV Rollback Tag' }), null);
    assert.equal(await models.Post.findOne({ title: 'CSV tag rollback', status: 'all' }), null);
  });

  it('Renders a mapped Markdown column through the post content converter', async function () {
    await agent.loginAsOwner();

    const markdownCsvPath = await csvFile(
      'posts-import-markdown.csv',
      'Headline,Source\n' + 'Markdown field post,"## Imported heading with **strong text**"\n',
    );
    const form = new FormData();
    form.append('mapping[Headline]', 'title');
    form.append('mapping[Source]', 'markdown');
    form.append('postsfile', await fs.readFile(markdownCsvPath), {
      filename: path.basename(markdownCsvPath),
      contentType: 'text/csv',
    });

    await agent.post('posts/upload/').body(form).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne({ title: 'Markdown field post', status: 'all' });
    assert.ok(post);
    assert.match(post.get('html'), /<h2[^>]*>Imported heading with strong text<\/h2>/);
  });

  it('Cleans supplied HTML before converting it to post content', async function () {
    await agent.loginAsOwner();

    const cleanupCsvPath = await csvFile(
      'posts-import-clean-html.csv',
      'title,html\n' +
        'Clean HTML post,"<p style=""text-align: center; color: red; background: blue""><span style=""font-weight: bold"">Clean me</span></p>"\n',
    );

    await agent.post('posts/upload/').attach('postsfile', cleanupCsvPath).expectStatus(202);
    await jobsService.allSettled();

    const post = await models.Post.findOne({ title: 'Clean HTML post', status: 'all' });
    assert.ok(post);
    assert.match(post.get('html'), /<p><strong>Clean me<\/strong><\/p>/);
    assert.doesNotMatch(post.get('html'), /style=/);
  });

  it('Skips a malformed row on its own and imports the rest', async function () {
    await agent.loginAsOwner();

    const badRowsCsvPath = await csvFile(
      'posts-import-with-bad-rows.csv',
      'title,html,markdown,published_at,status,featured\n' +
        'Bad rows check one,<p>Before the bad row</p>,,2024-03-01T00:00:00.000Z,published,false\n' +
        ',<p>This row has no title</p>,,2024-03-02T00:00:00.000Z,published,false\n' +
        'Bad rows check date,<p>This row has a bad date</p>,,not-a-date,published,false\n' +
        'Bad rows check calendar,<p>This row has a rolled-over date</p>,,2025-02-30T00:00:00.000Z,published,false\n' +
        `${'x'.repeat(256)},<p>This title is too long</p>,,2024-03-02T00:00:00.000Z,published,false\n` +
        'Bad rows check status,<p>This row has a bad status</p>,,2024-03-02T00:00:00.000Z,scheduled,false\n' +
        'Bad rows check featured,<p>This row has a bad featured value</p>,,2024-03-02T00:00:00.000Z,published,yes\n' +
        'Bad rows check content,<p>This row has HTML</p>,This row also has Markdown,2024-03-02T00:00:00.000Z,published,false\n' +
        'Bad rows check two,<p>After the bad rows</p>,,2024-03-04T00:00:00.000Z,published,false\n' +
        'Bad rows check three,<p>A loose date format</p>,,01 May 2024 00:00:00 GMT,published,false\n',
    );

    await agent.post('posts/upload/').attach('postsfile', badRowsCsvPath).expectStatus(202);

    await jobsService.allSettled();

    const { data: posts } = await models.Post.findPage({
      filter: `title:~'Bad rows check'`,
      status: 'all',
      limit: 'all',
    });

    assert.deepEqual(
      posts.map((post) => post.get('title')).sort(),
      ['Bad rows check one', 'Bad rows check three', 'Bad rows check two'],
      'the good rows imported; the malformed ones did not',
    );
  });

  it('Handles a CSV-named file of garbage bytes without failing', async function () {
    await agent.loginAsOwner();

    const {
      meta: {
        pagination: { total: before },
      },
    } = await models.Post.findPage({ limit: 1, status: 'all' });

    const garbageCsvPath = await csvFile(
      'posts-import-garbage.csv',
      '\u0000\u0001binary\u0002garbage\r\n\u0003more\u0000bytes,\u0004\r\n\u0005end\u0006',
    );

    await agent.post('posts/upload/').attach('postsfile', garbageCsvPath).expectStatus(202);

    await jobsService.allSettled();

    const {
      meta: {
        pagination: { total: after },
      },
    } = await models.Post.findPage({ limit: 1, status: 'all' });
    assert.equal(after, before, 'no posts were created from garbage rows');
  });

  it('Rejects an upload of more posts than the temporary cap, importing nothing', async function () {
    await agent.loginAsOwner();

    const overCapRows = Array.from(
      { length: 101 },
      (_, i) => `Over cap post ${i + 1},<p>${i + 1}</p>,2025-02-01T00:00:00.000Z`,
    );
    const overCapZipPath = await zipFile('posts-import-over-cap.zip', {
      'posts.csv': 'title,html,published_at\n' + overCapRows.join('\n') + '\n',
      'content/files/over-cap-guide.pdf': 'must not be stored',
    });

    const { body } = await agent
      .post('posts/upload/')
      .attach('postsfile', overCapZipPath)
      .expectStatus(422);

    assert.match(body.errors[0].message, /more than 100 posts/);

    await jobsService.allSettled();

    const { data: posts } = await models.Post.findPage({
      filter: `title:~'Over cap post'`,
      status: 'all',
      limit: 'all',
    });
    assert.equal(posts.length, 0, 'no posts were written from the rejected file');
    await assert.rejects(fs.stat(getImportedAssetPaths()[13]), { code: 'ENOENT' });
  });

  it('Cannot upload a posts CSV when the csvContentImporter flag is disabled', async function () {
    mockManager.mockLabsDisabled('csvContentImporter');
    await agent.loginAsOwner();

    await agent.post('posts/upload/').attach('postsfile', csvPath).expectStatus(404);
  });

  it('Cannot upload a file that is not a CSV', async function () {
    await agent.loginAsOwner();

    await agent
      .post('posts/upload/')
      .attach('postsfile', path.join(__dirname, '../../utils/fixtures/data/redirects.json'))
      .expectStatus(415);
  });

  it('Cannot upload without a file', async function () {
    await agent.loginAsOwner();

    await agent.post('posts/upload/').expectStatus(422);
  });
});
