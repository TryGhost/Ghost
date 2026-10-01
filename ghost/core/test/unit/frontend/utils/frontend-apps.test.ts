import assert from 'node:assert/strict';
import {
  getFrontendAppConfig,
  getDataAttributes,
  // @ts-expect-error This module lacks type definitions.
} from '../../../../core/frontend/utils/frontend-apps';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../utils/config-utils';

describe('Frontend apps:', function () {
  describe('getFrontendAppConfig', function () {
    beforeAll(function () {
      configUtils.set({ 'portal:url': 'https://cdn.example.com/~{version}/portal.min.js' });
      configUtils.set({ 'portal:version': '1.0' });
      configUtils.set({ 'portal:styles': 'https://cdn.example.com/~{version}/main.css' });
    });

    afterAll(async function () {
      await configUtils.restore();
    });

    it('should return app urls and version from config', async function () {
      const { stylesUrl, scriptUrl, appVersion } = getFrontendAppConfig('portal');
      assert.equal(appVersion, '1.0');
      assert.equal(stylesUrl, 'https://cdn.example.com/~1.0/main.css');
      assert.equal(scriptUrl, 'https://cdn.example.com/~1.0/portal.min.js');
    });
  });

  describe('getDataAttributes', function () {
    it('should generate data attributes string from object', async function () {
      const dataAttributes = getDataAttributes({
        admin: 'test',
        'example-version': '1.0',
      });

      assert.equal(dataAttributes, 'data-admin="test" data-example-version="1.0"');
    });

    it('should generate empty string for missing data object', async function () {
      const dataAttributes = getDataAttributes();

      assert.equal(dataAttributes, '');
    });
  });
});
