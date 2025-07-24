import loginAsRole from '../helpers/login-as-role';
import {beforeEach, describe, it} from 'mocha';
import {click, find, visit} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: FooterBanner WhatsNew', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);  

    beforeEach(async function () {
        await loginAsRole('Administrator', this.server);
    });

    it('shows the What\'s New banner, opens link in new tab, and marks as seen on click', async function () {
        await visit('/dashboard'); // or the main admin route where the banner appears

        // Banner should be visible
        expect(find('.gh-sidebar-banner.gh-whatsnew-toast')).to.exist;

        let bannerLink = find('.gh-sidebar-banner-container');
        expect(bannerLink).to.exist;
        expect(bannerLink.getAttribute('target')).to.equal('_blank');
        expect(bannerLink.getAttribute('href')).to.equal('https://ghost.org/changelog/test-featured-changelog-entry/');

        await click('.gh-sidebar-banner-container');

        // Banner should disappear (marked as seen)
        expect(find('.gh-sidebar-banner.gh-whatsnew-toast')).to.not.exist;
            
        const whatsNewService = this.owner.lookup('service:whatsNew');
        // No changelog entries eligibile for the what's new banner
        expect(whatsNewService.hasNew).to.equal(false);
    });

    it('dismisses the What\'s New banner when the close button is clicked', async function () {
        await visit('/dashboard');

        // Banner should be visible
        expect(find('.gh-sidebar-banner.gh-whatsnew-toast')).to.exist;

        await click('.gh-sidebar-banner-close');

        // Banner should disappear
        expect(find('.gh-sidebar-banner.gh-whatsnew-toast')).to.not.exist;

        const whatsNewService = this.owner.lookup('service:whatsNew');
        // No changelog entries eligibile for the what's new banner
        expect(whatsNewService.hasNew).to.equal(false);
    });
});
