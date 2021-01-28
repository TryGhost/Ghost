import Mirage from 'ember-cli-mirage';
import mockThemes from 'ghost-admin/mirage/config/themes';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentRouteName, currentURL, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Theme', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/settings/theme');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/theme');

        expect(currentURL(), 'currentURL').to.equal('/staff/test-user');
    });

    it('redirects to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/theme');

        expect(currentURL(), 'currentURL').to.equal('/staff/test-user');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('can visit /settings/theme', async function () {
            await visit('/settings/theme');

            expect(currentRouteName()).to.equal('settings.theme.index');
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

            this.server.loadFixtures('themes');
            await visit('/settings/theme');

            // lists available themes (themes are specified in mirage/fixtures/settings)
            expect(
                findAll('[data-test-theme-id]').length,
                'shows correct number of themes'
            ).to.equal(3);

            expect(
                find('[data-test-theme-active="true"] [data-test-theme-title]').textContent.trim(),
                'Blog theme marked as active'
            ).to.equal('Blog (default)');

            // theme upload displays modal
            await click('[data-test-upload-theme-button]');
            expect(
                findAll('[data-test-modal="upload-theme"]').length,
                'theme upload modal displayed after button click'
            ).to.equal(1);

            // cancelling theme upload closes modal
            await click('.fullscreen-modal [data-test-close-button]');
            expect(
                findAll('.fullscreen-modal').length === 0,
                'upload theme modal is closed when cancelling'
            ).to.be.true;

            // theme upload validates mime type
            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {type: 'text/csv'});

            expect(
                find('.fullscreen-modal .failed').textContent,
                'validation error is shown for invalid mime type'
            ).to.match(/is not supported/);

            // theme upload validates casper.zip
            await click('[data-test-upload-try-again-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'casper.zip', type: 'application/zip'});
            expect(
                find('.fullscreen-modal .failed').textContent,
                'validation error is shown when uploading casper.zip'
            ).to.match(/default Casper theme cannot be overwritten/);

            // theme upload handles upload errors
            this.server.post('/themes/upload/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [{
                        message: 'Invalid theme'
                    }]
                });
            });
            await click('[data-test-upload-try-again-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'error.zip', type: 'application/zip'});

            expect(
                find('.fullscreen-modal .failed').textContent.trim(),
                'validation error is passed through from server'
            ).to.equal('Invalid theme');

            // reset to default mirage handlers
            mockThemes(this.server);

            // theme upload handles validation errors
            this.server.post('/themes/upload/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [
                        {
                            message: 'Theme is not compatible or contains errors.',
                            type: 'ThemeValidationError',
                            details: {
                                errors: [{
                                    level: 'error',
                                    rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.</p>',
                                    failures: [
                                        {
                                            ref: '/assets/javascripts/ui.js'
                                        }
                                    ]
                                }, {
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
                                }]
                            }
                        }
                    ]
                });
            });

            await click('[data-test-upload-try-again-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'bad-theme.zip', type: 'application/zip'});

            expect(
                find('.fullscreen-modal h1').textContent.trim(),
                'modal title after uploading invalid theme'
            ).to.equal('Invalid theme');

            expect(
                findAll('.theme-validation-rule-text')[1].textContent,
                'top-level errors are displayed'
            ).to.match(/Templates must contain valid Handlebars/);

            await click('[data-test-toggle-details]');

            expect(
                find('.theme-validation-details').textContent,
                'top-level errors do not escape HTML'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').textContent,
                'individual failures are displayed'
            ).to.match(/\/assets\/javascripts\/ui\.js/);

            // reset to default mirage handlers
            mockThemes(this.server);

            await click('.fullscreen-modal [data-test-try-again-button]');
            expect(
                findAll('.theme-validation-errors').length,
                '"Try Again" resets form after theme validation error'
            ).to.equal(0);

            expect(
                findAll('.gh-image-uploader').length,
                '"Try Again" resets form after theme validation error'
            ).to.equal(1);

            expect(
                find('.fullscreen-modal h1').textContent.trim(),
                '"Try Again" resets form after theme validation error'
            ).to.equal('Upload a theme');

            // theme upload handles validation warnings
            this.server.post('/themes/upload/', function ({themes}) {
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
                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.  For more information, please see the <a href="https://ghost.org/docs/themes/helpers/asset/">asset helper documentation</a>.</p>',
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
                find('.fullscreen-modal h1').textContent.trim(),
                'modal title after uploading theme with warnings'
            ).to.equal('Upload successful with warnings');

            await click('[data-test-toggle-details]');

            expect(
                find('.theme-validation-details').textContent,
                'top-level warnings are displayed'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').textContent,
                'individual warning failures are displayed'
            ).to.match(/\/assets\/dist\/img\/apple-touch-icon\.png/);

            // reset to default mirage handlers
            mockThemes(this.server);

            await click('.fullscreen-modal [data-test-close-button]');

            // theme upload handles success then close
            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'theme-1.zip', type: 'application/zip'});

            expect(
                find('.fullscreen-modal h1').textContent.trim(),
                'modal header after successful upload'
            ).to.equal('Upload successful!');

            expect(
                find('.modal-body').textContent,
                'modal displays theme name after successful upload'
            ).to.match(/"Test 1 - 0\.1" uploaded successfully/);

            expect(
                findAll('[data-test-theme-id]').length,
                'number of themes in list grows after upload'
            ).to.equal(5);

            expect(
                find('[data-test-theme-active="true"] [data-test-theme-title]').textContent.trim(),
                'newly uploaded theme is not active'
            ).to.equal('Blog (default)');

            await click('.fullscreen-modal [data-test-close-button]');

            // theme upload handles success then activate
            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'theme-2.zip', type: 'application/zip'});
            await click('.fullscreen-modal [data-test-activate-now-button]');

            expect(
                findAll('[data-test-theme-id]').length,
                'number of themes in list grows after upload and activate'
            ).to.equal(6);

            expect(
                find('[data-test-theme-active="true"] [data-test-theme-title]').textContent.trim(),
                'newly uploaded+activated theme is active'
            ).to.equal('Test 2');

            // theme activation switches active theme
            await click('[data-test-theme-id="casper"] [data-test-theme-activate-button]');

            expect(
                find('[data-test-theme-id="test-2"] .apps-card-app').classList.contains('theme-list-item--active'),
                'previously active theme is not active'
            ).to.be.false;

            expect(
                find('[data-test-theme-id="casper"] .apps-card-app').classList.contains('theme-list-item--active'),
                'activated theme is active'
            ).to.be.true;

            // theme activation shows errors
            this.server.put('themes/:theme/activate', function () {
                return new Mirage.Response(422, {}, {
                    errors: [
                        {
                            message: 'Theme is not compatible or contains errors.',
                            type: 'ThemeValidationError',
                            details: {
                                checkedVersion: '2.x',
                                name: 'casper',
                                version: '2.9.7',
                                errors: [{
                                    level: 'error',
                                    rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.</p>',
                                    failures: [
                                        {
                                            ref: '/assets/javascripts/ui.js'
                                        }
                                    ]
                                }, {
                                    level: 'error',
                                    fatal: true,
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
                                }]
                            }
                        }
                    ]
                });
            });

            await click('[data-test-theme-id="test-2"] [data-test-theme-activate-button]');

            expect(find('[data-test-theme-warnings-modal]')).to.exist;

            expect(
                find('[data-test-theme-warnings-title]').textContent.trim(),
                'modal title after activating invalid theme'
            ).to.equal('Activation failed');

            expect(
                find('[data-test-theme-fatal-errors]').textContent,
                'top-level errors are displayed in activation errors'
            ).to.match(/Templates must contain valid Handlebars/);

            await click('[data-test-theme-errors] [data-test-toggle-details]');

            expect(
                find('[data-test-theme-errors] .theme-validation-details').textContent,
                'top-level errors do not escape HTML in activation errors'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').textContent,
                'individual failures are displayed in activation errors'
            ).to.match(/\/assets\/javascripts\/ui\.js/);

            // restore default mirage handlers
            mockThemes(this.server);

            await click('[data-test-modal-close-button]');
            expect(find('[data-test-theme-warnings-modal]')).to.not.exist;

            // theme activation shows warnings
            this.server.put('themes/:theme/activate', function ({themes}, {params}) {
                themes.all().update('active', false);
                let theme = themes.findBy({name: params.theme}).update({active: true});

                theme.update({warnings: [{
                    level: 'warning',
                    rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                    details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.  For more information, please see the <a href="https://ghost.org/docs/themes/helpers/asset/">asset helper documentation</a>.</p>',
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
                find('[data-test-theme-warnings-title]').textContent.trim(),
                'modal title after activating theme with warnings'
            ).to.equal('Activation successful with warnings');

            await click('[data-test-toggle-details]');

            expect(
                find('.theme-validation-details').textContent,
                'top-level warnings are displayed in activation warnings'
            ).to.match(/The listed files should be included using the {{asset}} helper/);

            expect(
                find('.theme-validation-list ul li').textContent,
                'individual warning failures are displayed in activation warnings'
            ).to.match(/\/assets\/dist\/img\/apple-touch-icon\.png/);

            // restore default mirage handlers
            mockThemes(this.server);

            await click('[data-test-modal-close-button]');
            // reactivate casper to continue tests
            await click('[data-test-theme-id="casper"] [data-test-theme-activate-button]');

            // theme deletion displays modal
            await click('[data-test-theme-id="test-1"] [data-test-theme-delete-button]');
            expect(
                findAll('[data-test-delete-theme-modal]').length,
                'theme deletion modal displayed after button click'
            ).to.equal(1);

            // cancelling theme deletion closes modal
            await click('.fullscreen-modal [data-test-cancel-button]');
            expect(
                findAll('.fullscreen-modal').length === 0,
                'delete theme modal is closed when cancelling'
            ).to.be.true;

            // confirming theme deletion closes modal and refreshes list
            await click('[data-test-theme-id="test-1"] [data-test-theme-delete-button]');
            await click('.fullscreen-modal [data-test-delete-button]');
            expect(
                findAll('.fullscreen-modal').length === 0,
                'delete theme modal closes after deletion'
            ).to.be.true;

            expect(
                findAll('[data-test-theme-id]').length,
                'number of themes in list shrinks after delete'
            ).to.equal(5);

            expect(
                find('[data-test-theme-title]').textContent,
                'correct theme is removed from theme list after deletion'
            ).to.not.match(/Test 1/);

            // validation errors are handled when deleting a theme
            this.server.del('/themes/:theme/', function () {
                return new Mirage.Response(422, {}, {
                    errors: [{
                        message: 'Can\'t delete theme'
                    }]
                });
            });

            await click('[data-test-theme-id="test-2"] [data-test-theme-delete-button]');
            await click('.fullscreen-modal [data-test-delete-button]');

            expect(
                findAll('.fullscreen-modal').length === 0,
                'delete theme modal closes after failed deletion'
            ).to.be.true;

            expect(
                findAll('.gh-alert').length,
                'alert is shown when deletion fails'
            ).to.equal(1);

            expect(
                find('.gh-alert').textContent,
                'failed deletion alert has correct text'
            ).to.match(/Can't delete theme/);

            // restore default mirage handlers
            mockThemes(this.server);
        });

        it('can delete then re-upload the same theme', async function () {
            this.server.loadFixtures('themes');

            // mock theme upload to emulate uploading theme with same id
            this.server.post('/themes/upload/', function ({themes}) {
                let theme = themes.create({
                    name: 'foo',
                    package: {
                        name: 'Foo',
                        version: '0.1'
                    }
                });

                return {themes: [theme]};
            });

            await visit('/settings/theme');
            await click('[data-test-theme-id="foo"] [data-test-theme-delete-button]');
            await click('.fullscreen-modal [data-test-delete-button]');

            await click('[data-test-upload-theme-button]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'foo.zip', type: 'application/zip'});
            // this will fail if upload failed because there won't be an activate now button
            await click('.fullscreen-modal [data-test-activate-now-button]');
        });
    });
});
