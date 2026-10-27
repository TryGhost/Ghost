import assert from 'node:assert/strict';
import sinon from 'sinon';

// Keep the real controller and service root loaded across settings changes.
const announcements = require('../../../../core/server/api/endpoints/announcements');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Announcements controller', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('returns synchronous, independent results from live settings through the retained service', function () {
    const settings = {
      announcement_content: '<p>First announcement</p>',
      announcement_background: 'dark',
      announcement_visibility: ['visitors'],
    };
    sinon.stub(settingsCache, 'get').callsFake((key) => settings[key as keyof typeof settings]);
    const frame = { options: {} };

    const first = announcements.browse.query(frame);
    assert.deepEqual(first, {
      announcement: '<p>First announcement</p>',
      announcement_background: 'dark',
    });
    assert.notStrictEqual(announcements.browse.query(frame), first);

    settings.announcement_content = '<p>Updated announcement</p>';
    settings.announcement_background = 'light';
    assert.deepEqual(announcements.browse.query(frame), {
      announcement: '<p>Updated announcement</p>',
      announcement_background: 'light',
    });
    assert.deepEqual(first, {
      announcement: '<p>First announcement</p>',
      announcement_background: 'dark',
    });

    settings.announcement_visibility = [];
    assert.strictEqual(announcements.browse.query(frame), undefined);
    settings.announcement_visibility = ['visitors'];
    settings.announcement_content = '';
    assert.strictEqual(announcements.browse.query(frame), undefined);
  });

  it('propagates settings failures synchronously without replacing the error', function () {
    const error = new TypeError('Settings unavailable');
    sinon.stub(settingsCache, 'get').throws(error);

    assert.throws(
      () => announcements.browse.query({ options: {} }),
      (thrown) => thrown === error,
    );
  });
});
