// # App Test
// Tests that the general layout & functionality of global admin components is correct

/*globals CasperTest, casper, newUser */

CasperTest.begin('Admin navigation bar is correct', 65, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('root', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.then(function testNavItems() {
        var logoHref = this.getElementAttribute('.gh-nav-footer-sitelink', 'href'),
            contentHref = this.getElementAttribute('.gh-nav-main-content', 'href'),
            editorHref = this.getElementAttribute('.gh-nav-main-editor', 'href'),
            usersHref = this.getElementAttribute('.gh-nav-main-users', 'href'),
            settingsGeneralHref = this.getElementAttribute('.gh-nav-settings-general', 'href'),
            settingsNavigationHref = this.getElementAttribute('.gh-nav-settings-navigation', 'href'),
            settingsTagsHref = this.getElementAttribute('.gh-nav-settings-tags', 'href'),
            settingsCodeInjectionHref = this.getElementAttribute('.gh-nav-settings-code-injection', 'href'),
            settingsLabsHref = this.getElementAttribute('.gh-nav-settings-labs', 'href');

        // Logo
        test.assertExists('.gh-nav-footer-sitelink', 'Ghost home page link exists in nav footer');
        test.assertEquals(logoHref, 'http://127.0.0.1:2369/', 'Ghost logo link href is correct');

        // Content
        test.assertExists('.gh-nav-main-content', 'Content nav item exists');
        test.assertSelectorHasText('.gh-nav-main-content', 'Content', 'Content nav item has correct text');
        test.assertEquals(contentHref, '/ghost/', 'Content href is correct');
        test.assertExists('.gh-nav-main-content.active', 'Content nav item is not marked active');

        // Editor
        test.assertExists('.gh-nav-main-editor', 'Editor nav item exists');
        test.assertSelectorHasText('.gh-nav-main-editor', 'New Post', 'Editor nav item has correct text');
        test.assertEquals(editorHref, '/ghost/editor/', 'Editor href is correct');
        test.assertDoesntExist('.gh-nav-main-editor.active', 'Editor nav item is not marked active');

        // Users
        test.assertExists('.gh-nav-main-users', 'Users nav item exists');
        test.assertSelectorHasText('.gh-nav-main-users', 'Team', 'Users nav item has correct text');
        test.assertEquals(usersHref, '/ghost/team/', 'Users href is correct');
        test.assertDoesntExist('.gh-nav-main-users.active', 'Users nav item is not marked active');

        // Settings - General
        test.assertExists('.gh-nav-settings-general', 'Settings - General nav exists');
        test.assertSelectorHasText('.gh-nav-settings-general', 'General', 'Settings nav item has correct text');
        test.assertEquals(settingsGeneralHref, '/ghost/settings/general/', 'Settings href is correct');
        test.assertDoesntExist('.gh-nav-settings-general.active', 'Settings nav item is marked active');

        // Settings - Navigation
        test.assertExists('.gh-nav-settings-navigation', 'Settings - Navigation nav item exists');
        test.assertSelectorHasText('.gh-nav-settings-navigation', 'Navigation', 'Settings nav item has correct text');
        test.assertEquals(settingsNavigationHref, '/ghost/settings/navigation/', 'Settings Navigation href is correct');
        test.assertDoesntExist('.gh-nav-settings-navigation.active', 'Settings - Navigation nav item is marked active');

        // Settings - Tags
        test.assertExists('.gh-nav-settings-tags', 'Settings - Tags nav item exists');
        test.assertSelectorHasText('.gh-nav-settings-tags', 'Tags', 'Settings nav item has correct text');
        test.assertEquals(settingsTagsHref, '/ghost/settings/tags/', 'Settings Navigation href is correct');
        test.assertDoesntExist('.gh-nav-settings-tags.active', 'Settings - Navigation nav item is marked active');

        // Settings - Code Injection
        test.assertExists('.gh-nav-settings-code-injection', 'Settings - Code Injection nav item exists');
        test.assertSelectorHasText('.gh-nav-settings-code-injection', 'Code Injection', 'Settings nav item has correct text');
        test.assertEquals(settingsCodeInjectionHref, '/ghost/settings/code-injection/', 'Settings Navigation href is correct');
        test.assertDoesntExist('.gh-nav-settings-code-injection.active', 'Settings - Code Injection nav item is marked active');

        // Settings - Labs
        test.assertExists('.gh-nav-settings-labs', 'Settings - Labs nav item exists');
        test.assertSelectorHasText('.gh-nav-settings-labs', 'Labs', 'Settings nav item has correct text');
        test.assertEquals(settingsLabsHref, '/ghost/settings/labs/', 'Settings Labs href is correct');
        test.assertDoesntExist('.gh-nav-settings-labs.active', 'Settings - Labs nav item is marked active');
    });

    casper.then(function testHelpMenuNotVisible() {
        test.assertExists('.gh-help-button', 'Help menu nav item exists');
        test.assertNotExists('.gh-help-button .dropdown.open', 'Help menu should not be visible');
    });

    casper.thenClick('.gh-help-button');
    casper.waitForSelector('.dropdown', function then() {
        var supportHref = this.getElementAttribute('.help-menu-support', 'href'),
            tweetHref = this.getElementAttribute('.help-menu-tweet', 'href'),
            howtoHref = this.getElementAttribute('.help-menu-how-to', 'href'),
            wishlistHref = this.getElementAttribute('.help-menu-wishlist', 'href');

        test.assertVisible('.dropdown-menu', 'Help menu should be visible');

        test.assertExists('.help-menu-support', 'Support menu item exists');
        test.assertSelectorHasText('.help-menu-support', 'Support Center', 'Support menu item has correct text');
        test.assertEquals(supportHref, 'http://support.ghost.org/', 'Support href is correct');

        test.assertExists('.help-menu-tweet', 'Tweet menu item exists');
        test.assertSelectorHasText('.help-menu-tweet', 'Tweet @TryGhost!', 'Tweet menu item has correct text');
        test.assertEquals(tweetHref, 'https://twitter.com/intent/tweet?text=%40TryGhost+Hi%21+Can+you+help+me+with+&related=TryGhost', 'Tweet href is correct');

        test.assertExists('.help-menu-how-to', 'How-to menu item exists');
        test.assertSelectorHasText('.help-menu-how-to', 'How to Use Ghost', 'How-to menu item has correct text');
        test.assertEquals(howtoHref, 'http://support.ghost.org/how-to-use-ghost/', 'How-to href is correct');

        test.assertExists('.help-menu-wishlist', 'Wishlist menu item exists');
        test.assertSelectorHasText('.help-menu-wishlist', 'Wishlist', 'Wishlist menu item has correct text');
        test.assertEquals(wishlistHref, 'http://ideas.ghost.org/', 'Wishlist href is correct');

        test.assertExists('.help-menu-markdown', 'Markdown menu item exists');
        test.assertSelectorHasText('.help-menu-markdown', 'Markdown Help', 'Markdown menu item has correct text');

        casper.thenClick('.help-menu-markdown');

        casper.waitUntilVisible('.modal-container', function onSuccess() {
            test.assertSelectorHasText(
                '.modal-content .modal-header',
                'Markdown Help',
                'delete modal has correct text');

            test.assertExists('.modal-content .close', '.modal-content .close exists');
        });

        casper.thenClick('.modal-content .close');

        casper.waitWhileVisible('.modal-container', function onSuccess() {
            test.assert(true, 'clicking close should remove the markdown help modal');
        });
    }, casper.failOnTimeout(test, 'WaitForSelector .gh-help-menu .ember-view.open failed'));

    casper.then(function testUserMenuNotVisible() {
        test.assertExists('.gh-nav-menu .gh-nav-menu-details-user', 'User menu nav item exists');
        test.assertNotExists('.gh-nav-menu-details-user .user-menu-profile', 'User menu should not be visible');
    });

    casper.thenClick('.gh-nav-menu');
    casper.waitForSelector('.dropdown', function then() {
        var profileHref = this.getElementAttribute('.user-menu-profile', 'href'),
            signoutHref = this.getElementAttribute('.user-menu-signout', 'href');

        test.assertVisible('.dropdown-item.user-menu-profile', 'User menu should be visible');

        test.assertExists('.dropdown-item.user-menu-profile', 'Profile menu item exists');
        test.assertSelectorHasText('.dropdown-item.user-menu-profile', 'Your Profile',
            'Profile menu item has correct text');
        test.assertEquals(profileHref, '/ghost/team/' + newUser.slug + '/', 'Profile href is correct');

        test.assertExists('.user-menu-signout', 'Sign Out menu item exists');
        test.assertSelectorHasText('.user-menu-signout', 'Sign Out', 'Signout menu item has correct text');
        test.assertEquals(signoutHref, '/ghost/signout/', 'Sign Out href is correct');
    }, casper.failOnTimeout(test, 'WaitForSelector .user-menu .dropdown failed'));

    // TODO Add tests to check each pane gets active class appropriately
});

CasperTest.begin('Can transition to the editor and back', 6, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('root', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenTransitionAndWaitForScreenLoad('editor', function testTransitionToEditor() {
        test.assertUrlMatch(/ghost\/editor\//, 'Landed on the correct URL');
        test.assertExists('.entry-markdown', 'Ghost editor is present');
        test.assertExists('.entry-preview', 'Ghost preview is present');
    });

    casper.thenTransitionAndWaitForScreenLoad('content', function testTransitionToContent() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });
});

CasperTest.begin('Can search for posts and users', 8, function suite(test) {
    var searchControl = '.gh-nav-search-input',
        searchInput = '.gh-nav-search-input .selectize-input',
        mouse = require('mouse').create(casper);

    casper.thenOpenAndWaitForPageLoad('root', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenClick('.gh-nav-search-button');

    casper.waitForResource(/posts\/\?fields=id%2Ctitle%2Cpage&limit=all&status=all&staticPages=all/, function then() {
        test.assert(true, 'Queried filtered posts list on search focus');
    }, function timeout() {
        casper.test.fail('Did not query filtered posts list on search focus');
    });

    casper.waitForResource(/users\/\?fields=name%2Cslug&limit=all/, function then() {
        test.assert(true, 'Queried filtered users list on search focus');
    }, function timeout() {
        casper.test.fail('Did not query filtered users list on search focus');
    });

    casper.then(function testUserResults() {
        casper.sendKeys(searchInput, 'Test', {keepFocus: true});
        casper.waitForSelectorText(searchControl + ' .option.active', 'Test User', function success() {
            test.assert(true, 'Queried user was displayed when searching');
        }, function timeout() {
            casper.test.fail('Queried user was not displayed when searching');
        });
    });

    casper.then(function testUserNavigation() {
        casper.sendKeys(searchInput, casper.page.event.key.Enter, {keepFocus: true});
        casper.waitForSelector('.settings-user', function () {
            test.assertUrlMatch(/ghost\/team\/test\//, 'Landed on correct URL');
        });
    });

    // casper loses the focus somehow, click off/on the input to regain it
    casper.thenClick('.gh-input.user-name');
    casper.thenClick(searchControl + ' .selectize-input');

    casper.wait(500);

    casper.then(function testPostResultsAndClick() {
        casper.sendKeys(searchInput, 'Welcome', {keepFocus: true});
        casper.wait(500);
        casper.then(function () {
            casper.waitForSelectorText(searchControl + ' .option.active', 'Welcome to Ghost', function success() {
                test.assert(true, 'Queried post was displayed when searching');
                mouse.down(searchControl + ' .option.active');
                casper.waitForSelector('.view-editor', function () {
                    test.assertUrlMatch(/ghost\/editor\/\d\//, 'Landed on correct URL');
                });
            }, function timeout() {
                casper.test.fail('Queried post was not displayed when searching');
            });
        });
    });
});
