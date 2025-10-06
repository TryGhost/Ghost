import moment from 'moment-timezone';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, find, triggerKeyEvent, waitFor} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

// Page Objects
class WhatsNewToast {
    get isVisible() {
        return !!find('[data-test-toast="whats-new"]');
    }

    get title() {
        return find('[data-test-toast-title]')?.textContent.trim();
    }

    get excerpt() {
        return find('[data-test-toast-excerpt]')?.textContent.trim();
    }

    async dismiss() {
        await click('[data-test-toast-close]');
    }

    async clickLink() {
        await click('[data-test-toast-link]');
    }

    async waitForToast() {
        await waitFor('[data-test-toast="whats-new"]', {timeout: 5000});
    }
}

class WhatsNewModal {
    get isVisible() {
        return !!find('[data-test-modal="whats-new"]');
    }

    get title() {
        return find('[data-test-modal-title]')?.textContent.trim();
    }

    get entries() {
        return [...document.querySelectorAll('[data-test-entry]')].map(el => ({
            title: el.querySelector('[data-test-entry-title]')?.textContent.trim(),
            excerpt: el.querySelector('[data-test-entry-excerpt]')?.textContent.trim(),
            hasImage: !!el.querySelector('[data-test-entry-image]')
        }));
    }

    async open() {
        await click('[data-test-nav="arrow-down"]');
        await click('[data-test-nav="whatsnew"]');
        await waitFor('[data-test-modal="whats-new"]', {timeout: 5000});
    }

    async close() {
        await triggerKeyEvent(document, 'keydown', 'Escape');
    }
}

describe('Acceptance: What\'s new', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    // Changelog entry fixtures
    const ENTRIES = {
        newFeatured: {
            title: 'New Featured Update',
            custom_excerpt: 'This is an exciting new feature',
            published_at: '2024-01-15T12:00:00.000+00:00',
            url: 'https://ghost.org/changelog/new-feature',
            featured: true
        },
        old: {
            title: 'Old Update',
            custom_excerpt: 'This is old',
            published_at: '2018-12-01T12:00:00.000+00:00',
            url: 'https://ghost.org/changelog/old-feature',
            featured: true
        },
        newNonFeatured: {
            title: 'Non-Featured Update',
            custom_excerpt: 'This is not featured',
            published_at: '2024-01-15T12:00:00.000+00:00',
            url: 'https://ghost.org/changelog/regular-feature',
            featured: false
        },
        newRegular: {
            title: 'New Update',
            custom_excerpt: 'New feature',
            published_at: '2024-01-15T12:00:00.000+00:00',
            url: 'https://ghost.org/changelog/new',
            featured: false
        },
        latest: {
            title: 'Latest Update',
            custom_excerpt: 'Latest feature',
            published_at: '2024-01-15T12:00:00.000+00:00',
            url: 'https://ghost.org/changelog/latest',
            featured: true,
            feature_image: 'https://ghost.org/image1.jpg'
        },
        previous: {
            title: 'Previous Update',
            custom_excerpt: 'Previous feature',
            published_at: '2024-01-10T12:00:00.000+00:00',
            url: 'https://ghost.org/changelog/previous',
            featured: false
        },
        latestNonFeatured: {
            title: 'Latest Update',
            custom_excerpt: 'Latest feature',
            published_at: '2024-01-15T12:00:00.000+00:00',
            url: 'https://ghost.org/changelog/latest',
            featured: false
        }
    };

    // Helper to mock changelog endpoint
    function mockChangelog(server, entries) {
        server.get('https://ghost.org/changelog.json', function () {
            return {
                posts: entries,
                changelogUrl: 'https://ghost.org/changelog/'
            };
        });
    }

    beforeEach(async function () {
        // Create default user for most tests
        const role = this.server.create('role', {name: 'Owner'});
        this.user = this.server.create('user', {
            id: '1',
            roles: [role],
            accessibility: JSON.stringify({
                whatsNew: {
                    lastSeenDate: '2019-01-01 00:00:00'
                }
            })
        });

        await authenticateSession();
    });

    describe('toast notification', function () {
        let toast;

        beforeEach(function () {
            toast = new WhatsNewToast();
        });

        it('shows toast with latest entry when there are new featured entries', async function () {
            mockChangelog(this.server, [ENTRIES.newFeatured]);

            await visit('/site');

            await toast.waitForToast();

            expect(toast.isVisible).to.be.true;
            expect(toast.title).to.equal('New Featured Update');
            expect(toast.excerpt).to.equal('This is an exciting new feature');
        });

        const noToastTestCases = [
            {
                description: 'does not show toast when there are no new entries',
                entries: [ENTRIES.old]
            },
            {
                description: 'does not show toast when there are no entries at all',
                entries: []
            },
            {
                description: 'does not show toast when latest entry is not featured',
                entries: [ENTRIES.newNonFeatured]
            }
        ];

        noToastTestCases.forEach(({description, entries}) => {
            it(description, async function () {
                mockChangelog(this.server, entries);

                await visit('/site');

                expect(toast.isVisible).to.be.false;
            });
        });

        it('does not show toast for new users and initializes lastSeenDate to today', async function () {
            // Create a new user without whatsNew.lastSeenDate
            this.server.schema.users.find(this.user.id).update({
                accessibility: JSON.stringify({})
            });

            mockChangelog(this.server, [ENTRIES.newFeatured]);

            await visit('/site');

            // No toast should appear because lastSeenDate is set to today
            expect(toast.isVisible).to.be.false;

            // Verify lastSeenDate was initialized to today in ISO format
            const updatedUser = this.server.schema.users.find(this.user.id);
            const accessibility = JSON.parse(updatedUser.accessibility);
            expect(accessibility.whatsNew.lastSeenDate).to.exist;

            const lastSeenMoment = moment.utc(accessibility.whatsNew.lastSeenDate);
            expect(lastSeenMoment.isValid()).to.be.true;
            expect(lastSeenMoment.isSame(moment.utc(), 'day')).to.be.true;
        });

        it('updates lastSeenDate when toast is dismissed', async function () {
            mockChangelog(this.server, [ENTRIES.newFeatured]);

            await visit('/site');
            await toast.waitForToast();

            expect(toast.isVisible).to.be.true;

            await toast.dismiss();

            // The toast disappears immediately
            expect(toast.isVisible).to.be.false;

            // Re-visit the page, the toast is gone
            await visit('/site');

            expect(toast.isVisible).to.be.false;
        });

        it('updates lastSeenDate when toast link is clicked', async function () {
            mockChangelog(this.server, [ENTRIES.newFeatured]);

            await visit('/site');
            await toast.waitForToast();

            await toast.clickLink();

            // Re-visit the page, the toast is gone
            await visit('/site');

            expect(toast.isVisible).to.be.false;
        });
    });

    describe('What\'s new modal', function () {
        let toast;
        let modal;

        beforeEach(function () {
            toast = new WhatsNewToast();
            modal = new WhatsNewModal();
        });

        it('shows modal with all entries when opened from user menu', async function () {
            mockChangelog(this.server, [ENTRIES.latest, ENTRIES.previous]);

            await visit('/site');

            await modal.open();

            expect(modal.isVisible).to.be.true;
            expect(modal.title).to.match(/What.?s new\?/); // Match both straight and curly apostrophes
            expect(modal.entries.length).to.equal(2);

            // Verify first entry
            expect(modal.entries[0].title).to.equal('Latest Update');
            expect(modal.entries[0].excerpt).to.equal('Latest feature');
            expect(modal.entries[0].hasImage).to.be.true;

            // Verify second entry
            expect(modal.entries[1].title).to.equal('Previous Update');
            expect(modal.entries[1].excerpt).to.equal('Previous feature');
        });

        it('dismisses the toasts after opened', async function () {
            mockChangelog(this.server, [ENTRIES.latest, ENTRIES.previous]);

            await visit('/site');

            // Confirm the toast is visible
            await toast.waitForToast();
            expect(toast.isVisible).to.be.true;

            // Open and close the modal
            await modal.open();
            await modal.close();

            // After closing the modal, the toast isn't there
            expect(toast.isVisible).to.be.false;

            // Reload the page, the toast is still dismissed
            await visit('/site');

            expect(toast.isVisible).to.be.false;
        });

        // Note: Testing contributor-specific behavior would require resetting the session
        // which adds complexity. The template logic (in footer.hbs) already prevents
        // contributors from seeing the What's new menu item via {{#unless session.user.isContributor}}
    });

    describe('What\'s new badge indicators', function () {
        it('shows badge on user avatar when there are new non-featured entries', async function () {
            mockChangelog(this.server, [ENTRIES.newRegular]);

            await visit('/site');

            // Verify badge is shown on avatar
            expect(find('.gh-user-avatar .gh-whats-new-badge-account')).to.exist;
        });

        it('shows badge in user menu when there are new entries', async function () {
            mockChangelog(this.server, [ENTRIES.newRegular]);

            await visit('/site');

            // Open user menu
            await click('[data-test-nav="arrow-down"]');

            // Verify badge is shown in menu
            expect(find('[data-test-nav="whatsnew"] .bg-green')).to.exist;
        });

        it('does not show badges when there are no new entries', async function () {
            mockChangelog(this.server, [ENTRIES.old]);

            await visit('/site');

            // Verify no badge on avatar
            expect(find('.gh-user-avatar .gh-whats-new-badge-account')).to.not.exist;

            // Open user menu
            await click('[data-test-nav="arrow-down"]');

            // Verify no badge in menu
            expect(find('[data-test-nav="whatsnew"] .bg-green')).to.not.exist;
        });

        it('removes badges after viewing What\'s new', async function () {
            const modal = new WhatsNewModal();
            mockChangelog(this.server, [ENTRIES.newRegular]);

            await visit('/site');

            // Verify badge exists initially
            expect(find('.gh-user-avatar .gh-whats-new-badge-account')).to.exist;

            await modal.open();

            await modal.close();

            // The badge should be removed after viewing (lastSeenDate is updated)
            // We verify this by checking the user's accessibility settings were updated
            const updatedUser = this.server.schema.users.find(this.user.id);
            const accessibility = JSON.parse(updatedUser.accessibility);
            expect(accessibility.whatsNew.lastSeenDate).to.equal(ENTRIES.newRegular.published_at);
        });
    });
});
