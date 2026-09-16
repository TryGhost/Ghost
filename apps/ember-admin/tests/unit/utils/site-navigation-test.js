import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getPagePlacement, pagePathForSlug} from 'ghost-admin/utils/site-navigation';

// getPagePlacement reads settings[key].toArray(); stub the minimum it needs
function settingsWith({navigation = [], secondaryNavigation = []} = {}) {
    return {
        navigation: {toArray: () => navigation},
        secondaryNavigation: {toArray: () => secondaryNavigation}
    };
}

describe('Unit: Util: site-navigation', function () {
    describe('pagePathForSlug', function () {
        it('returns /:slug/ on a root install', function () {
            expect(pagePathForSlug('about', 'https://example.com/')).to.equal('/about/');
            expect(pagePathForSlug('about', 'https://example.com')).to.equal('/about/');
        });

        it('includes the subdirectory on a subdir install', function () {
            expect(pagePathForSlug('about', 'https://example.com/blog/')).to.equal('/blog/about/');
            expect(pagePathForSlug('about', 'https://example.com/blog')).to.equal('/blog/about/');
        });

        it('treats a missing/unparseable blogUrl as a root install', function () {
            expect(pagePathForSlug('about')).to.equal('/about/');
            expect(pagePathForSlug('about', 'not a url')).to.equal('/about/');
        });

        it('returns null for an empty slug', function () {
            expect(pagePathForSlug('', 'https://example.com/')).to.be.null;
        });
    });

    describe('getPagePlacement on a subdirectory install', function () {
        const blogUrl = 'https://example.com/blog/';

        it('matches a nav item stored with the subdirectory', function () {
            const settings = settingsWith({navigation: [{url: '/blog/about/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('about', blogUrl), blogUrl)).to.equal('primary');
        });

        it('matches an absolute nav item pointing at the subdir page', function () {
            const settings = settingsWith({secondaryNavigation: [{url: 'https://example.com/blog/about/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('about', blogUrl), blogUrl)).to.equal('secondary');
        });

        it('does not match a bare /about/ that would 404 under the subdirectory', function () {
            const settings = settingsWith({navigation: [{url: '/about/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('about', blogUrl), blogUrl)).to.be.null;
        });
    });

    describe('with a missing/unparseable site origin', function () {
        it('treats an absolute url as external rather than matching by pathname', function () {
            const settings = settingsWith({navigation: [{url: 'https://other.example/about/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('about'), undefined)).to.be.null;
        });

        it('still matches a relative nav url', function () {
            const settings = settingsWith({navigation: [{url: '/about/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('about'), undefined)).to.equal('primary');
        });
    });
});
