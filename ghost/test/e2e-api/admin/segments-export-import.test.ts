import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const { knex } = require('../../../core/server/data/db');

type Segment = { id: string; name: string; slug: string; filter: string };
type Setting = { key: string; value: unknown };
type ExportData = { segments?: unknown[]; settings: Setting[] };
type Export = { db: [{ meta: { version: string }; data: ExportData }] };

type Problem = { help: string; message: string; context: string };

type ApiRequest = Promise<{
  body: { segments: Segment[]; settings: Setting[]; problems: Problem[] } & Export;
}> & {
  body(payload: object): ApiRequest;
  attach(field: string, file: string): ApiRequest;
  expectStatus(status: number): ApiRequest;
};

type AdminAgent = {
  get(url: string): ApiRequest;
  post(url: string): ApiRequest;
  put(url: string): ApiRequest;
  delete(url: string): ApiRequest;
  loginAsOwner(): Promise<void>;
};

/** A saved member view as an older version of Ghost stored one in the `shared_views` setting. */
const memberView = (name: string, filter: string) => ({
  name,
  route: 'members',
  filter: { filter },
});

const postsView = { name: 'Drafts', route: 'posts', filter: { type: 'draft' }, color: 'blue' };

// Saved member views are segments. A site export carries them, and an import adds them to the
// site, whether the file holds them as segments or, as older versions exported them, as entries
// of the `shared_views` setting.
describe('Segments in a site export and import', function () {
  let agent: AdminAgent;
  let directory: string;

  async function browse() {
    const { body } = await agent.get('segments/').expectStatus(200);
    return body.segments;
  }

  const names = async () => (await browse()).map(({ name }) => name);

  async function add(name: string, filter: string): Promise<Segment> {
    const { body } = await agent
      .post('segments/')
      .body({ segments: [{ name, filter }] })
      .expectStatus(201);
    return body.segments[0];
  }

  async function rename(id: string, name: string) {
    await agent
      .put(`segments/${id}/`)
      .body({ segments: [{ name }] })
      .expectStatus(200);
  }

  async function removeSegments() {
    for (const { id } of await browse()) {
      await agent.delete(`segments/${id}/`).expectStatus(204);
    }
  }

  async function saveSharedViews(value: string) {
    await agent
      .put('settings/')
      .body({ settings: [{ key: 'shared_views', value }] })
      .expectStatus(200);
  }

  /** The `shared_views` setting, which holds the views of the posts list. */
  async function sharedViews() {
    const { body } = await agent.get('settings/').expectStatus(200);
    return body.settings.find(({ key }) => key === 'shared_views')?.value;
  }

  /** The views of the posts list, which stay in the `shared_views` setting. */
  async function postsViews() {
    const value = await sharedViews();
    const views: { route: string }[] = JSON.parse(typeof value === 'string' ? value : '[]');
    return views.filter(({ route }) => route === 'posts');
  }

  /** What a site export holds of the site's saved views: its segments and the setting. */
  async function exportSavedViews(): Promise<ExportData> {
    const { body } = await agent.get('db/').expectStatus(200);
    const { segments, settings } = body.db[0].data;
    return { segments, settings: settings.filter(({ key }) => key === 'shared_views') };
  }

  /** Imports `data` as a site export, and returns the problems the import reports. */
  async function importData(data: ExportData): Promise<Problem[]> {
    const file = path.join(directory, 'export.json');
    await fs.writeFile(file, JSON.stringify({ db: [{ meta: { version: '6.0.0' }, data }] }));
    const { body } = await agent.post('db/').attach('importfile', file).expectStatus(200);
    return body.problems;
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    await agent.loginAsOwner();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'segments-import-e2e-'));
  });

  afterAll(async function () {
    await fs.remove(directory);
  });

  afterEach(async function () {
    await removeSegments();
    await saveSharedViews('[]');
  });

  it('brings the segments of an exported site back, in their order', async function () {
    await saveSharedViews(JSON.stringify([postsView]));
    await add('Free', 'status:free');
    // A rename keeps the slug, so this segment's slug is no longer the one its name mints.
    const vip = await add('VIP', 'label:vip');
    await rename(vip.id, 'Very important');
    const exported = await exportSavedViews();
    await removeSegments();

    const problems = await importData(exported);

    // An imported segment is a new segment, so its id is not compared. It keeps its slug.
    assert.deepEqual(
      (await browse()).map(({ name, slug, filter }) => ({ name, slug, filter })),
      [
        { name: 'Free', slug: 'free', filter: 'status:free' },
        { name: 'Very important', slug: 'vip', filter: 'label:vip' },
      ],
    );
    assert.deepEqual(await postsViews(), [postsView]);
    assert.deepEqual(
      problems.filter(({ help }) => help === 'Segment'),
      [],
    );
  });

  // A version from before segments had a table imports them from the setting alone.
  it('exports each segment as a saved member view in the setting too', async function () {
    await saveSharedViews(JSON.stringify([postsView]));
    await add('Free', 'status:free');
    await add('VIP', 'label:vip');

    const { settings = [] } = await exportSavedViews();

    assert.equal(settings.length, 1);
    const views: unknown[] = JSON.parse(String(settings[0].value));
    assert.deepEqual(views, [
      postsView,
      memberView('Free', 'status:free'),
      memberView('VIP', 'label:vip'),
    ]);
  });

  it('imports the saved member views of an export from an older version', async function () {
    const views = [memberView('VIP', 'label:vip'), postsView, memberView('Free', 'status:free')];

    await importData({ settings: [{ key: 'shared_views', value: JSON.stringify(views) }] });

    // A saved member view has no slug, so each gets one minted from its name.
    assert.deepEqual(
      (await browse()).map(({ name, slug, filter }) => ({ name, slug, filter })),
      [
        { name: 'VIP', slug: 'vip', filter: 'label:vip' },
        { name: 'Free', slug: 'free', filter: 'status:free' },
      ],
    );
    assert.deepEqual(await postsViews(), [postsView]);
  });

  it('keeps the slug a segment had, unless another segment has it or it is not a slug', async function () {
    await add('Very important', 'label:vip');

    await importData({
      segments: [
        { name: 'VIP', slug: 'customers', filter: 'label:vip', sort_order: 0 },
        { name: 'Gold', slug: 'very-important', filter: 'label:gold', sort_order: 1 },
        { name: 'Platinum', slug: 'customers', filter: 'label:platinum', sort_order: 2 },
        { name: 'Silver', slug: 'Not a slug', filter: 'label:silver', sort_order: 3 },
        { name: 'Bronze', slug: '2024', filter: 'label:bronze', sort_order: 4 },
        { name: 'Copper', slug: null, filter: 'label:copper', sort_order: 5 },
        { name: 'Free', filter: 'status:free', sort_order: 6 },
      ],
      settings: [],
    });

    assert.deepEqual(
      (await browse()).map(({ name, slug }) => ({ name, slug })),
      [
        { name: 'Very important', slug: 'very-important' },
        { name: 'VIP', slug: 'customers' },
        { name: 'Gold', slug: 'gold' },
        { name: 'Platinum', slug: 'platinum' },
        { name: 'Silver', slug: 'silver' },
        { name: 'Bronze', slug: 'bronze' },
        { name: 'Copper', slug: 'copper' },
        { name: 'Free', slug: 'free' },
      ],
    );
  });

  it('numbers a segment whose name the site has for another filter', async function () {
    await add('VIP', 'label:vip');
    const views = [
      // The site has this segment already.
      memberView('VIP', 'label:vip'),
      memberView('VIP', 'label:gold'),
      memberView('vip', 'label:silver'),
    ];

    await importData({ settings: [{ key: 'shared_views', value: JSON.stringify(views) }] });

    assert.deepEqual(
      (await browse()).map(({ name, filter }) => ({ name, filter })),
      [
        { name: 'VIP', filter: 'label:vip' },
        { name: 'VIP (2)', filter: 'label:gold' },
        { name: 'vip (3)', filter: 'label:silver' },
      ],
    );
  });

  it('keeps a name that is a segment’s own, and numbers around it', async function () {
    const views = [
      memberView('Gold', 'label:gold'),
      memberView('gold', 'label:silver'),
      memberView('gold (2)', 'label:bronze'),
    ];

    await importData({ settings: [{ key: 'shared_views', value: JSON.stringify(views) }] });

    assert.deepEqual(await names(), ['Gold', 'gold (3)', 'gold (2)']);
  });

  it("adds a segment that has the filter of the site's own under another name", async function () {
    await saveSharedViews(JSON.stringify([postsView]));
    await add('VIP', 'label:vip');
    const views = [memberView('Very important', 'label:vip'), memberView('Free', 'status:free')];

    await importData({ settings: [{ key: 'shared_views', value: JSON.stringify(views) }] });

    assert.deepEqual(
      (await browse()).map(({ name, filter }) => ({ name, filter })),
      [
        { name: 'VIP', filter: 'label:vip' },
        { name: 'Very important', filter: 'label:vip' },
        { name: 'Free', filter: 'status:free' },
      ],
    );
  });

  it('adds nothing when a file is imported again, numbered names included', async function () {
    await add('VIP', 'label:vip');
    const views = [memberView('VIP', 'label:gold'), memberView('Free', 'status:free')];
    const file = { settings: [{ key: 'shared_views', value: JSON.stringify(views) }] };

    await importData(file);
    const imported = await browse();
    await importData(file);

    assert.deepEqual(await browse(), imported);
    assert.deepEqual(await names(), ['VIP', 'VIP (2)', 'Free']);
  });

  it('brings segments back in their order, not the order they were added in', async function () {
    await add('Free', 'status:free');
    await add('VIP', 'label:vip');
    // Nothing reorders segments yet, so the first one is moved to the end in the table.
    await knex('segments').where({ name: 'Free' }).update({ sort_order: 5 });
    const exported = await exportSavedViews();
    await removeSegments();

    await importData(exported);

    assert.deepEqual(await names(), ['VIP', 'Free']);
  });

  it('adds nothing when a file is imported a second time', async function () {
    const views = [memberView('VIP', 'label:vip'), memberView('Gold', 'label:vip')];
    const file = { settings: [{ key: 'shared_views', value: JSON.stringify(views) }] };

    await importData(file);
    const imported = await browse();
    await importData(file);

    assert.deepEqual(await browse(), imported);
    assert.deepEqual(await names(), ['VIP', 'Gold']);
  });

  it('numbers a name the database counts as another segment’s', async function () {
    // The site and the file have names that differ by an accent, which the segments service
    // tells apart and MySQL's default collation doesn't. The file's numbered names are its own.
    await add('Café', 'label:accent');
    const views = [
      memberView('Cafe', 'label:cafe'),
      memberView('Cafe (2)', 'label:two'),
      memberView('Cafe (3)', 'label:three'),
      memberView('Gold', 'label:gold'),
      memberView('Göld', 'label:umlaut'),
    ];

    await importData({ settings: [{ key: 'shared_views', value: JSON.stringify(views) }] });

    assert.deepEqual(await names(), [
      'Café',
      'Cafe (4)',
      'Cafe (2)',
      'Cafe (3)',
      'Gold',
      'Göld (2)',
    ]);
  });

  it('does not write the saved member views of an older export into the setting', async function () {
    const views = [postsView, memberView('VIP', 'label:vip')];

    await importData({ settings: [{ key: 'shared_views', value: JSON.stringify(views) }] });

    assert.equal(await sharedViews(), JSON.stringify([postsView]));
  });

  it('skips a segment whose filter names another segment and imports the rest', async function () {
    const problems = await importData({
      segments: [
        { name: 'Free', filter: 'status:free', sort_order: 0 },
        { name: 'Nested', filter: 'segment:0123456789abcdef01234567', sort_order: 1 },
      ],
      settings: [],
    });

    assert.deepEqual(await names(), ['Free']);
    assert.match(
      problems.find(({ help }) => help === 'Segment')?.message ?? '',
      /names another segment/,
    );
  });

  it('skips a segment whose filter is not valid NQL, and imports the rest under their own names', async function () {
    const problems = await importData({
      segments: [
        { name: 'VIP', filter: 'label:vip+', sort_order: 0 },
        { name: 'VIP', filter: 'label:vip', sort_order: 1 },
        { name: 'Free', filter: 'status:free', sort_order: 2 },
      ],
      settings: [],
    });

    // The skipped segment doesn't take its name, so the next segment with it isn't numbered.
    assert.deepEqual(
      (await browse()).map(({ name, filter }) => ({ name, filter })),
      [
        { name: 'VIP', filter: 'label:vip' },
        { name: 'Free', filter: 'status:free' },
      ],
    );
    assert.deepEqual(
      problems
        .filter(({ help }) => help === 'Segment')
        .map(({ message, context }) => ({ message, segment: JSON.parse(context) })),
      [
        {
          message: 'Segment was not imported because its filter is not valid NQL.',
          segment: { name: 'VIP', filter: 'label:vip+' },
        },
      ],
    );
  });

  it('reports a segment the site has as had, even when its filter is not valid NQL', async function () {
    // As a version that didn't check a filter's syntax could have saved it
    await knex('segments').insert({
      id: '0123456789abcdef01234567',
      name: 'Legacy',
      slug: 'legacy',
      filter: 'status:paid+',
      sort_order: 0,
      created_at: new Date(),
    });
    const exported = await exportSavedViews();

    const problems = await importData(exported);

    assert.deepEqual(await names(), ['Legacy']);
    assert.deepEqual(
      problems.filter(({ help }) => help === 'Segment').map(({ message }) => message),
      ['Segment was not imported because the site already has it.'],
    );
  });

  it('cuts a name that is too long and leaves out a view that cannot be a segment', async function () {
    const views = [
      memberView('n'.repeat(200), 'label:long'),
      memberView('   ', 'label:unnamed'),
      { name: 'Everyone', route: 'members', filter: {} },
    ];

    await importData({ settings: [{ key: 'shared_views', value: JSON.stringify(views) }] });

    assert.deepEqual(await names(), ['n'.repeat(191)]);
  });
});
