// # App Test
// Tests that the general layout & functionality of global admin components is correct

/*globals CasperTest, casper, newUser */

CasperTest.begin('Admin navigation bar is correct', 45, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('root', function testTitleAndUrl() {
        test.assertTitle('Content - Test Blog', 'Ghost admin has incorrect title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.then(function testNavItems() {
        var logoHref = this.getElementAttribute('.ghost-logo', 'href'),
            contentHref = this.getElementAttribute('.nav-content', 'href'),
            editorHref = this.getElementAttribute('.nav-new', 'href'),
            settingsHref = this.getElementAttribute('.nav-settings', 'href');

        // Logo
        test.assertExists('.ghost-logo', 'Ghost logo home page link exists');
        test.assertEquals(logoHref, '/', 'Ghost logo link href is correct');

        // Content
        test.assertExists('.nav-content', 'Content nav item exists');
        test.assertSelectorHasText('.nav-content', 'Content', 'Content nav item has correct text');
        test.assertEquals(contentHref, '/ghost/', 'Content href is correct');
        test.assertExists('.nav-content.active', 'Content nav item is not marked active');

        // Editor
        test.assertExists('.nav-new', 'Editor nav item exists');
        test.assertSelectorHasText('.nav-new', 'New Post', 'Editor nav item has correct text');
        test.assertEquals(editorHref, '/ghost/editor/', 'Editor href is correct');
        test.assertDoesntExist('.nav-new.active', 'Editor nav item is not marked active');

        // Settings
        test.assertExists('.nav-settings', 'Settings nav item exists');
        test.assertSelectorHasText('.nav-settings', 'Settings', 'Settings nav item has correct text');
        test.assertEquals(settingsHref, '/ghost/settings/', 'Settings href is correct');
        test.assertDoesntExist('.nav-settings.active', 'Settings nav item is marked active');
    });

    casper.then(function testHelpMenuNotVisible() {
        test.assertExists('.help-menu', 'Help menu nav item exists');
        test.assertNotExists('.help-menu .dropdown.open', 'Help menu should not be visible');
    });

    casper.thenClick('.help-menu .nav-label');
    casper.waitForSelector('.help-menu .dropdown.open', function then() {
        var supportHref = this.getElementAttribute('.help-menu-support', 'href'),
            tweetHref = this.getElementAttribute('.help-menu-tweet', 'href'),
            howtoHref = this.getElementAttribute('.help-menu-how-to', 'href'),
            wishlistHref = this.getElementAttribute('.help-menu-wishlist', 'href');

        test.assertVisible('.help-menu .dropdown-menu', 'Help menu should be visible');

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

            test.assertExists('.modal-content .close');
        });

        casper.thenClick('.modal-content .close');

        casper.waitWhileVisible('.modal-container', function onSuccess() {
            test.assert(true, 'clicking close should remove the markdown help modal');
        });
    }, casper.failOnTimeout(test, 'WaitForSelector .help-menu .dropdown failed'));

    casper.then(function testUserMenuNotVisible() {
        test.assertExists('.user-menu', 'User menu nav item exists');
        test.assertNotExists('.user-menu .dropdown.open', 'User menu should not be visible');
    });

    casper.thenClick('.user-menu .nav-label');
    casper.waitForSelector('.user-menu .dropdown.open', function then() {
        var profileHref = this.getElementAttribute('.user-menu-profile', 'href'),
            signoutHref = this.getElementAttribute('.user-menu-signout', 'href');

        test.assertVisible('.user-menu .dropdown-menu', 'User menu should be visible');

        test.assertExists('.user-menu-profile', 'Profile menu item exists');
        test.assertSelectorHasText('.user-menu-profile', 'Your Profile',
            'Profile menu item has correct text');
        test.assertEquals(profileHref, '/ghost/settings/users/' + newUser.slug + '/', 'Profile href is correct');

        test.assertExists('.user-menu-signout', 'Sign Out menu item exists');
        test.assertSelectorHasText('.user-menu-signout', 'Sign Out', 'Signout menu item has correct text');
        test.assertEquals(signoutHref, '/ghost/signout/', 'Sign Out href is correct');
    }, casper.failOnTimeout(test, 'WaitForSelector .user-menu .dropdown failed'));
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
