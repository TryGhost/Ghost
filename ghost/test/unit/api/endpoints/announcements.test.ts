import assert from 'node:assert/strict';
import sinon from 'sinon';

// Keep the real controller loaded across settings changes.
const announcements = require('../../../../core/server/api/endpoints/announcements');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Announcements controller', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('returns synchronous, independent results from live settings', function () {
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

  describe('visibility', function () {
    const testVisibility = (
      settings: {
        announcement_content: string | null;
        announcement_visibility: string[];
        announcement_background?: string;
      },
      member: { status: string } | undefined,
      expected: { announcement: string; announcement_background: string } | undefined,
    ) => {
      sinon.stub(settingsCache, 'get').callsFake((key) => settings[key as keyof typeof settings]);

      assert.deepEqual(announcements.browse.query({ options: { context: { member } } }), expected);
    };

    const shown = { announcement: 'Hello world', announcement_background: 'dark' };

    it('is hidden when there is no announcement content', function () {
      testVisibility(
        { announcement_content: null, announcement_visibility: ['visitors'] },
        undefined,
        undefined,
      );
    });

    it('is hidden when no visibility is set', function () {
      testVisibility(
        {
          announcement_content: 'Hello world',
          announcement_visibility: [],
          announcement_background: 'dark',
        },
        undefined,
        undefined,
      );
    });

    it('is shown to visitors without a member', function () {
      testVisibility(
        {
          announcement_content: 'Hello world',
          announcement_visibility: ['visitors'],
          announcement_background: 'dark',
        },
        undefined,
        shown,
      );
    });

    it('is shown to free members', function () {
      testVisibility(
        {
          announcement_content: 'Hello world',
          announcement_visibility: ['free_members'],
          announcement_background: 'dark',
        },
        { status: 'free' },
        shown,
      );
    });

    it('is shown to paid and comped members for paid_members', function () {
      const settings = {
        announcement_content: 'Hello world',
        announcement_visibility: ['paid_members'],
        announcement_background: 'dark',
      };
      testVisibility(settings, { status: 'paid' }, shown);
      sinon.restore();
      testVisibility(settings, { status: 'comped' }, shown);
    });

    it('is hidden from visitors and free members for paid_members', function () {
      const settings = {
        announcement_content: 'Hello world',
        announcement_visibility: ['paid_members'],
        announcement_background: 'dark',
      };
      testVisibility(settings, undefined, undefined);
      sinon.restore();
      testVisibility(settings, { status: 'free' }, undefined);
    });

    it('is hidden from visitors for free_members and paid_members', function () {
      testVisibility(
        {
          announcement_content: 'Hello world',
          announcement_visibility: ['free_members', 'paid_members'],
          announcement_background: 'dark',
        },
        undefined,
        undefined,
      );
    });
  });
});
