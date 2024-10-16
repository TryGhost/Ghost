import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, fillIn, find, triggerKeyEvent, visit} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

// keyCodes
const KEY_S = 83;

describe('Acceptance: Custom Post Templates', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('settings','configs');

        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
    });

    describe('with custom templates', function () {
        beforeEach(function () {
            this.server.create('theme', {
                active: true,
                name: 'example-theme',
                package: {
                    name: 'Example Theme',
                    version: '0.1'
                },
                templates: [
                    {
                        filename: 'custom-news-bulletin.hbs',
                        name: 'News Bulletin',
                        for: ['post', 'page'],
                        slug: null
                    },
                    {
                        filename: 'custom-big-images.hbs',
                        name: 'Big Images',
                        for: ['post', 'page'],
                        slug: null
                    },
                    {
                        filename: 'post-one.hbs',
                        name: 'One',
                        for: ['post'],
                        slug: 'one'
                    },
                    {
                        filename: 'page-about.hbs',
                        name: 'About',
                        for: ['page'],
                        slug: 'about'
                    }
                ]
            });
        });

        it('can change selected template', async function () {
            let post = this.server.create('post', {customTemplate: 'custom-news-bulletin.hbs'});

            await visit('/editor/post/1');
            await click('[data-test-psm-trigger]');

            // template form should be shown
            expect(find('[data-test-custom-template-form]')).to.exist;

            // custom template should be selected
            let select = find('[data-test-select="custom-template"]');
            expect(select.value, 'selected value').to.equal('custom-news-bulletin.hbs');

            // templates list should contain default and custom templates in alphabetical order
            expect(select.options.length).to.equal(3);
            expect(select.options.item(0).value, 'default value').to.equal('');
            expect(select.options.item(0).text, 'default text').to.equal('Default');
            expect(select.options.item(1).value, 'first custom value').to.equal('custom-big-images.hbs');
            expect(select.options.item(1).text, 'first custom text').to.equal('Big Images');
            expect(select.options.item(2).value, 'second custom value').to.equal('custom-news-bulletin.hbs');
            expect(select.options.item(2).text, 'second custom text').to.equal('News Bulletin');

            // select the default template
            await fillIn(select, '');

            // save then check server record
            await triggerKeyEvent('.gh-app', 'keydown', KEY_S, {
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            expect(
                this.server.db.posts.find(post.id).customTemplate,
                'saved custom template'
            ).to.equal('');
        });

        it('disables template selector if slug matches slug-based template');

        it('doesn\'t query themes endpoint unncessarily', async function () {
            // eslint-disable-next-line
            let themeRequests = () => {
                return this.server.pretender.handledRequests.filter(function (request) {
                    return request.url.match(/\/themes\//);
                });
            };

            this.server.create('post', {customTemplate: 'custom-news-bulletin.hbs'});

            await visit('/editor/post/1');
            await click('[data-test-psm-trigger]');

            expect(themeRequests().length, 'after first open').to.equal(1);

            await click('[data-test-psm-trigger]'); // hide
            await click('[data-test-psm-trigger]'); // show

            expect(themeRequests().length, 'after second open').to.equal(1);
        });
    });

    describe('without custom templates', function () {
        beforeEach(function () {
            this.server.create('theme', {
                active: true,
                name: 'example-theme',
                package: {
                    name: 'Example Theme',
                    version: '0.1'
                },
                templates: []
            });
        });

        it('doesn\'t show template selector', async function () {
            this.server.create('post', {customTemplate: 'custom-news-bulletin.hbs'});

            await visit('/editor/post/1');
            await click('[data-test-psm-trigger]');

            // template form should be shown
            expect(find('[data-test-custom-template-form]')).to.not.exist;
        });
    });
});
