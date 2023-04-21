const assert = require('assert');
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

        it('returns announcement if visibility is set to free members and member is free', function () {
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

        it('returns announcement if visibility is set to paid members and member is paid', function () {
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

        it('returns announcement if visibility is set to paid and paid members and member is comped', function () {
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
    });
});
