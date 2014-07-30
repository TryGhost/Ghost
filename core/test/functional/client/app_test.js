// # App Test
// Tests that the general layout & functionality of global admin components is correct

/*globals CasperTest, casper */

CasperTest.begin('Admin navigation bar is correct', 28, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('root', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.then(function testNavItems() {
        var logoHref = this.getElementAttribute('a.ghost-logo', 'href'),
            contentHref = this.getElementAttribute('#main-menu li.content a', 'href'),
            editorHref = this.getElementAttribute('#main-menu li.editor a', 'href'),
            settingsHref = this.getElementAttribute('#main-menu li.settings a', 'href');

        // Logo
        test.assertExists('a.ghost-logo', 'Ghost logo home page link exists');
        test.assertEquals(logoHref, '/', 'Ghost logo href is correct');

        // Content
        test.assertExists('#main-menu li.content a', 'Content nav item exists');
        test.assertSelectorHasText('#main-menu li.content a', 'Content', 'Content nav item has correct text');
        test.assertEquals(contentHref, '/ghost/', 'Content href is correct');
        test.assertExists('#main-menu li.content.active', 'Content nav item is not marked active');

        // Editor
        test.assertExists('#main-menu li.editor a', 'Editor nav item exists');
        test.assertSelectorHasText('#main-menu li.editor a', 'New Post', 'Editor nav item has correct text');
        test.assertEquals(editorHref, '/ghost/editor/', 'Editor href is correct');
        test.assertDoesntExist('#main-menu li.editor.active', 'Editor nav item is not marked active');

        // Settings
        test.assertExists('#main-menu li.settings a', 'Settings nav item exists');
        test.assertSelectorHasText('#main-menu li.settings a', 'Settings', 'Settings nav item has correct text');
        test.assertEquals(settingsHref, '/ghost/settings/', 'Settings href is correct');
        test.assertDoesntExist('#main-menu li.settings.active', 'Settings nav item is marked active');
    });

    casper.then(function testUserMenuNotVisible() {
        test.assertExists('#usermenu', 'User menu nav item exists');
        test.assertNotExists('#usermenu ul.overlay.open', 'User menu should not be visible');
    });

    casper.thenClick('#usermenu a');
    casper.waitForSelector('#usermenu ul.overlay.open', function then() {
        var profileHref = this.getElementAttribute('#usermenu li.usermenu-profile a', 'href'),
            helpHref = this.getElementAttribute('#usermenu li.usermenu-help a', 'href'),
            signoutHref = this.getElementAttribute('#usermenu li.usermenu-signout a', 'href');

        test.assertVisible('#usermenu ul.overlay', 'User menu should be visible');

        test.assertExists('#usermenu li.usermenu-profile a', 'Profile menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-profile a', 'Your Profile',
            'Profile menu item has correct text');
        test.assertEquals(profileHref, '/ghost/settings/users/' + newUser.slug + '/', 'Profile href is correct');

        test.assertExists('#usermenu li.usermenu-help a', 'Help menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-help a', 'Help / Support', 'Help menu item has correct text');
        test.assertEquals(helpHref, 'http://support.ghost.org/', 'Help href is correct');

        test.assertExists('#usermenu li.usermenu-signout a', 'Sign Out menu item exists');
        test.assertSelectorHasText('#usermenu li.usermenu-signout a', 'Sign Out', 'Signout menu item has correct text');
        test.assertEquals(signoutHref, '/ghost/signout/', 'Sign Out href is correct');
    }, casper.failOnTimeout(test, 'WaitForSelector #usermenu ul.overlay failed'));
});

CasperTest.begin('Can transition to the editor and back', 6, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('root', function testTitleAndUrl() {
        test.assertTitle('Ghost Admin', 'Ghost admin has no title');
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });

    casper.thenTransitionAndWaitForScreenLoad('editor', function testTransitionToEditor() {
        test.assertUrlMatch(/ghost\/editor\/$/, 'Landed on the correct URL');
        test.assertExists('.entry-markdown', 'Ghost editor is present');
        test.assertExists('.entry-preview', 'Ghost preview is present');
    });

    casper.thenTransitionAndWaitForScreenLoad('content', function testTransitionToContent() {
        test.assertUrlMatch(/ghost\/\d+\/$/, 'Landed on the correct URL');
    });
});
