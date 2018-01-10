/* eslint-disable camelcase */
import Mirage from 'ember-cli-mirage';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from '../../helpers/destroy-app';
import mockThemes from 'ghost-admin/mirage/config/themes';
import startApp from '../../helpers/start-app';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Settings - Design', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            authenticateSession(application);
        });

        it('can visit /settings/design', async function () {
            await visit('/settings/design');

            expect(currentPath()).to.equal('settings.design.index');
            expect(find('[data-test-save-button]').text().trim(), 'save button text').to.equal('Save');

            // fixtures contain two nav items, check for three rows as we
            // should have one extra that's blank
            expect(
                find('.gh-blognav-item').length,
                'navigation items count'
            ).to.equal(3);
        });

        it('saves navigation settings', async function () {
            await visit('/settings/design');
            await fillIn('.gh-blognav-label:first input', 'Test');
            await fillIn('.gh-blognav-url:first input', '/test');
            await triggerEvent('.gh-blognav-url:first input', 'blur');

            await click('[data-test-save-button]');

            let [navSetting] = server.db.settings.where({key: 'navigation'});

            expect(navSetting.value).to.equal('[{"label":"Test","url":"/test/"},{"label":"About","url":"/about"}]');

            // don't test against .error directly as it will pick up failed
            // tests "pre.error" elements
            expect(find('span.error').length, 'error fields count').to.equal(0);
            expect(find('.gh-alert').length, 'alerts count').to.equal(0);
            expect(find('.response:visible').length, 'validation errors count')
                .to.equal(0);
        });

        it('validates new item correctly on save', async function () {
            await visit('/settings/design');

            await click('[data-test-save-button]');

            expect(
                find('.gh-blognav-item').length,
                'number of nav items after saving with blank new item'
            ).to.equal(3);

            await fillIn('.gh-blognav-label:last input', 'Test');
            await fillIn('.gh-blognav-url:last input', 'http://invalid domain/');
            await triggerEvent('.gh-blognav-url:last input', 'blur');

            await click('[data-test-save-button]');

            expect(
                find('.gh-blognav-item').length,
                'number of nav items after saving with invalid new item'
            ).to.equal(3);

            expect(
                find('.gh-blognav-item:last .error').length,
                'number of invalid fields in new item'
            ).to.equal(1);
        });

        it('clears unsaved settings when navigating away but warns with a confirmation dialog', async function () {
            await visit('/settings/design');
            await fillIn('.gh-blognav-label:first input', 'Test');
            await triggerEvent('.gh-blognav-label:first input', 'blur');

            expect(find('.gh-blognav-label:first input').val()).to.equal('Test');
            // this.timeout(0);
            // return pauseTest();

            await visit('/settings/code-injection');

            expect(find('.fullscreen-modal').length, 'modal exists').to.equal(1);

            // Leave without saving
            await (click('.fullscreen-modal [data-test-leave-button]'), 'leave without saving');

            expect(currentURL(), 'currentURL').to.equal('/settings/code-injection');

            await visit('/settings/design');

            expect(find('.gh-blognav-label:first input').val()).to.equal('Home');
        });

        it('can add and remove items', async function () {
            await visit('/settings/design');
            await click('.gh-blognav-add');

            expect(
                find('.gh-blognav-label:last .response').is(':visible'),
                'blank label has validation error'
            ).to.be.true;

            await fillIn('.gh-blognav-label:last input', 'New');
            await triggerEvent('.gh-blognav-label:last input', 'keypress', {});

            expect(
                find('.gh-blognav-label:last .response').is(':visible'),
                'label validation is visible after typing'
            ).to.be.false;

            await fillIn('.gh-blognav-url:last input', '/new');
            await triggerEvent('.gh-blognav-url:last input', 'keypress', {});
            await triggerEvent('.gh-blognav-url:last input', 'blur');

            expect(
                find('.gh-blognav-url:last .response').is(':visible'),
                'url validation is visible after typing'
            ).to.be.false;

            expect(
                find('.gh-blognav-url:last input').val()
            ).to.equal(`${window.location.origin}/new`);

            await click('.gh-blognav-add');

            expect(
                find('.gh-blognav-item').length,
                'number of nav items after successful add'
            ).to.equal(4);

            expect(
                find('.gh-blognav-label:last input').val(),
                'new item label value after successful add'
            ).to.be.blank;

            expect(
                find('.gh-blognav-url:last input').val(),
                'new item url value after successful add'
            ).to.equal(`${window.location.origin}/`);

            expect(
                find('.gh-blognav-item .response:visible').length,
                'number or validation errors shown after successful add'
            ).to.equal(0);

            await click('.gh-blognav-item:first .gh-blognav-delete');

            expect(
                find('.gh-blognav-item').length,
                'number of nav items after successful remove'
            ).to.equal(3);

            // CMD-S shortcut works
            await triggerEvent('.gh-app', 'keydown', {
                keyCode: 83, // s
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            let [navSetting] = server.db.settings.where({key: 'navigation'});

            expect(navSetting.value).to.equal('[{"label":"About","url":"/about"},{"label":"New","url":"/new/"}]');
        });

        it('allows management of themes', async function () {
            // lists available themes + active theme is highlighted

            // theme upload
            // - displays modal
            // - validates mime type
            // - validates casper.zip
            // - handles validation errors
            // - handles upload and close
            // - handles upload and activate
            // - displays overwrite warning if theme already exists

            // theme activation
            // - switches theme

            // theme deletion
            // - displays modal
            // - deletes theme and refreshes list

            server.loadFixtures('themes');
            await visit('/settings/design');

            // lists available themes (themes are specified in mirage/fixtures/settings)
            expect(
                find('[data-test-theme-id]').length,
                'shows correct number of themes'
            ).to.equal(3);

            expect(
                find('[data-test-theme-active="true"] [data-test-theme-title]').text().trim(),
                'Blog theme marked as active'
            ).to.equal('Blog (default)');

            // theme upload displays modal
            await click('[data-test-upload-theme-button]');
            expect(
                find('.fullscreen-modal .modal-content:contains("Upload a theme")').length,
                'theme upload modal displayed after button click'
            ).to.equal(1);

            // cancelling theme upload closes modal
            await click('.fullscreen-modal [data-test-close-button]');
            expect(
                find('.fullscreen-modal').length === 0,
                'upload theme modal is closed when cancelling'
            ).to.be.true;

            // theme upload validates mime type
            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {type: 'text/csv'});
            expect(
                find('.fullscreen-modal .failed').text(),
                'validation error is shown for invalid mime type'
            ).to.match(/is not supported/);

            // theme upload validates casper.zip
            await click('[data-test-upload-try-again-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'casper.zip', type: 'application/zip'});
            expect(
                find('.fullscreen-modal .failed').text(),
                'validation error is shown when uploading casper.zip'
            ).to.match(/default Casper theme cannot be overwritten/);

            // theme upload handles upload errors
            server.post('/themes/upload/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [{
                        message: 'Invalid theme'
                    }]
                });
            });
            await click('[data-test-upload-try-again-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'error.zip', type: 'application/zip'});
            expect(
                find('.fullscreen-modal .failed').text().trim(),
                'validation error is passed through from server'
            ).to.equal('Invalid theme');

            // reset to default mirage handlers
            mockThemes(server);

            // theme upload handles validation errors
            server.post('/themes/upload/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [
                        {
                            message: 'Theme is not compatible or contains errors.',
                            errorType: 'ThemeValidationError',
                            errorDetails: [
                                {
                                    level: 'error',
                                    rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.</p>',
                                    failures: [
                                        {
                                            ref: '/assets/javascripts/ui.js'
                                        }
                                    ]
                                },
                                {
                                    level: 'error',
                                    rule: 'Templates must contain valid Handlebars.',
                                    failures: [
                                        {
                                            ref: 'index.hbs',
                                            message: 'The partial index_meta could not be found'
                                        },
                                        {
                                            ref: 'tag.hbs',
                                            message: 'The partial index_meta could not be found'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            });

            await click('[data-test-upload-try-again-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'bad-theme.zip', type: 'application/zip'});

            expect(
                find('.fullscreen-modal h1').text().trim(),
                'modal title after uploading invalid theme'
            ).to.equal('Invalid theme');

            expect(
                find('.theme-validation-rule-text').text(),
                'top-level errors are displayed'
            ).to.match(/Templates must contain valid Handlebars/);

            await click('[data-test-toggle-details]');

            expect(
                find('.theme-validation-details').text(),
                'top-level errors do not escape HTML'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').text(),
                'individual failures are displayed'
            ).to.match(/\/assets\/javascripts\/ui\.js/);

            // reset to default mirage handlers
            mockThemes(server);

            await click('.fullscreen-modal [data-test-try-again-button]');
            expect(
                find('.theme-validation-errors').length,
                '"Try Again" resets form after theme validation error'
            ).to.equal(0);

            expect(
                find('.gh-image-uploader').length,
                '"Try Again" resets form after theme validation error'
            ).to.equal(1);

            expect(
                find('.fullscreen-modal h1').text().trim(),
                '"Try Again" resets form after theme validation error'
            ).to.equal('Upload a theme');

            // theme upload handles validation warnings
            server.post('/themes/upload/', function ({themes}) {
                let theme = {
                    name: 'blackpalm',
                    package: {
                        name: 'BlackPalm',
                        version: '1.0.0'
                    }
                };

                themes.create(theme);

                theme.warnings = [{
                    level: 'warning',
                    rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.  For more information, please see the <a href="http://themes.ghost.org/docs/asset">asset helper documentation</a>.</p>',
                    failures: [
                        {
                            ref: '/assets/dist/img/apple-touch-icon.png'
                        },
                        {
                            ref: '/assets/dist/img/favicon.ico'
                        },
                        {
                            ref: '/assets/dist/css/blackpalm.min.css'
                        },
                        {
                            ref: '/assets/dist/js/blackpalm.min.js'
                        }
                    ],
                    code: 'GS030-ASSET-REQ'
                }];

                return new Mirage.Response(200, {}, {
                    themes: [theme]
                });
            });

            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'warning-theme.zip', type: 'application/zip'});

            expect(
                find('.fullscreen-modal h1').text().trim(),
                'modal title after uploading theme with warnings'
            ).to.equal('Upload successful with warnings');

            await click('[data-test-toggle-details]');

            expect(
                find('.theme-validation-details').text(),
                'top-level warnings are displayed'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').text(),
                'individual warning failures are displayed'
            ).to.match(/\/assets\/dist\/img\/apple-touch-icon\.png/);

            // reset to default mirage handlers
            mockThemes(server);

            await click('.fullscreen-modal [data-test-close-button]');

            // theme upload handles success then close
            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'theme-1.zip', type: 'application/zip'});

            expect(
                find('.fullscreen-modal h1').text().trim(),
                'modal header after successful upload'
            ).to.equal('Upload successful!');

            expect(
                find('.modal-body').text(),
                'modal displays theme name after successful upload'
            ).to.match(/"Test 1 - 0\.1" uploaded successfully/);

            expect(
                find('[data-test-theme-id]').length,
                'number of themes in list grows after upload'
            ).to.equal(5);

            expect(
                find('[data-test-theme-active="true"] [data-test-theme-title]').text().trim(),
                'newly uploaded theme is not active'
            ).to.equal('Blog (default)');

            await click('.fullscreen-modal [data-test-close-button]');

            // theme upload handles success then activate
            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'theme-2.zip', type: 'application/zip'});
            await click('.fullscreen-modal [data-test-activate-now-button]');

            expect(
                find('[data-test-theme-id]').length,
                'number of themes in list grows after upload and activate'
            ).to.equal(6);

            expect(
                find('[data-test-theme-active="true"] [data-test-theme-title]').text().trim(),
                'newly uploaded+activated theme is active'
            ).to.equal('Test 2');

            // theme activation switches active theme
            await click('[data-test-theme-id="casper"] [data-test-theme-activate-button]');

            expect(
                find('[data-test-theme-id="test-2"] .apps-card-app').hasClass('theme-list-item--active'),
                'previously active theme is not active'
            ).to.be.false;

            expect(
                find('[data-test-theme-id="casper"] .apps-card-app').hasClass('theme-list-item--active'),
                'activated theme is active'
            ).to.be.true;

            // theme activation shows errors
            server.put('themes/:theme/activate', function () {
                return new Mirage.Response(422, {}, {
                    errors: [
                        {
                            message: 'Theme is not compatible or contains errors.',
                            errorType: 'ThemeValidationError',
                            errorDetails: [
                                {
                                    level: 'error',
                                    rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.</p>',
                                    failures: [
                                        {
                                            ref: '/assets/javascripts/ui.js'
                                        }
                                    ]
                                },
                                {
                                    level: 'error',
                                    rule: 'Templates must contain valid Handlebars.',
                                    failures: [
                                        {
                                            ref: 'index.hbs',
                                            message: 'The partial index_meta could not be found'
                                        },
                                        {
                                            ref: 'tag.hbs',
                                            message: 'The partial index_meta could not be found'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            });

            await click('[data-test-theme-id="test-2"] [data-test-theme-activate-button]');

            expect(find('[data-test-theme-warnings-modal]')).to.exist;

            expect(
                find('[data-test-theme-warnings-title]').text().trim(),
                'modal title after activating invalid theme'
            ).to.equal('Activation failed');

            expect(
                find('[data-test-theme-warnings]').text(),
                'top-level errors are displayed in activation errors'
            ).to.match(/Templates must contain valid Handlebars/);

            await click('[data-test-toggle-details]');

            expect(
                find('.theme-validation-details').text(),
                'top-level errors do not escape HTML in activation errors'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').text(),
                'individual failures are displayed in activation errors'
            ).to.match(/\/assets\/javascripts\/ui\.js/);

            // restore default mirage handlers
            mockThemes(server);

            await click('[data-test-modal-close-button]');
            expect(find('[data-test-theme-warnings-modal]')).to.not.exist;

            // theme activation shows warnings
            server.put('themes/:theme/activate', function ({themes}, {params}) {
                themes.all().update('active', false);
                let theme = themes.findBy({name: params.theme}).update({active: true});

                theme.update({warnings: [{
                    level: 'warning',
                    rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.  For more information, please see the <a href="http://themes.ghost.org/docs/asset">asset helper documentation</a>.</p>',
                    failures: [
                        {
                            ref: '/assets/dist/img/apple-touch-icon.png'
                        },
                        {
                            ref: '/assets/dist/img/favicon.ico'
                        },
                        {
                            ref: '/assets/dist/css/blackpalm.min.css'
                        },
                        {
                            ref: '/assets/dist/js/blackpalm.min.js'
                        }
                    ],
                    code: 'GS030-ASSET-REQ'
                }]});

                return {themes: [theme]};
            });

            await click('[data-test-theme-id="test-2"] [data-test-theme-activate-button]');

            expect(find('[data-test-theme-warnings-modal]')).to.exist;

            expect(
                find('[data-test-theme-warnings-title]').text().trim(),
                'modal title after activating theme with warnings'
            ).to.equal('Activation successful with warnings');

            await click('[data-test-toggle-details]');

            expect(
                find('.theme-validation-details').text(),
                'top-level warnings are displayed in activation warnings'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').text(),
                'individual warning failures are displayed in activation warnings'
            ).to.match(/\/assets\/dist\/img\/apple-touch-icon\.png/);

            // restore default mirage handlers
            mockThemes(server);

            await click('[data-test-modal-close-button]');
            // reactivate casper to continue tests
            await click('[data-test-theme-id="casper"] [data-test-theme-activate-button]');

            // theme deletion displays modal
            await click('[data-test-theme-id="test-1"] [data-test-theme-delete-button]');
            expect(
                find('[data-test-delete-theme-modal]').length,
                'theme deletion modal displayed after button click'
            ).to.equal(1);

            // cancelling theme deletion closes modal
            await click('.fullscreen-modal [data-test-cancel-button]');
            expect(
                find('.fullscreen-modal').length === 0,
                'delete theme modal is closed when cancelling'
            ).to.be.true;

            // confirming theme deletion closes modal and refreshes list
            await click('[data-test-theme-id="test-1"] [data-test-theme-delete-button]');
            await click('.fullscreen-modal [data-test-delete-button]');
            expect(
                find('.fullscreen-modal').length === 0,
                'delete theme modal closes after deletion'
            ).to.be.true;

            expect(
                find('[data-test-theme-id]').length,
                'number of themes in list shrinks after delete'
            ).to.equal(5);

            expect(
                find('[data-test-theme-title]').text(),
                'correct theme is removed from theme list after deletion'
            ).to.not.match(/Test 1/);

            // validation errors are handled when deleting a theme
            server.del('/themes/:theme/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [{
                        message: 'Can\'t delete theme'
                    }]
                });
            });

            await click('[data-test-theme-id="test-2"] [data-test-theme-delete-button]');
            await click('.fullscreen-modal [data-test-delete-button]');

            expect(
                find('.fullscreen-modal').length === 0,
                'delete theme modal closes after failed deletion'
            ).to.be.true;

            expect(
                find('.gh-alert').length,
                'alert is shown when deletion fails'
            ).to.equal(1);

            expect(
                find('.gh-alert').text(),
                'failed deletion alert has correct text'
            ).to.match(/Can't delete theme/);

            // restore default mirage handlers
            mockThemes(server);
        });

        it('can delete then re-upload the same theme', async function () {
            server.loadFixtures('themes');

            // mock theme upload to emulate uploading theme with same id
            server.post('/themes/upload/', function ({themes}) {
                let theme = themes.create({
                    name: 'foo',
                    package: {
                        name: 'Foo',
                        version: '0.1'
                    }
                });

                return {themes: [theme]};
            });

            await visit('/settings/design');
            await click('[data-test-theme-id="foo"] [data-test-theme-delete-button]');
            await click('.fullscreen-modal [data-test-delete-button]');

            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'foo.zip', type: 'application/zip'});
            // this will fail if upload failed because there won't be an activate now button
            await click('.fullscreen-modal [data-test-activate-now-button]');
        });
    });
});
