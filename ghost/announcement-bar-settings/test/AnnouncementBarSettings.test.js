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
        it('returns undefined if there is no announcement content', function () {
            const announcementBarSettings = new AnnouncementBarSettings({
                getAnnouncementSettings: () => ({
                    announcement: null,
                    announcement_visibility: [],
                    announcement_background: 'dark'
                })
            });

            const settings = announcementBarSettings.getAnnouncementSettings();

            assert.equal(settings, undefined);
        });

        it('returns undefined announcement settings if there is no announcement visibility', function () {
            const announcementBarSettings = new AnnouncementBarSettings({
                getAnnouncementSettings: () => ({
                    announcement: 'Hello world',
                    announcement_visibility: [],
                    announcement_background: 'dark'
                })
            });

            const settings = announcementBarSettings.getAnnouncementSettings();

            assert.equal(settings, undefined);
        });

        it('returns announcement if visibility is set to visitors and there is no logged in member', function () {
            const announcementBarSettings = new AnnouncementBarSettings({
                getAnnouncementSettings: () => ({
                    announcement: 'Hello world',
                    announcement_visibility: ['visitors'],
                    announcement_background: 'dark'
                })
            });

            const settings = announcementBarSettings.getAnnouncementSettings();

            assert.equal(settings.announcement, 'Hello world');
        });

        it('returns announcement if visibility is set to free members and member is free', function () {
            const announcementBarSettings = new AnnouncementBarSettings({
                getAnnouncementSettings: () => ({
                    announcement: 'Hello world',
                    announcement_visibility: ['free_members'],
                    announcement_background: 'dark'
                })
            });

            const settings = announcementBarSettings.getAnnouncementSettings({
                status: 'free'
            });
            assert.equal(settings.announcement, 'Hello world');
        });

        it('returns announcement if visibility is set to paid members and member is paid', function () {
            const announcementBarSettings = new AnnouncementBarSettings({
                getAnnouncementSettings: () => ({
                    announcement: 'Hello world',
                    announcement_visibility: ['paid_members'],
                    announcement_background: 'dark'
                })
            });

            const settings = announcementBarSettings.getAnnouncementSettings({
                status: 'paid'
            });
            assert.equal(settings.announcement, 'Hello world');
        });

        it('returns announcement if visibility is set to paid and paid members and member is comped', function () {
            const announcementBarSettings = new AnnouncementBarSettings({
                getAnnouncementSettings: () => ({
                    announcement: 'Hello world',
                    announcement_visibility: ['paid_members'],
                    announcement_background: 'dark'
                })
            });

            const settings = announcementBarSettings.getAnnouncementSettings({
                status: 'comped'
            });
            assert.equal(settings.announcement, 'Hello world');
        });
    });
});
