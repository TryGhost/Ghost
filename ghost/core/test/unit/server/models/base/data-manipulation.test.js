const assert = require('node:assert/strict');
const sinon = require('sinon');

// Note: use the Post model to test the fixDatesWhenFetch method, as we need the model
// to have a schema with dateTime fields and non-nullable boolean fields
const {Post: PostModel} = require('../../../../../core/server/models/post');
const {Member: MemberModel} = require('../../../../../core/server/models/member');

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
                created_at: date
            });
            assert.equal(fixedAttrs.created_at.getTime(), now.getTime());
        });

        it('fixes invalid string dates', function () {
            const date = '0000-00-00 00:00:00';
            const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
                created_at: date
            });
            assert.equal(fixedAttrs.created_at.getTime(), now.getTime());
        });

        it('processes valid string dates', function () {
            const date = '2025-02-20T10:16:01.000Z';
            const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
                created_at: date
            });
            assert.ok(fixedAttrs.created_at instanceof Date, 'created_at should be a date');
            assert.equal(fixedAttrs.created_at.getTime(), new Date(date).getTime());
        });

        it('processes valid date objects', function () {
            const date = new Date('2025-02-20T10:16:01.000Z');
            const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
                created_at: date
            });
            assert.equal(fixedAttrs.created_at.getTime(), date.getTime());
        });

        it('sets milliseconds to 0', function () {
            const date = '2025-02-20T10:16:01.123Z';
            const fixedAttrs = PostModel.prototype.fixDatesWhenFetch({
                created_at: date
            });
            assert.equal(fixedAttrs.created_at.getTime(), 1740046561000);
        });

        it('does not touch attributes that are not known dates', function () {
            const attrs = {
                launched_into_space_at: '2025-02-20T10:16:01.123Z'
            };
            const fixedAttrs = PostModel.prototype.fixDatesWhenFetch(attrs);
            assert.ok(typeof fixedAttrs.launched_into_space_at === 'string', 'launched_into_space_at should be a string');
            assert.equal(fixedAttrs.launched_into_space_at, '2025-02-20T10:16:01.123Z');
        });
    });

    describe('fixBools', function () {
        it('coerces non-nullable boolean fields to real booleans', function () {
            const fixedAttrs = PostModel.prototype.fixBools({
                featured: 0,
                show_title_and_feature_image: 1
            });

            assert.equal(fixedAttrs.featured, false);
            assert.equal(fixedAttrs.show_title_and_feature_image, true);
        });

        it('preserves null values for nullable boolean fields', function () {
            const fixedAttrs = MemberModel.prototype.fixBools({
                enable_comment_notifications: 1,
                enable_updates_and_announcements: null,
                email_disabled: 0
            });

            assert.equal(fixedAttrs.enable_comment_notifications, true);
            assert.equal(fixedAttrs.enable_updates_and_announcements, null);
            assert.equal(fixedAttrs.email_disabled, false);
        });

        it('coerces non-null values for nullable boolean fields', function () {
            let fixedAttrs = MemberModel.prototype.fixBools({
                enable_updates_and_announcements: 0
            });

            assert.equal(fixedAttrs.enable_updates_and_announcements, false);

            fixedAttrs = MemberModel.prototype.fixBools({
                enable_updates_and_announcements: 1
            });

            assert.equal(fixedAttrs.enable_updates_and_announcements, true);
        });
    });
});
