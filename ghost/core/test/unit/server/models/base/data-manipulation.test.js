const assert = require('node:assert/strict');
const sinon = require('sinon');

// Note: use the Post model to test the fixDatesWhenFetch method, as we need the model
// to have a schema with dateTime fields and non-nullable boolean fields
const { Post: PostModel } = require('../../../../../core/server/models/post');
const { Member: MemberModel } = require('../../../../../core/server/models/member');

describe('Data Manipulation', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('fixDatesWhenFetch', function () {
    const now = new Date('2024-12-15T12:34:56Z');

    beforeEach(function () {
      sinon.useFakeTimers(now);
    });

    it('fixes invalid dates', function () {
      const date = new Date('0000-00-00 00:00:00');
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: date,
      });
      assert.equal(fixedAttrs.created_at.getTime(), now.getTime());
    });

    it('fixes invalid string dates', function () {
      const date = '0000-00-00 00:00:00';
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: date,
      });
      assert.equal(fixedAttrs.created_at.getTime(), now.getTime());
    });

    it('processes valid string dates', function () {
      const date = '2025-02-20T10:16:01.000Z';
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: date,
      });
      assert.ok(fixedAttrs.created_at instanceof Date, 'created_at should be a date');
      assert.equal(fixedAttrs.created_at.getTime(), new Date(date).getTime());
    });

    it('processes valid date objects', function () {
      const date = new Date('2025-02-20T10:16:01.000Z');
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: date,
      });
      assert.equal(fixedAttrs.created_at.getTime(), date.getTime());
    });

    it('sets milliseconds to 0', function () {
      const date = '2025-02-20T10:16:01.123Z';
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: date,
      });
      assert.equal(fixedAttrs.created_at.getTime(), 1740046561000);
    });

    it('sets milliseconds to 0 on date objects', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: new Date('2025-02-20T10:16:01.999Z'),
      });
      assert.equal(fixedAttrs.created_at.getTime(), 1740046561000);
    });

    it('rounds dates before 1970 down to the whole second', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: new Date(-1500),
      });
      assert.equal(fixedAttrs.created_at.getTime(), -2000);
    });

    it('processes epoch milliseconds', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: 1740046561123,
      });
      assert.ok(fixedAttrs.created_at instanceof Date, 'created_at should be a date');
      assert.equal(fixedAttrs.created_at.getTime(), 1740046561000);
    });

    it('parses sqlite date strings as UTC regardless of the process timezone', function () {
      const originalTZ = process.env.TZ;
      process.env.TZ = 'America/New_York';

      try {
        const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
          created_at: '2025-02-20 10:16:01',
          updated_at: '2025-02-20 10:16:01.123',
        });
        assert.equal(fixedAttrs.created_at.getTime(), 1740046561000);
        assert.equal(fixedAttrs.updated_at.getTime(), 1740046561000);
      } finally {
        if (originalTZ === undefined) {
          delete process.env.TZ;
        } else {
          process.env.TZ = originalTZ;
        }
      }
    });

    it('processes date-only strings as UTC midnight', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: '2025-02-20',
      });
      assert.equal(fixedAttrs.created_at.getTime(), Date.UTC(2025, 1, 20));
    });

    it('processes ISO strings with an offset', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: '2025-02-20T12:16:01+02:00',
      });
      assert.equal(fixedAttrs.created_at.getTime(), 1740046561000);
    });

    it('reads reduced ISO dates as the start of the year or month, not a time today', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: '2025',
        updated_at: '2025-02',
      });
      assert.equal(fixedAttrs.created_at.getTime(), Date.UTC(2025, 0, 1));
      assert.equal(fixedAttrs.updated_at.getTime(), Date.UTC(2025, 1, 1));
    });

    it('parses other formats moment understood', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: 'Thu, 20 Feb 2025 10:16:01 GMT',
      });
      assert.equal(fixedAttrs.created_at.getTime(), 1740046561000);
    });

    it('fixes impossible string dates', function () {
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
        created_at: '2025-02-30 10:00:00',
      });
      assert.equal(fixedAttrs.created_at.getTime(), now.getTime());
    });

    it('does not touch attributes that are not known dates', function () {
      const attrs = {
        launched_into_space_at: '2025-02-20T10:16:01.123Z',
      };
      const fixedAttrs = PostModel.prototype.fixDatesWhenFetch(attrs);
      assert.ok(
        typeof fixedAttrs.launched_into_space_at === 'string',
        'launched_into_space_at should be a string',
      );
      assert.equal(fixedAttrs.launched_into_space_at, '2025-02-20T10:16:01.123Z');
    });
  });

  describe('fixDatesWhenSave', function () {
    const save = (value) => PostModel.prototype.fixDatesWhenSave({ created_at: value }).created_at;

    it('formats date objects as UTC database strings, dropping milliseconds', function () {
      assert.equal(save(new Date('2025-02-20T10:16:01.999Z')), '2025-02-20 10:16:01');
    });

    it('formats regardless of the process timezone', function () {
      const originalTZ = process.env.TZ;
      process.env.TZ = 'America/New_York';

      try {
        assert.equal(save(new Date('2025-02-20T01:16:01Z')), '2025-02-20 01:16:01');
        assert.equal(save('2025-02-20 01:16:01'), '2025-02-20 01:16:01');
      } finally {
        if (originalTZ === undefined) {
          delete process.env.TZ;
        } else {
          process.env.TZ = originalTZ;
        }
      }
    });

    it('formats epoch milliseconds', function () {
      assert.equal(save(1740046561123), '2025-02-20 10:16:01');
    });

    it('formats ISO strings, including offsets', function () {
      assert.equal(save('2025-02-20T10:16:01.000Z'), '2025-02-20 10:16:01');
      assert.equal(save('2025-02-20T12:16:01+02:00'), '2025-02-20 10:16:01');
      assert.equal(save('2025-02-20T10:16:01.000+00:00'), '2025-02-20 10:16:01');
    });

    it('formats date-only strings as UTC midnight', function () {
      assert.equal(save('2025-02-20'), '2025-02-20 00:00:00');
    });

    it('formats moment and luxon objects', function () {
      const moment = require('moment');
      const { DateTime } = require('luxon');

      assert.equal(save(moment.utc('2025-02-20T10:16:01Z')), '2025-02-20 10:16:01');
      assert.equal(save(DateTime.fromISO('2025-02-20T10:16:01Z')), '2025-02-20 10:16:01');
    });

    it('pads years outside 1000-9999 the way moment did', function () {
      const date = (year) => {
        const d = new Date(Date.UTC(2000, 5, 15, 1, 2, 3));
        d.setUTCFullYear(year);
        return d;
      };

      assert.equal(save(date(999)), '0999-06-15 01:02:03');
      assert.equal(save(date(12000)), '12000-06-15 01:02:03');
      assert.equal(save(date(-50)), '-0050-06-15 01:02:03');
    });

    it('rounds dates before 1970 down to the whole second', function () {
      assert.equal(save(new Date(-1500)), '1969-12-31 23:59:58');
    });

    it('ignores leading whitespace before a date, as moment did', function () {
      assert.equal(save(' 2025-02-20 10:16:01'), '2025-02-20 10:16:01');
      assert.equal(save('\t2025-02-20T10:16:01Z'), '2025-02-20 10:16:01');
    });

    it('formats reduced ISO dates as the start of the year or month', function () {
      assert.equal(save('2025'), '2025-01-01 00:00:00');
      assert.equal(save('2025-02'), '2025-02-01 00:00:00');
    });

    it('formats other formats moment understood', function () {
      assert.equal(save('Thu, 20 Feb 2025 10:16:01 GMT'), '2025-02-20 10:16:01');
    });

    it("keeps moment's output for invalid dates", function () {
      assert.equal(save(new Date('x')), 'Invalid date');
      assert.equal(save('0000-00-00 00:00:00'), 'Invalid date');
      assert.equal(save('2025-02-30 10:00:00'), 'Invalid date');
    });

    it('does not touch attributes that are not known dates', function () {
      const attrs = PostModel.prototype.fixDatesWhenSave({ launched_into_space_at: new Date(0) });
      assert.ok(attrs.launched_into_space_at instanceof Date);
    });
  });

  describe('fixBools', function () {
    it('coerces non-nullable boolean fields to real booleans', function () {
      const fixedAttrs = PostModel.prototype.fixBools({
        featured: 0,
        show_title_and_feature_image: 1,
      });

      assert.equal(fixedAttrs.featured, false);
      assert.equal(fixedAttrs.show_title_and_feature_image, true);
    });

    it('preserves null values for nullable boolean fields', function () {
      const fixedAttrs = MemberModel.prototype.fixBools({
        enable_comment_notifications: 1,
        enable_updates_and_announcements: null,
        email_disabled: 0,
      });

      assert.equal(fixedAttrs.enable_comment_notifications, true);
      assert.equal(fixedAttrs.enable_updates_and_announcements, null);
      assert.equal(fixedAttrs.email_disabled, false);
    });

    it('coerces non-null values for nullable boolean fields', function () {
      let fixedAttrs = MemberModel.prototype.fixBools({
        enable_updates_and_announcements: 0,
      });

      assert.equal(fixedAttrs.enable_updates_and_announcements, false);

      fixedAttrs = MemberModel.prototype.fixBools({
        enable_updates_and_announcements: 1,
      });

      assert.equal(fixedAttrs.enable_updates_and_announcements, true);
    });
  });
});
