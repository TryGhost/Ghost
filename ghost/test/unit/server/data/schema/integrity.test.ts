import assert from 'node:assert/strict';
import _ from 'lodash';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { config } from '../../../../utils/config-utils';
import fixtures from '../../../../../core/server/data/schema/fixtures/fixtures.json';
import defaultSettings from '../../../../../core/server/data/schema/default-settings/default-settings.json';

// Routes are yaml so we can require the file directly
// @ts-expect-error This module lacks type definitions.
import routeSettings from '../../../../../core/server/services/route-settings';
routeSettings.init();
const {
  parseRouteSettings,
} = require('../../../../../core/server/services/route-settings/route-settings-parser');
const parseYaml = require('../../../../../core/server/services/route-settings/yaml-parser');

/**
 * @NOTE
 *
 * If this test fails for you, you have modified one of:
 * - fixtures
 * - default settings
 * - routes.yaml
 *
 * When you make a change, please test that:
 *
 * 1. A new blog get's installed and the database looks correct and complete.
 * 2. A blog get's updated from a lower Ghost version and the database looks correct and complete.
 *
 * Typical cases:
 * Permissions are defined in core/server/services/permissions/permissions-data.ts
 * and changing them needs no migration.
 * You have to add a migration script if you've added new settings to populate group/flags column.
 */
describe('DB version integrity', function () {
  // Only these variables should need updating
  const currentFixturesHash = '6b95ec92aa9846cbc44e75de6d29d8d0';
  const currentSettingsHash = 'e40cbb3df0888c7b6ddb7c1b854f1a20';
  const currentRoutesHash = 'd8c25fa01bf6d22a2bcb05ba0de70dc1';

  // If this test is failing, then it is likely a change has been made that requires a DB version bump,
  // and the values above will need updating as confirmation
  it('should not change without fixing this test', function () {
    const routesPath = path.join(config.get('paths').defaultRouteSettings, 'default-routes.yaml');
    const defaultRoutesSource = fs.readFileSync(routesPath, 'utf-8');
    // `yamlSource` is the verbatim file text, so hashing it would trip this
    // canary on comment and whitespace edits that change no route at all.
    // The bridge output this used to hash carried no such field either.
    const defaultRoutes = _.omit(
      parseRouteSettings(parseYaml(defaultRoutesSource), defaultRoutesSource),
      'yamlSource',
    );

    const fixturesHash = crypto
      .createHash('md5')
      .update(JSON.stringify(fixtures), 'binary')
      .digest('hex');
    const settingsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(defaultSettings), 'binary')
      .digest('hex');
    const routesHash = crypto
      .createHash('md5')
      .update(JSON.stringify(defaultRoutes), 'binary')
      .digest('hex');

    assert.equal(
      fixturesHash,
      currentFixturesHash,
      'Fixtures have changed, please ensure a proper migration has been created if necessary and update the hash in this test.',
    );
    assert.equal(
      settingsHash,
      currentSettingsHash,
      'Default settings have changed, please ensure a proper migration has been created if necessary and update the hash in this test.',
    );
    assert.equal(
      routesHash,
      currentRoutesHash,
      'Default routes have changed, please ensure a proper migration has been created if necessary and update the hash in this test.',
    );
  });
});
