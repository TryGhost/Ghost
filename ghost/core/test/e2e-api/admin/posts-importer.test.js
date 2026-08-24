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
const { compress } = require('@tryghost/zip');

const csvPath = path.join(__dirname, '../../utils/fixtures/csv/valid-posts-import.csv');

// Test CSVs are written inline to a temp dir rather than committed as fixtures.
let tmpDir;

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
  });

  afterEach(async function () {
    // Every accepted upload schedules a background import — drain it so a job
    // doesn't run on into another test (or another file on this fork's DB)
    await jobsService.allSettled();
    mockManager.restore();
  });

  it('Can upload a posts CSV as Owner', async function () {
    await agent.loginAsOwner();

    await agent
      .post('posts/upload/')
      .attach('postsfile', csvPath)
      .expectStatus(202)
      .expect(cacheInvalidateHeaderNotSet());
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
    ];

    for (const testCase of cases) {
      const zipPath = await zipFile(testCase.name, testCase.files);
      const { body } = await agent
        .post('posts/upload/')
        .attach('postsfile', zipPath)
        .expectStatus(422);
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
        mapping: { First: 'title', Second: 'authors' },
        reason: /Unknown post field mapping: "authors"/,
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
    const overCapCsvPath = await csvFile(
      'posts-import-over-cap.csv',
      'title,html,published_at\n' + overCapRows.join('\n') + '\n',
    );

    const { body } = await agent
      .post('posts/upload/')
      .attach('postsfile', overCapCsvPath)
      .expectStatus(422);

    assert.match(body.errors[0].message, /more than 100 posts/);

    await jobsService.allSettled();

    const { data: posts } = await models.Post.findPage({
      filter: `title:~'Over cap post'`,
      status: 'all',
      limit: 'all',
    });
    assert.equal(posts.length, 0, 'no posts were written from the rejected file');
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
