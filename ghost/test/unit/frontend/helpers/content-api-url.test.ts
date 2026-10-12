import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { SinonStub } from 'sinon';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../utils/config-utils';

// Stuff we are testing
// @ts-expect-error This module lacks type definitions.
import content_api_url from '../../../../core/frontend/helpers/content_api_url';
import logging from '@tryghost/logging';

describe('{{content_api_url}} helper', function () {
  let logWarnStub: SinonStub;

  beforeEach(function () {
    logWarnStub = sinon.stub(logging, 'warn');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('without sub-directory', function () {
    beforeAll(function () {
      configUtils.set({ url: 'http://localhost:65535/', 'admin:url': 'https://admin.tld:65535' });
    });

    afterAll(async function () {
      await configUtils.restore();
    });

    it('should output an absolute url', async function () {
      const result = content_api_url();
      const rendered = String(result);
      assert.equal(rendered, 'https://admin.tld:65535/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
    it('should output an absolute url when passed true', async function () {
      const result = content_api_url(true);
      const rendered = String(result);
      assert.equal(rendered, 'https://admin.tld:65535/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
    it('should output a relative url when passed false', async function () {
      const result = content_api_url(false);
      const rendered = String(result);
      assert.equal(rendered, '/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
  });
  describe('with a sub-directory', function () {
    beforeAll(function () {
      configUtils.set({
        url: 'http://localhost:65535/blog',
        'admin:url': 'https://admin.tld:65535/blog',
      });
    });

    afterAll(async function () {
      await configUtils.restore();
    });

    it('should output an absolute url', async function () {
      const result = content_api_url();
      const rendered = String(result);
      assert.equal(rendered, 'https://admin.tld:65535/blog/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
    it('should output an absolute url when passed true', async function () {
      const result = content_api_url(true);
      const rendered = String(result);
      assert.equal(rendered, 'https://admin.tld:65535/blog/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
    it('should output a relative url when passed false', async function () {
      const result = content_api_url(false);
      const rendered = String(result);
      assert.equal(rendered, '/blog/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
  });
  describe('uses the site url if no admin:url is set', function () {
    beforeAll(function () {
      configUtils.set({ url: 'http://localhost:65535/' });
    });

    afterAll(async function () {
      await configUtils.restore();
    });

    it('gives the site url without a subdirectory', async function () {
      const result = content_api_url();
      const rendered = String(result);
      assert.equal(rendered, 'http://localhost:65535/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
    it('gives the site url with a subdirectory', async function () {
      configUtils.set({ url: 'http://localhost:65535/blog', 'admin:url': undefined });
      const result = content_api_url();
      const rendered = String(result);
      assert.equal(rendered, 'http://localhost:65535/blog/ghost/api/content/');
      sinon.assert.notCalled(logWarnStub);
    });
  });
});
