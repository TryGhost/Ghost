import assert from 'node:assert/strict';
import sinon from 'sinon';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const Cache = require('../../../core/shared/custom-theme-settings-cache/custom-theme-settings-cache');
const Service = require('../../../core/server/services/custom-theme-settings/custom-theme-settings-service');

describe('Custom theme settings: concurrent activation', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('settings'));
  afterAll(testUtils.teardownDb);
  afterEach(async function () {
    sinon.restore();
    await db.knex('custom_theme_settings').del();
  });

  const createService = () => new Service({ model: models.CustomThemeSetting, cache: new Cache() });

  const storedKeys = async () =>
    (await db.knex('custom_theme_settings').where('theme', 'test').orderBy('key')).map(
      (setting: { key: string }) => setting.key,
    );

  it('stores each missing setting once', async function () {
    const theme = {
      name: 'test',
      customSettings: {
        one: { type: 'select', options: ['1', '2'], default: '1' },
        two: { type: 'text' },
      },
    };

    await Promise.all([
      createService().activateTheme('test', theme),
      createService().activateTheme('test', theme),
    ]);

    assert.deepEqual(await storedKeys(), ['one', 'two']);
  });

  it('completes both activations when the theme has dropped a setting', async function () {
    await models.CustomThemeSetting.add({ theme: 'test', key: 'dropped', type: 'text', value: '' });
    const theme = {
      name: 'test',
      customSettings: {
        one: { type: 'select', options: ['1', '2'], default: '1' },
      },
    };
    const services = [createService(), createService()];

    await Promise.all(services.map((service) => service.activateTheme('test', theme)));

    assert.deepEqual(await storedKeys(), ['one']);
    for (const service of services) {
      assert.deepEqual(
        service.listSettings().map((setting: { key: string }) => setting.key),
        ['one'],
      );
    }
  });

  it('completes when a record it is removing has already been removed', async function () {
    await models.CustomThemeSetting.add({ theme: 'test', key: 'dropped', type: 'text', value: '' });
    const theme = {
      name: 'test',
      customSettings: {
        one: { type: 'select', options: ['1', '2'], default: '1' },
      },
    };
    const findAll = models.CustomThemeSetting.findAll.bind(models.CustomThemeSetting);
    let removed = false;
    sinon.stub(models.CustomThemeSetting, 'findAll').callsFake(async (...args: unknown[]) => {
      const collection = await findAll(...args);
      if ((args[0] as { transacting?: unknown }).transacting && !removed) {
        removed = true;
        await db.knex('custom_theme_settings').where('key', 'dropped').del();
      }
      return collection;
    });
    const service = createService();

    await service.activateTheme('test', theme);

    assert.deepEqual(await storedKeys(), ['one']);
    assert.deepEqual(
      service.listSettings().map((setting: { key: string }) => setting.key),
      ['one'],
    );
  });
});
