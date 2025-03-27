import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import moment from 'moment-timezone';
import sinon from 'sinon';
import {Response} from 'miragejs';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentRouteName, currentURL, fillIn, find, findAll, triggerEvent, typeIn, waitFor} from '@ember/test-helpers';
import {datepickerSelect} from 'ember-power-datepicker/test-support';
import {editorSelector, pasteInEditor, titleSelector} from '../helpers/editor';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {selectChoose} from 'ember-power-select/test-support';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

// TODO: update ember-power-datepicker to expose modern test helpers
// https://github.com/cibernox/ember-power-datepicker/issues/30

describe('Acceptance: Editor', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
    });

    it('redirects to signin when not authenticated', async function () {
        let author = this.server.create('user'); // necessary for post-author association
        this.server.create('post', {authors: [author]});

        await invalidateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('does not redirect to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        let author = this.server.create('user', {roles: [role], slug: 'test-user'});
        this.server.create('post', {authors: [author]});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');
    });

    it('does not redirect to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        let author = this.server.create('user', {roles: [role], slug: 'test-user'});
        this.server.create('post', {authors: [author]});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');
    });

    it('does not redirect to staff page when authenticated as editor', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        let author = this.server.create('user', {roles: [role], slug: 'test-user'});
        this.server.create('post', {authors: [author]});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');
    });

    it('does not redirect to staff page when authenticated as super editor', async function () {
        let role = this.server.create('role', {name: 'Super Editor'});
        let author = this.server.create('user', {roles: [role], slug: 'test-user'});
        this.server.create('post', {authors: [author]});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');
    });
    
    it('displays 404 when post does not exist', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/editor/post/1');

        expect(currentRouteName()).to.equal('error404');
        expect(currentURL()).to.equal('/editor/post/1');
    });

    it('when logged in as a contributor, renders a save button instead of a publish menu & hides tags input', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        let author = this.server.create('user', {roles: [role]});
        this.server.createList('post', 2, {authors: [author]});
        this.server.loadFixtures('settings');
        await authenticateSession();

        // post id 1 is a draft, checking for draft behaviour now
        await visit('/editor/post/1');

        expect(currentURL(), 'currentURL').to.equal('/editor/post/1');

        // Expect publish menu to not exist
        expect(
            find('[data-test-publishmenu-trigger]'),
            'publish menu trigger'
        ).to.not.exist;

        // Open post settings menu
        await click('[data-test-psm-trigger]');

        // Check to make sure that tags input doesn't exist
        expect(
            find('[data-test-token-input]'),
            'tags input'
        ).to.not.exist;

        // post id 2 is published, we should be redirected to index
        await visit('/editor/post/2');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    describe('when logged in', function () {
        let author;

        beforeEach(async function () {
            this.server.loadFixtures();
            let role = this.server.create('role', {name: 'Administrator'});
            author = this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        describe('post settings menu', function () {
            it('can set publish date', async function () {
                let [post1] = this.server.createList('post', 2, {authors: [author]});
                let futureTime = moment().tz('Etc/UTC').add(10, 'minutes');

                // sanity check
                expect(
                    moment(post1.publishedAt).tz('Etc/UTC').format('YYYY-MM-DD HH:mm:ss'),
                    'initial publishedAt sanity check')
                    .to.equal('2015-12-19 16:25:07');

                // post id 1 is a draft, checking for draft behaviour now
                await visit('/editor/post/1');

                // open post settings menu
                await click('[data-test-psm-trigger]');

                // should error, if the publish time is in the wrong format
                await fillIn('[data-test-date-time-picker-time-input]', 'foo');
                await blur('[data-test-date-time-picker-time-input]');

                expect(find('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for invalid time')
                    .to.equal('Must be in format: "15:00"');

                // should error, if the publish time is in the future
                // NOTE: date must be selected first, changing the time first will save
                // with the new time
                await fillIn('[data-test-date-time-picker-datepicker] input', moment.tz('Etc/UTC').add(1, 'day').format('YYYY-MM-DD'));
                await blur('[data-test-date-time-picker-datepicker] input');
                await fillIn('[data-test-date-time-picker-time-input]', futureTime.format('HH:mm'));
                await blur('[data-test-date-time-picker-time-input]');

                expect(find('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for future time')
                    .to.equal('Please choose a past date and time.');

                // closing the PSM will reset the invalid date/time
                await click('[data-test-psm-trigger]');
                await click('[data-test-psm-trigger]');

                expect(
                    find('[data-test-date-time-picker-error]'),
                    'date picker error after closing PSM'
                ).to.not.exist;

                expect(
                    find('[data-test-date-time-picker-date-input]').value,
                    'PSM date value after closing with invalid date'
                ).to.equal(moment(post1.publishedAt).tz('Etc/UTC').format('YYYY-MM-DD'));

                expect(
                    find('[data-test-date-time-picker-time-input]').value,
                    'PSM time value after closing with invalid date'
                ).to.equal(moment(post1.publishedAt).tz('Etc/UTC').format('HH:mm'));

                // saves the post with the new date
                let validTime = moment('2017-04-09 12:00');
                await fillIn('[data-test-date-time-picker-time-input]', validTime.format('HH:mm'));
                await blur('[data-test-date-time-picker-time-input]');
                await datepickerSelect('[data-test-date-time-picker-datepicker]', validTime.toDate());

                expect(moment(post1.publishedAt).tz('Etc/UTC').format('YYYY-MM-DD HH:mm:ss')).to.equal('2017-04-09 12:00:00');
            });
        });

        it.skip('handles title validation errors correctly', async function () {
            this.server.create('post', {authors: [author]});

            // post id 1 is a draft, checking for draft behaviour now
            await visit('/editor/post/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/post/1');

            await fillIn('[data-test-editor-title-input]', Array(260).join('a'));
            await click('[data-test-publishmenu-trigger]');
            await click('[data-test-publishmenu-save]');

            expect(
                findAll('.gh-alert').length,
                'number of alerts after invalid title'
            ).to.equal(1);

            expect(
                find('.gh-alert').textContent,
                'alert text after invalid title'
            ).to.match(/Title cannot be longer than 255 characters/);
        });

        it('renders first countdown notification before scheduled time', async function () {
            let clock = sinon.useFakeTimers(moment().valueOf());
            let compareDate = moment().tz('Etc/UTC').add(4, 'minutes');
            let compareDateString = compareDate.format('YYYY-MM-DD');
            let compareTimeString = compareDate.format('HH:mm');
            this.server.create('post', {publishedAt: moment.utc().add(4, 'minutes'), status: 'scheduled', authors: [author]});
            this.server.create('setting', {timezone: 'Europe/Dublin'});
            clock.restore();

            await visit('/editor/post/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/post/1');

            await click('[data-test-psm-trigger]');

            expect(find('[data-test-date-time-picker-date-input]').value, 'scheduled date')
                .to.equal(compareDateString);
            expect(find('[data-test-date-time-picker-time-input]').value, 'scheduled time')
                .to.equal(compareTimeString);
            // expect countdown to show warning, that post is scheduled to be published
            await triggerEvent('[data-test-editor-post-status]', 'mouseover');
            expect(find('[data-test-schedule-countdown]').textContent.trim(), 'notification countdown')
                .to.match(/to be published\s+in (4|5) minutes/);
        });

        it('shows author token input and allows changing of authors in PSM', async function () {
            let adminRole = this.server.create('role', {name: 'Administrator'});
            let authorRole = this.server.create('role', {name: 'Author'});
            let user1 = this.server.create('user', {name: 'Primary', roles: [adminRole]});
            this.server.create('user', {name: 'Waldo', roles: [authorRole]});
            this.server.create('post', {authors: [user1]});

            await visit('/editor/post/1');

            expect(currentURL(), 'currentURL')
                .to.equal('/editor/post/1');

            await click('[data-test-psm-trigger]');

            let tokens = findAll('[data-test-input="authors"] .ember-power-select-multiple-option');

            expect(tokens.length).to.equal(1);
            expect(tokens[0].textContent.trim()).to.have.string('Primary');

            await selectChoose('[data-test-input="authors"]', 'Waldo');

            let savedAuthors = this.server.schema.posts.find('1').authors.models;

            expect(savedAuthors.length).to.equal(2);
            expect(savedAuthors[0].name).to.equal('Primary');
            expect(savedAuthors[1].name).to.equal('Waldo');
        });

        it('saves post settings fields', async function () {
            let post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);

            // TODO: implement tests for other fields

            await click('[data-test-psm-trigger]');

            // excerpt has validation
            await fillIn('[data-test-field="custom-excerpt"]', Array(302).join('a'));
            await blur('[data-test-field="custom-excerpt"]');

            expect(
                find('[data-test-error="custom-excerpt"]').textContent.trim(),
                'excerpt too long error'
            ).to.match(/cannot be longer than 300/);

            expect(
                this.server.db.posts.find(post.id).customExcerpt,
                'saved excerpt after validation error'
            ).to.be.null;

            // changing custom excerpt auto-saves
            await fillIn('[data-test-field="custom-excerpt"]', 'Testing excerpt');
            await blur('[data-test-field="custom-excerpt"]');

            expect(
                this.server.db.posts.find(post.id).customExcerpt,
                'saved excerpt'
            ).to.equal('Testing excerpt');

            // -------

            // open code injection subview
            await click('[data-test-button="codeinjection"]');

            // header injection has validation
            let headerCM = find('[data-test-field="codeinjection-head"] .CodeMirror').CodeMirror;
            await headerCM.setValue(Array(65540).join('a'));
            await click(headerCM.getInputField());
            await blur(headerCM.getInputField());

            expect(
                find('[data-test-error="codeinjection-head"]').textContent.trim(),
                'header injection too long error'
            ).to.match(/cannot be longer than 65535/);

            expect(
                this.server.db.posts.find(post.id).codeinjectionHead,
                'saved header injection after validation error'
            ).to.be.null;

            // changing header injection auto-saves
            await headerCM.setValue('<script src="http://example.com/inject-head.js"></script>');
            await click(headerCM.getInputField());
            await blur(headerCM.getInputField());

            expect(
                this.server.db.posts.find(post.id).codeinjectionHead,
                'saved header injection'
            ).to.equal('<script src="http://example.com/inject-head.js"></script>');

            // footer injection has validation
            let footerCM = find('[data-test-field="codeinjection-foot"] .CodeMirror').CodeMirror;
            await footerCM.setValue(Array(65540).join('a'));
            await click(footerCM.getInputField());
            await blur(footerCM.getInputField());

            expect(
                find('[data-test-error="codeinjection-foot"]').textContent.trim(),
                'footer injection too long error'
            ).to.match(/cannot be longer than 65535/);

            expect(
                this.server.db.posts.find(post.id).codeinjectionFoot,
                'saved footer injection after validation error'
            ).to.be.null;

            // changing footer injection auto-saves
            await footerCM.setValue('<script src="http://example.com/inject-foot.js"></script>');
            await click(footerCM.getInputField());
            await blur(footerCM.getInputField());

            expect(
                this.server.db.posts.find(post.id).codeinjectionFoot,
                'saved footer injection'
            ).to.equal('<script src="http://example.com/inject-foot.js"></script>');

            // closing subview switches back to main PSM view
            await click('[data-test-button="close-psm-subview"]');

            expect(
                findAll('[data-test-field="codeinjection-head"]').length,
                'header injection not present after closing subview'
            ).to.equal(0);

            // -------

            // open twitter data subview
            await click('[data-test-button="twitter-data"]');

            // twitter title has validation
            await click('[data-test-field="twitter-title"]');
            await fillIn('[data-test-field="twitter-title"]', Array(302).join('a'));
            await blur('[data-test-field="twitter-title"]');

            expect(
                find('[data-test-error="twitter-title"]').textContent.trim(),
                'twitter title too long error'
            ).to.match(/cannot be longer than 300/);

            expect(
                this.server.db.posts.find(post.id).twitterTitle,
                'saved twitter title after validation error'
            ).to.be.null;

            // changing twitter title auto-saves
            // twitter title has validation
            await click('[data-test-field="twitter-title"]');
            await fillIn('[data-test-field="twitter-title"]', 'Test Twitter Title');
            await blur('[data-test-field="twitter-title"]');

            expect(
                this.server.db.posts.find(post.id).twitterTitle,
                'saved twitter title'
            ).to.equal('Test Twitter Title');

            // twitter description has validation
            await click('[data-test-field="twitter-description"]');
            await fillIn('[data-test-field="twitter-description"]', Array(505).join('a'));
            await blur('[data-test-field="twitter-description"]');

            expect(
                find('[data-test-error="twitter-description"]').textContent.trim(),
                'twitter description too long error'
            ).to.match(/cannot be longer than 500/);

            expect(
                this.server.db.posts.find(post.id).twitterDescription,
                'saved twitter description after validation error'
            ).to.be.null;

            // changing twitter description auto-saves
            // twitter description has validation
            await click('[data-test-field="twitter-description"]');
            await fillIn('[data-test-field="twitter-description"]', 'Test Twitter Description');
            await blur('[data-test-field="twitter-description"]');

            expect(
                this.server.db.posts.find(post.id).twitterDescription,
                'saved twitter description'
            ).to.equal('Test Twitter Description');

            // closing subview switches back to main PSM view
            await click('[data-test-button="close-psm-subview"]');

            expect(
                findAll('[data-test-field="twitter-title"]').length,
                'twitter title not present after closing subview'
            ).to.equal(0);

            // -------

            // open facebook data subview
            await click('[data-test-button="facebook-data"]');

            // facebook title has validation
            await click('[data-test-field="og-title"]');
            await fillIn('[data-test-field="og-title"]', Array(302).join('a'));
            await blur('[data-test-field="og-title"]');

            expect(
                find('[data-test-error="og-title"]').textContent.trim(),
                'facebook title too long error'
            ).to.match(/cannot be longer than 300/);

            expect(
                this.server.db.posts.find(post.id).ogTitle,
                'saved facebook title after validation error'
            ).to.be.null;

            // changing facebook title auto-saves
            // facebook title has validation
            await click('[data-test-field="og-title"]');
            await fillIn('[data-test-field="og-title"]', 'Test Facebook Title');
            await blur('[data-test-field="og-title"]');

            expect(
                this.server.db.posts.find(post.id).ogTitle,
                'saved facebook title'
            ).to.equal('Test Facebook Title');

            // facebook description has validation
            await click('[data-test-field="og-description"]');
            await fillIn('[data-test-field="og-description"]', Array(505).join('a'));
            await blur('[data-test-field="og-description"]');

            expect(
                find('[data-test-error="og-description"]').textContent.trim(),
                'facebook description too long error'
            ).to.match(/cannot be longer than 500/);

            expect(
                this.server.db.posts.find(post.id).ogDescription,
                'saved facebook description after validation error'
            ).to.be.null;

            // changing facebook description auto-saves
            // facebook description has validation
            await click('[data-test-field="og-description"]');
            await fillIn('[data-test-field="og-description"]', 'Test Facebook Description');
            await blur('[data-test-field="og-description"]');

            expect(
                this.server.db.posts.find(post.id).ogDescription,
                'saved facebook description'
            ).to.equal('Test Facebook Description');

            // closing subview switches back to main PSM view
            await click('[data-test-button="close-psm-subview"]');

            expect(
                findAll('[data-test-field="og-title"]').length,
                'facebook title not present after closing subview'
            ).to.equal(0);
        });

        it('handles in-editor excerpt update and validation', async function () {
            enableLabsFlag(this.server, 'editorExcerpt');

            let post = this.server.create('post', {authors: [author], customExcerpt: 'Existing excerpt'});

            await visit(`/editor/post/${post.id}`);

            expect(find('[data-test-textarea="excerpt"]'), 'initial textarea').to.be.visible;
            expect(find('[data-test-textarea="excerpt"]'), 'initial textarea').to.have.value('Existing excerpt');

            await fillIn('[data-test-textarea="excerpt"]', 'New excerpt');
            expect(find('[data-test-textarea="excerpt"]'), 'updated textarea').to.have.value('New excerpt');

            await triggerEvent('[data-test-textarea="excerpt"]', 'keydown', {
                key: 's',
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            expect(post.customExcerpt, 'saved excerpt').to.equal('New excerpt');

            await fillIn('[data-test-textarea="excerpt"]', Array(302).join('a'));

            expect(find('[data-test-error="excerpt"]'), 'excerpt error').to.exist;
            expect(find('[data-test-error="excerpt"]')).to.have.trimmed.text('Excerpt cannot be longer than 300 characters.');

            await fillIn('[data-test-textarea="excerpt"]', Array(300).join('a'));

            expect(find('[data-test-error="excerpt"]'), 'excerpt error').to.not.exist;
        });

        // https://github.com/TryGhost/Ghost/issues/11786
        // NOTE: Flaky test with moving to Lexical editor, skipping for now
        it.skip('save shortcut works when tags/authors field is focused', async function () {
            let post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);
            await fillIn('[data-test-editor-title-input]', 'CMD-S Test');

            await click('[data-test-psm-trigger]');
            await click('[data-test-token-input]');

            await triggerEvent('[data-test-token-input]', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            // Check if save request has been sent correctly.
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            let body = JSON.parse(lastRequest.requestBody);
            expect(body.posts[0].title).to.equal('CMD-S Test');
        });

        // https://github.com/TryGhost/Ghost/issues/15391
        it('can handle many tags in PSM tags input', async function () {
            this.server.createList('tag', 1000);
            let post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);
            await click('[data-test-psm-trigger]');
            await click('[data-test-token-input]');

            // by filtering to `Tag 100` it means we start with a long list that is reduced
            // which is what triggers the slowdown/error
            await fillIn('[data-test-token-input] input', 'Tag 10');
            await typeIn('[data-test-token-input] input', '0');
            await blur('[data-test-token-input] input');

            // no expects, will throw with an error and fail when it hits the bug
        });

        it('renders a breadcrumb back to the post list', async function () {
            let post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);

            expect(
                find('[data-test-breadcrumb]').textContent.trim(),
                'breadcrumb text'
            ).to.contain('Posts');

            expect(
                find('[data-test-breadcrumb]').getAttribute('href'),
                'breadcrumb link'
            ).to.equal('/ghost/posts');
        });

        it('renders a breadcrumb back to the analytics list if that\'s where we came from ', async function () {
            let post = this.server.create('post', {
                authors: [author],
                status: 'published',
                title: 'Published Post'
            });

            // visit the analytics page for the post
            await visit(`/posts/analytics/${post.id}`);
            // now visit the editor for the same post
            await visit(`/editor/post/${post.id}`);

            // Breadcrumbs should point back to Analytics page
            expect(
                find('[data-test-breadcrumb]').textContent.trim(),
                'breadcrumb text'
            ).to.contain('Analytics');

            expect(
                find('[data-test-breadcrumb]').getAttribute('href'),
                'breadcrumb link'
            ).to.equal(`/ghost/posts/analytics/${post.id}`);
        });

        it('does not render analytics breadcrumb for a new post', async function () {
            const post = this.server.create('post', {
                authors: [author],
                status: 'published',
                title: 'Published Post'
            });

            // visit the analytics page for the post
            await visit(`/posts/analytics/${post.id}`);
            // start a new post
            await visit('/editor/post');

            // Breadcrumbs should not contain Analytics link
            expect(find('[data-test-breadcrumb]'), 'breadcrumb text').to.contain.text('Posts');
            expect(find('[data-test-editor-post-status]')).to.contain.text('New');
        });

        it('updates slug when title changes without blur', async function () {
            let post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);
            await fillIn('[data-test-editor-title-input]', 'Test Title');

            await triggerEvent('[data-test-editor-title-input]', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            let body = JSON.parse(lastRequest.requestBody);
            expect(body.posts[0].slug).to.equal('test-title');
            expect(post.slug).to.equal('test-title');
        });

        it('handles TKs in title', async function () {
            let post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);

            expect(
                find('[data-test-editor-title-input]').value,
                'initial title'
            ).to.equal('Post 0');

            await fillIn('[data-test-editor-title-input]', 'Test TK Title');

            expect(
                find('[data-test-editor-title-input]').value,
                'title after typing'
            ).to.equal('Test TK Title');

            // check for TK indicator
            expect(
                find('[data-testid="tk-indicator"]'),
                'TK indicator text'
            ).to.exist;

            // click publish to see if confirmation comes up
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-modal="tk-reminder"]'),
                'TK reminder modal'
            ).to.exist;
        });

        it('handles TKs in excerpt', async function () {
            enableLabsFlag(this.server, 'editorExcerpt');

            const post = this.server.create('post', {authors: [author]});

            await visit(`/editor/post/${post.id}`);

            expect(
                find('[data-test-textarea="excerpt"]').value,
                'initial excerpt'
            ).to.equal('');

            await fillIn('[data-test-textarea="excerpt"]', 'Test TK excerpt');

            expect(
                find('[data-test-textarea="excerpt"]').value,
                'excerpt after typing'
            ).to.equal('Test TK excerpt');

            // check for TK indicator
            expect(
                find('[data-testid="tk-indicator-excerpt"]'),
                'TK indicator text'
            ).to.exist;

            // click publish to see if confirmation comes up
            await click('[data-test-button="publish-flow"]');

            expect(
                find('[data-test-modal="tk-reminder"]'),
                'TK reminder modal'
            ).to.exist;
        });

        // We shouldn't ever see 404s from the API but we do/have had a bug where
        // a new post can enter a state where it appears saved but hasn't hit
        // the API to create the post meaning it has no ID but the store is
        // making PUT requests rather than a POST request in which case it's
        // hitting `/posts/` rather than `/posts/:id` and receiving a 404. On top
        // of that our application error handler was erroring because there was
        // no transition alongside the error so this test makes sure that works
        // and we enter a visible error state rather than letting unsaved changes
        // pile up and contributing to larger potential data loss.
        it('handles 404 from invalid PUT API request', async function () {
            this.server.put('/posts/', () => {
                return new Response(404, {}, {
                    errors: [
                        {
                            message: 'Resource could not be found.',
                            errorType: 'NotFoundError',
                            statusCode: 404
                        }
                    ]
                });
            });

            await visit('/editor/post');
            await waitFor(editorSelector);

            // simulate the bad state where a post.save will trigger a PUT with no id
            const controller = this.owner.lookup('controller:lexical-editor');
            controller.post.transitionTo('updated.uncommitted');

            // this will trigger an autosave which will hit our simulated 404
            await pasteInEditor('Testing');

            // we should see an error - previously this was failing silently
            // error message comes from editor's own handling rather than our generic API error fallback
            expect(find('.gh-alert-content')).to.have.trimmed.text('Saving failed: Editor has crashed. Please copy your content and start a new post.');
        });

        it('handles 404 from valid PUT API request', async function () {
            // this doesn't match what we're actually seeing in the above mentioned
            // bug state but it's a good enough simulation for testing our error handler
            this.server.put('/posts/:id/', () => {
                return new Response(404, {}, {
                    errors: [
                        {
                            message: 'Resource could not be found.',
                            errorType: 'NotFoundError',
                            statusCode: 404
                        }
                    ]
                });
            });

            await visit('/editor/post');
            await waitFor(editorSelector);
            await fillIn(titleSelector, 'Test 404 handling');
            // this triggers the initial creation request - in the actual bug this doesn't happen
            await blur(titleSelector);
            expect(currentRouteName()).to.equal('lexical-editor.edit');
            // this will trigger an autosave which will hit our simulated 404
            await pasteInEditor('Testing');

            // we should see an error - previously this was failing silently
            // error message comes from editor's own handling rather than our generic API error fallback
            expect(find('.gh-alert-content')).to.contain.text('Post has been deleted in a different session');
        });
    });
});
