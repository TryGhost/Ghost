const assert = require('assert/strict');
const AnnouncementBarSettings = require('../index');

describe('AnnouncementBarSettings', function () {
    it('can initialize', function () {
        const announcementBarSettings = new AnnouncementBarSettings({
            getAnnouncementSettings: () => ({
                announcement: 'Hello world',
                announcement_visibility: ['visitors'],
                announcement_background: 'dark'
            })
        });

        assert.ok(announcementBarSettings);
    });

    describe('AnnouncementVisibilityValues', function () {
        it('has static VisibilityValues property', function () {
            assert.ok(AnnouncementBarSettings.VisibilityValues);
            assert.equal(AnnouncementBarSettings.VisibilityValues.VISITORS, 'visitors');
            assert.equal(AnnouncementBarSettings.VisibilityValues.FREE_MEMBERS, 'free_members');
            assert.equal(AnnouncementBarSettings.VisibilityValues.PAID_MEMBERS, 'paid_members');
        });
    });

    describe('getAnnouncementSettings', function () {
        const testVisibility = (announcementSettings, member, expected) => {
            const announcementBarSettings = new AnnouncementBarSettings({
                getAnnouncementSettings: () => (announcementSettings)
            });

            const settings = announcementBarSettings.getAnnouncementSettings(member);

            assert.deepEqual(settings, expected);
        };

        it('returns undefined settings if there is no announcement content', function () {
            testVisibility({
                announcement: null,
                announcement_visibility: []
            }, undefined, undefined);
        });

        it('returns undefined announcement settings if there is no announcement visibility', function () {
            testVisibility({
                announcement: {
                    announcement: 'Hello world',
                    announcement_visibility: []
                },
                announcement_visibility: []
            }, undefined, undefined);
        });

        it('returns announcement if visibility is set to visitors and there is no logged in member', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['visitors'],
                announcement_background: 'dark'
            }, undefined, {
                announcement: 'Hello world',
                announcement_background: 'dark'
            });
        });

        it('returns announcement if visibility is set to free_members and member is free', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['free_members'],
                announcement_background: 'dark'
            }, {
                status: 'free'
            }, {
                announcement: 'Hello world',
                announcement_background: 'dark'
            });
        });

        it('returns announcement if visibility is set to paid_members and member is paid', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['paid_members'],
                announcement_background: 'dark'
            }, {
                status: 'paid'
            }, {
                announcement: 'Hello world',
                announcement_background: 'dark'
            });
        });

        it('returns announcement if visibility is set to paid and paid_members and member is comped', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['paid_members'],
                announcement_background: 'dark'
            }, {
                status: 'comped'
            }, {
                announcement: 'Hello world',
                announcement_background: 'dark'
            });
        });

        it('returns announcement if visibility is set to paid_members and member is comped', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['paid_members'],
                announcement_background: 'dark'
            }, {
                status: 'comped'
            }, {
                announcement: 'Hello world',
                announcement_background: 'dark'
            });
        });

        it('does not return announcement if visibility is set to paid_members and there is no members', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['paid_members'],
                announcement_background: 'dark'
            }, undefined, undefined);
        });

        it('does not return announcement if visibility is set to paid_members and member is free', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['paid_members'],
                announcement_background: 'dark'
            }, {
                status: 'free'
            }, undefined);
        });

        it('does not return announcement if visibility is set to free_members && paid_member and there is no member', function () {
            testVisibility({
                announcement: 'Hello world',
                announcement_visibility: ['free_members', 'paid_members'],
                announcement_background: 'dark'
            }, undefined, undefined);
        });
    });
});
