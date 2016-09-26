/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import $ from 'jquery';
import run from 'ember-runloop';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost-admin/tests/helpers/ember-simple-auth';
import Mirage from 'ember-cli-mirage';
import mockThemes from 'ghost-admin/mirage/config/themes';

describe('Acceptance: Settings - General', function () {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/general');

        andThen(function() {
            expect(currentURL(), 'currentURL').to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/general');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    it('redirects to team page when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/general');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        it('it renders, shows image uploader modals', function () {
            visit('/settings/general');

            andThen(() => {
                // has correct url
                expect(currentURL(), 'currentURL').to.equal('/settings/general');

                // has correct page title
                expect(document.title, 'page title').to.equal('Settings - General - Test Blog');

                // highlights nav menu
                expect($('.gh-nav-settings-general').hasClass('active'), 'highlights nav menu item')
                    .to.be.true;

                expect(find('.view-header .view-actions .btn-blue').text().trim(), 'save button text').to.equal('Save');

                // initial postsPerPage should be 5
                expect(find('input#postsPerPage').val(), 'post per page value').to.equal('5');

                expect(find('input#permalinks').prop('checked'), 'date permalinks checkbox').to.be.false;
            });

            fillIn('#settings-general input[name="general[title]"]', 'New Blog Title');
            click('.view-header .btn.btn-blue');

            andThen(() => {
                expect(document.title, 'page title').to.equal('Settings - General - New Blog Title');
            });

            click('.blog-logo');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
            });

            click('.fullscreen-modal .modal-content .gh-image-uploader .image-cancel');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader .description').text()).to.equal('Upload an image');
            });

            // click cancel button
            click('.fullscreen-modal .modal-footer .btn.btn-minor');

            andThen(() => {
                expect(find('.fullscreen-modal').length).to.equal(0);
            });

            click('.blog-cover');

            andThen(() => {
                expect(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
            });

            click('.fullscreen-modal .modal-footer .js-button-accept');

            andThen(() => {
                expect(find('.fullscreen-modal').length).to.equal(0);
            });
        });

        it('renders timezone selector correctly', function () {
            visit('/settings/general');

            andThen(() => {
                expect(currentURL(), 'currentURL').to.equal('/settings/general');

                expect(find('#activeTimezone option').length, 'available timezones').to.equal(66);
                expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT) UTC');
                find('#activeTimezone option[value="Africa/Cairo"]').prop('selected', true);
            });

            triggerEvent('#activeTimezone', 'change');
            click('.view-header .btn.btn-blue');

            andThen(() => {
                expect(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT +2:00) Cairo, Egypt');
            });
        });

        it('handles private blog settings correctly', function () {
            visit('/settings/general');

            // handles private blog settings correctly
            andThen(() => {
                expect(find('input#isPrivate').prop('checked'), 'isPrivate checkbox').to.be.false;
            });

            click('input#isPrivate');

            andThen(() => {
                expect(find('input#isPrivate').prop('checked'), 'isPrivate checkbox').to.be.true;
                expect(find('#settings-general input[name="general[password]"]').length, 'password input').to.equal(1);
                expect(find('#settings-general input[name="general[password]"]').val(), 'password default value').to.not.equal('');
            });

            fillIn('#settings-general input[name="general[password]"]', '');
            triggerEvent('#settings-general input[name="general[password]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('Password must be supplied');
            });

            fillIn('#settings-general input[name="general[password]"]', 'asdfg');
            triggerEvent('#settings-general input[name="general[password]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            // validates a facebook url correctly

            andThen(() => {
                // loads fixtures and performs transform
                expect(find('input[name="general[facebook]"]').val(), 'initial facebook value')
                    .to.equal('https://www.facebook.com/test');
            });

            triggerEvent('#settings-general input[name="general[facebook]"]', 'focus');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find('input[name="general[facebook]"]').val(), 'facebook value after blur with no change')
                    .to.equal('https://www.facebook.com/test');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'facebook.com/username');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'facebook.com/pages/some-facebook-page/857469375913?ref=ts');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', '*(&*(%%))');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('The URL must be in a format like https://www.facebook.com/yourPage');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'http://github.com/username');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'http://github.com/pages/username');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/pages/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'testuser');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/testuser');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'ab99');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('Your Page name is not a valid Facebook Page name');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'page/ab99');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/page/ab99');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[facebook]"]', 'page/*(&*(%%))');
            triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/page/*(&*(%%))');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            // validates a twitter url correctly

            andThen(() => {
                // loads fixtures and performs transform
                expect(find('input[name="general[twitter]"]').val(), 'initial twitter value')
                    .to.equal('https://twitter.com/test');
            });

            triggerEvent('#settings-general input[name="general[twitter]"]', 'focus');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find('input[name="general[twitter]"]').val(), 'twitter value after blur with no change')
                    .to.equal('https://twitter.com/test');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'twitter.com/username');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[twitter]"]', '*(&*(%%))');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('The URL must be in a format like https://twitter.com/yourUsername');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'http://github.com/username');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/username');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'thisusernamehasmorethan15characters');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('Your Username is not a valid Twitter Username');
            });

            fillIn('#settings-general input[name="general[twitter]"]', 'testuser');
            triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

            andThen(() => {
                expect(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/testuser');
                expect(find('#settings-general .error .response').text().trim(), 'inline validation response')
                    .to.equal('');
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

            visit('/settings/general');

            // lists available themes (themes are specified in mirage/fixtures/settings)
            andThen(() => {
                expect(
                    find('.theme-list-item').length,
                    'shows correct number of themes'
                ).to.equal(3);

                expect(
                    find('.theme-list-item:contains("Blog")').hasClass('theme-list-item--active'),
                    'Blog theme marked as active'
                );
            });

            // theme upload displays modal
            click('a:contains("Upload a theme")');
            andThen(() => {
                expect(
                    find('.fullscreen-modal .modal-content:contains("Upload a theme")').length,
                    'theme upload modal displayed after button click'
                ).to.equal(1);
            });

            // cancelling theme upload closes modal
            click('.fullscreen-modal button:contains("Cancel")');
            andThen(() => {
                expect(
                    find('.fullscreen-modal').length === 0,
                    'upload theme modal is closed when cancelling'
                ).to.be.true;
            });

            // theme upload validates mime type
            click('a:contains("Upload a theme")');
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {type: 'text/csv'});
            andThen(() => {
                expect(
                    find('.fullscreen-modal .failed').text(),
                    'validation error is shown for invalid mime type'
                ).to.match(/is not supported/);
            });

            // theme upload validates casper.zip
            click('button:contains("Try Again")');
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
            click('button:contains("Try Again")');
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
            click('button:contains("Try Again")');
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
            click('button:contains("Try Again")');
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
                server.post('/themes/upload/', function () {
                    return new Mirage.Response(200, {}, {
                        themes: [
                            {
                                name: 'blackpalm',
                                package: {
                                    name: 'BlackPalm',
                                    version: '1.0.0'
                                },
                                warnings: [
                                    {
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
                                    }
                                ]
                            }
                        ]
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
            click('button:contains("Close")');

            // theme upload handles success then close
            click('a:contains("Upload a theme")');
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
                    find('.theme-list-item').length,
                    'number of themes in list grows after upload'
                ).to.equal(4);

                expect(
                    find('.theme-list-item:contains("Test 1 - 0.1")').hasClass('theme-list-item--active'),
                    'newly uploaded theme is active'
                ).to.be.false;
            });
            click('.fullscreen-modal button:contains("Close")');

            // theme upload handles success then activate
            click('a:contains("Upload a theme")');
            fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'theme-2.zip', type: 'application/zip'});
            click('button:contains("Activate Now")');
            andThen(() => {
                expect(
                    find('.theme-list-item').length,
                    'number of themes in list grows after upload and activate'
                ).to.equal(5);

                expect(
                    find('.theme-list-item:contains("Test 2 - 0.1")').hasClass('theme-list-item--active'),
                    'newly uploaded+activated theme is active'
                ).to.be.true;
            });

            // theme activation switches active theme
            click('.theme-list-item:contains("Blog") a:contains("Activate")');
            andThen(() => {
                expect(
                    find('.theme-list-item:contains("Test 2 - 0.1")').hasClass('theme-list-item--active'),
                    'previously active theme is not active'
                ).to.be.false;

                expect(
                    find('.theme-list-item:contains("Blog")').hasClass('theme-list-item--active'),
                    'activated theme is active'
                ).to.be.true;
            });

            // theme deletion displays modal
            click('.theme-list-item:contains("Test 1") a:contains("Delete")');
            andThen(() => {
                expect(
                    find('.fullscreen-modal .modal-content:contains("delete this theme")').length,
                    'theme deletion modal displayed after button click'
                ).to.equal(1);
            });

            // cancelling theme deletion closes modal
            click('.fullscreen-modal button:contains("Cancel")');
            andThen(() => {
                expect(
                    find('.fullscreen-modal').length === 0,
                    'delete theme modal is closed when cancelling'
                ).to.be.true;
            });

            // confirming theme deletion closes modal and refreshes list
            click('.theme-list-item:contains("Test 1") a:contains("Delete")');
            click('.fullscreen-modal button:contains("Delete")');
            andThen(() => {
                expect(
                    find('.fullscreen-modal').length === 0,
                    'delete theme modal closes after deletion'
                ).to.be.true;
            });

            andThen(() => {
                expect(
                    find('.theme-list-item').length,
                    'number of themes in list shrinks after delete'
                ).to.equal(4);

                expect(
                    find('.theme-list-item .name').text(),
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
            click('.theme-list-item:contains("Test 2") a:contains("Delete")');
            click('.fullscreen-modal button:contains("Delete")');
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
