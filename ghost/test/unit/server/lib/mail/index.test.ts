import assert from 'node:assert/strict';
import sinon from 'sinon';
const mail = require('../../../../../core/server/lib/mail');
const settingsCache = require('../../../../../core/shared/settings-cache');
const urlUtils = require('../../../../../core/shared/url-utils').default;

describe('Mail library', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('renders a bundled template through the public content helper', async function () {
    sinon.stub(settingsCache, 'get').withArgs('title').returns('Example publication');
    sinon.stub(urlUtils, 'urlFor').returns('https://example.com/');

    const content = await mail.utils.generateContent({
      template: 'welcome',
      data: { ownerEmail: 'owner@example.com' },
    });

    assert.match(content.html, /https:\/\/example\.com\//);
    assert.match(content.html, /owner@example\.com/);
    assert.match(content.text, /owner@example\.com/);
  });
});
