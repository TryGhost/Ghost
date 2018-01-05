import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from 'ghost-admin/tests/helpers/destroy-app';
import startApp from 'ghost-admin/tests/helpers/start-app';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {click, fillIn, find, keyEvent, visit} from 'ember-native-dom-helpers';
import {expect} from 'chai';

// keyCodes
const KEY_S = 83;

describe('Acceptance: Custom Post Templates', function () {
    let application;

    beforeEach(function () {
        application = startApp();

        server.loadFixtures('settings');

        let role = server.create('role', {name: 'Administrator'});
        server.create('user', {roles: [role]});

        authenticateSession(application);
    });

    afterEach(function () {
        destroyApp(application);
    });

    describe('with custom templates', function () {
        beforeEach(function () {
            server.create('theme', {
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
            let post = server.create('post', {customTemplate: 'custom-news-bulletin.hbs'});

            await visit('/editor/1');
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
            await keyEvent('.gh-app', 'keydown', KEY_S, {
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            expect(
                server.db.posts.find(post.id).customTemplate,
                'saved custom template'
            ).to.equal('');
        });

        it('disables template selector if slug matches slug-based template');

        it('doesn\'t query themes endpoint unncessarily', async function () {
            function themeRequests() {
                return server.pretender.handledRequests.filter(function (request) {
                    return request.url.match(/\/themes\//);
                });
            }

            server.create('post', {customTemplate: 'custom-news-bulletin.hbs'});

            await visit('/editor/1');
            await click('[data-test-psm-trigger]');

            expect(themeRequests().length, 'after first open').to.equal(1);

            await click('[data-test-psm-trigger]'); // hide
            await click('[data-test-psm-trigger]'); // show

            expect(themeRequests().length, 'after second open').to.equal(1);
        });
    });

    describe('without custom templates', function () {
        beforeEach(function () {
            server.create('theme', {
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
            server.create('post', {customTemplate: 'custom-news-bulletin.hbs'});

            await visit('/editor/1');
            await click('[data-test-psm-trigger]');

            // template form should be shown
            expect(find('[data-test-custom-template-form]')).to.not.exist;
        });
    });
});
