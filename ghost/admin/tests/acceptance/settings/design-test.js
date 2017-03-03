/* jshint expr:true */
/* eslint-disable camelcase */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import {expect} from 'chai';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import {invalidateSession, authenticateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import Mirage from 'ember-cli-mirage';
import mockThemes from 'ghost-admin/mirage/config/themes';
import testSelector from 'ember-test-selectors';

describe('Acceptance: Settings - Design', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/design');

        andThen(function () {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/design');

        andThen(function () {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            authenticateSession(application);
        });

        it('can visit /settings/design', function () {
            visit('/settings/design');

            andThen(function () {
                expect(currentPath()).to.equal('settings.design.index');

                // fixtures contain two nav items, check for three rows as we
                // should have one extra that's blank
                expect(
                    find('.gh-blognav-item').length,
                    'navigation items count'
                ).to.equal(3);
            });
        });

        it('saves navigation settings', function () {
            visit('/settings/design');
            fillIn('.gh-blognav-label:first input', 'Test');
            fillIn('.gh-blognav-url:first input', '/test');
            triggerEvent('.gh-blognav-url:first input', 'blur');

            click('.gh-btn-blue');

            andThen(function () {
                let [navSetting] = server.db.settings.where({key: 'navigation'});

                expect(navSetting.value).to.equal('[{"label":"Test","url":"/test/"},{"label":"About","url":"/about"}]');

                // don't test against .error directly as it will pick up failed
                // tests "pre.error" elements
                expect(find('span.error').length, 'error fields count').to.equal(0);
                expect(find('.gh-alert').length, 'alerts count').to.equal(0);
                expect(find('.response:visible').length, 'validation errors count')
                    .to.equal(0);
            });
        });

        it('validates new item correctly on save', function () {
            visit('/settings/design');

            click('.gh-btn-blue');

            andThen(function () {
                expect(
                    find('.gh-blognav-item').length,
                    'number of nav items after saving with blank new item'
                ).to.equal(3);
            });

            fillIn('.gh-blognav-label:last input', 'Test');
            fillIn('.gh-blognav-url:last input', 'http://invalid domain/');
            triggerEvent('.gh-blognav-url:last input', 'blur');

            click('.gh-btn-blue');

            andThen(function () {
                expect(
                    find('.gh-blognav-item').length,
                    'number of nav items after saving with invalid new item'
                ).to.equal(3);

                expect(
                    find('.gh-blognav-item:last .error').length,
                    'number of invalid fields in new item'
                ).to.equal(1);
            });
        });

        it('clears unsaved settings when navigating away', function () {
            visit('/settings/design');
            fillIn('.gh-blognav-label:first input', 'Test');
            triggerEvent('.gh-blognav-label:first input', 'blur');

            andThen(function () {
                expect(find('.gh-blognav-label:first input').val()).to.equal('Test');
            });

            visit('/settings/code-injection');
            visit('/settings/design');

            andThen(function () {
                expect(find('.gh-blognav-label:first input').val()).to.equal('Home');
            });
        });

        it('can add and remove items', function (done) {
            visit('/settings/design');

            click('.gh-blognav-add');

            andThen(function () {
                expect(
                    find('.gh-blognav-label:last .response').is(':visible'),
                    'blank label has validation error'
                ).to.be.true;
            });

            fillIn('.gh-blognav-label:last input', 'New');
            triggerEvent('.gh-blognav-label:last input', 'keypress', {});

            andThen(function () {
                expect(
                    find('.gh-blognav-label:last .response').is(':visible'),
                    'label validation is visible after typing'
                ).to.be.false;
            });

            fillIn('.gh-blognav-url:last input', '/new');
            triggerEvent('.gh-blognav-url:last input', 'keypress', {});
            triggerEvent('.gh-blognav-url:last input', 'blur');

            andThen(function () {
                expect(
                    find('.gh-blognav-url:last .response').is(':visible'),
                    'url validation is visible after typing'
                ).to.be.false;

                expect(
                    find('.gh-blognav-url:last input').val()
                ).to.equal(`${window.location.protocol}//${window.location.host}/new/`);
            });

            click('.gh-blognav-add');

            andThen(function () {
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
                ).to.equal(`${window.location.protocol}//${window.location.host}/`);

                expect(
                    find('.gh-blognav-item .response:visible').length,
                    'number or validation errors shown after successful add'
                ).to.equal(0);
            });

            click('.gh-blognav-item:first .gh-blognav-delete');

            andThen(function () {
                expect(
                    find('.gh-blognav-item').length,
                    'number of nav items after successful remove'
                ).to.equal(3);
            });

            click('.gh-btn-blue');

            andThen(function () {
                let [navSetting] = server.db.settings.where({key: 'navigation'});

                expect(navSetting.value).to.equal('[{"label":"About","url":"/about"},{"label":"New","url":"/new/"}]');

                done();
            });
        });

        it('allows management of themes', function () {
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
            visit('/settings/design');

            // lists available themes (themes are specified in mirage/fixtures/settings)
            andThen(() => {
                expect(
                    find(testSelector('theme-id')).length,
                    'shows correct number of themes'
                ).to.equal(3);

                expect(
                    find(`${testSelector('theme-active', 'true')} ${testSelector('theme-title')}`).text().trim(),
                    'Blog theme marked as active'
                ).to.equal('Blog (default)');
            });

            // theme upload displays modal
            click(testSelector('upload-theme-button'));
            andThen(() => {
                expect(
                    find('.fullscreen-modal .modal-content:contains("Upload a theme")').length,
                    'theme upload modal displayed after button click'
                ).to.equal(1);
            });

            // cancelling theme upload closes modal
            click(`.fullscreen-modal ${testSelector('close-button')}`);
            andThen(() => {
                expect(
                    find('.fullscreen-modal').length === 0,
                    'upload theme modal is closed when cancelling'
                ).to.be.true;
            });

            // theme upload validates mime type
            click(testSelector('upload-theme-button'));
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {type: 'text/csv'});
            andThen(() => {
                expect(
                    find('.fullscreen-modal .failed').text(),
                    'validation error is shown for invalid mime type'
                ).to.match(/is not supported/);
            });

            // theme upload validates casper.zip
            click(testSelector('upload-try-again-button'));
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'casper.zip', type: 'application/zip'});
            andThen(() => {
                expect(
                    find('.fullscreen-modal .failed').text(),
                    'validation error is shown when uploading casper.zip'
                ).to.match(/default Casper theme cannot be overwritten/);
            });

            // theme upload handles upload errors
            andThen(() => {
                server.post('/themes/upload/', function () {
                    return new Mirage.Response(422, {}, {
                        errors: [{
                            message: 'Invalid theme'
                        }]
                    });
                });
            });
            click(testSelector('upload-try-again-button'));
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'error.zip', type: 'application/zip'});
            andThen(() => {
                expect(
                    find('.fullscreen-modal .failed').text().trim(),
                    'validation error is passed through from server'
                ).to.equal('Invalid theme');

                // reset to default mirage handlers
                mockThemes(server);
            });

            // theme upload handles validation errors
            andThen(() => {
                server.post('/themes/upload/', function () {
                    return new Mirage.Response(422, {}, {
                        errors: [
                            {
                                message: 'Theme is not compatible or contains errors.',
                                errorType: 'ThemeValidationError',
                                errorDetails: [
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
                                    },
                                    {
                                        level: 'error',
                                        rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                                        details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.</p>',
                                        failures: [
                                            {
                                                ref: '/assets/javascripts/ui.js'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    });
                });
            });
            click(testSelector('upload-try-again-button'));
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'bad-theme.zip', type: 'application/zip'});
            andThen(() => {
                expect(
                    find('.fullscreen-modal h1').text().trim(),
                    'modal title after uploading invalid theme'
                ).to.equal('Invalid theme');

                expect(
                    find('.theme-validation-errors').text(),
                    'top-level errors are displayed'
                ).to.match(/Templates must contain valid Handlebars/);

                expect(
                    find('.theme-validation-errors').text(),
                    'top-level errors do not escape HTML'
                ).to.match(/The listed files should be included using the {{asset}} helper/);

                expect(
                    find('.theme-validation-errors').text(),
                    'individual failures are displayed'
                ).to.match(/index\.hbs: The partial index_meta could not be found/);

                // reset to default mirage handlers
                mockThemes(server);
            });
            click(`.fullscreen-modal ${testSelector('try-again-button')}`);
            andThen(() => {
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
            });

            // theme upload handles validation warnings
            andThen(() => {
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
            });
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'warning-theme.zip', type: 'application/zip'});
            andThen(() => {
                expect(
                    find('.fullscreen-modal h1').text().trim(),
                    'modal title after uploading theme with warnings'
                ).to.equal('Uploaded with warnings');

                expect(
                    find('.theme-validation-errors').text(),
                    'top-level warnings are displayed'
                ).to.match(/The listed files should be included using the {{asset}} helper/);

                expect(
                    find('.theme-validation-errors').text(),
                    'individual warning failures are displayed'
                ).to.match(/\/assets\/dist\/img\/apple-touch-icon\.png/);

                // reset to default mirage handlers
                mockThemes(server);
            });
            click(`.fullscreen-modal ${testSelector('close-button')}`);

            // theme upload handles success then close
            click(testSelector('upload-theme-button'));
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'theme-1.zip', type: 'application/zip'});

            andThen(() => {
                expect(
                    find('.fullscreen-modal h1').text().trim(),
                    'modal header after successful upload'
                ).to.equal('Upload successful!');

                expect(
                    find('.modal-body').text(),
                    'modal displays theme name after successful upload'
                ).to.match(/"Test 1 - 0\.1" uploaded successfully/);

                expect(
                    find(testSelector('theme-id')).length,
                    'number of themes in list grows after upload'
                ).to.equal(5);

                expect(
                    find(`${testSelector('theme-active', 'true')} ${testSelector('theme-title')}`).text().trim(),
                    'newly uploaded theme is not active'
                ).to.equal('Blog (default)');
            });
            click(`.fullscreen-modal ${testSelector('close-button')}`);

            // theme upload handles success then activate
            click(testSelector('upload-theme-button'));
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'theme-2.zip', type: 'application/zip'});
            click(`.fullscreen-modal ${testSelector('activate-now-button')}`);
            andThen(() => {
                expect(
                    find(testSelector('theme-id')).length,
                    'number of themes in list grows after upload and activate'
                ).to.equal(6);

                expect(
                    find(`${testSelector('theme-active', 'true')} ${testSelector('theme-title')}`).text().trim(),
                    'newly uploaded+activated theme is active'
                ).to.equal('Test 2');
            });

            // theme activation switches active theme
            click(`${testSelector('theme-id', 'casper')} ${testSelector('theme-activate-button')}`);
            andThen(() => {
                expect(
                    find(`${testSelector('theme-id', 'test-2')} .apps-card-app`).hasClass('theme-list-item--active'),
                    'previously active theme is not active'
                ).to.be.false;

                expect(
                    find(`${testSelector('theme-id', 'casper')} .apps-card-app`).hasClass('theme-list-item--active'),
                    'activated theme is active'
                ).to.be.true;
            });

            // theme deletion displays modal
            click(`${testSelector('theme-id', 'test-1')} ${testSelector('theme-delete-button')}`);
            andThen(() => {
                expect(
                    find(testSelector('delete-theme-modal')).length,
                    'theme deletion modal displayed after button click'
                ).to.equal(1);
            });

            // cancelling theme deletion closes modal
            click(`.fullscreen-modal ${testSelector('cancel-button')}`);
            andThen(() => {
                expect(
                    find('.fullscreen-modal').length === 0,
                    'delete theme modal is closed when cancelling'
                ).to.be.true;
            });

            // confirming theme deletion closes modal and refreshes list
            click(`${testSelector('theme-id', 'test-1')} ${testSelector('theme-delete-button')}`);
            click(`.fullscreen-modal ${testSelector('delete-button')}`);
            andThen(() => {
                expect(
                    find('.fullscreen-modal').length === 0,
                    'delete theme modal closes after deletion'
                ).to.be.true;
            });

            andThen(() => {
                expect(
                    find(testSelector('theme-id')).length,
                    'number of themes in list shrinks after delete'
                ).to.equal(5);

                expect(
                    find(testSelector('theme-title')).text(),
                    'correct theme is removed from theme list after deletion'
                ).to.not.match(/Test 1/);
            });

            // validation errors are handled when deleting a theme
            andThen(() => {
                server.del('/themes/:theme/', function () {
                    return new Mirage.Response(422, {}, {
                        errors: [{
                            message: 'Can\'t delete theme'
                        }]
                    });
                });
            });
            click(`${testSelector('theme-id', 'test-2')} ${testSelector('theme-delete-button')}`);
            click(`.fullscreen-modal ${testSelector('delete-button')}`);
            andThen(() => {
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
        });

    });
});
