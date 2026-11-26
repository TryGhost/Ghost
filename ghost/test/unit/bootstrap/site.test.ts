import assert from 'node:assert/strict';
import sinon from 'sinon';
import { site } from '../../../bootstrap/site';

const settingsCache = require('../../../core/shared/settings-cache');

describe('The site', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('is identified by the site_uuid setting, read each time it is asked for', function () {
    const get = sinon.stub(settingsCache, 'get');
    get.withArgs('site_uuid').returns('5fa1c6b0-3c5f-4d8e-9a55-2f6d8c0e1b7a');
    assert.equal(site.id, '5fa1c6b0-3c5f-4d8e-9a55-2f6d8c0e1b7a');

    get.withArgs('site_uuid').returns('0d9f0c1e-7b1a-4c58-8a43-6a1f3f0e9d21');
    assert.equal(site.id, '0d9f0c1e-7b1a-4c58-8a43-6a1f3f0e9d21');
  });

  it('refuses to give an id before settings are loaded', function () {
    sinon.stub(settingsCache, 'get').withArgs('site_uuid').returns(undefined);

    assert.throws(() => site.id, /read before settings were loaded/);
  });

  it('shares its config and logger with legacy code', function () {
    assert.equal(site.config, require('../../../core/shared/config'));
    assert.equal(site.log, require('@tryghost/logging'));
  });
});
