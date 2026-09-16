import NavigationItem from 'ghost-admin/models/navigation-item';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {
    getPagePlacement,
    pagePathForSlug,
    setPageNavigationPlacement,
    setPagesNavigationPlacement
} from 'ghost-admin/utils/site-navigation';

// getPagePlacement reads settings[key].toArray(); stub the minimum it needs
function settingsWith({navigation = [], secondaryNavigation = []} = {}) {
    return {
        navigation: {toArray: () => navigation},
        secondaryNavigation: {toArray: () => secondaryNavigation}
    };
}

function mutableSettings({navigation = [], secondaryNavigation = []} = {}) {
    const settings = {
        navigation: emberA(navigation.map(item => NavigationItem.create(item))),
        secondaryNavigation: emberA(secondaryNavigation.map(item => NavigationItem.create(item))),
        settingsModel: {},
        saved: false,
        async reload() {
            return this;
        },
        async save() {
            this.saved = true;
            return this;
        }
    };

    return settings;
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

    describe('setPagesNavigationPlacement', function () {
        const blogUrl = 'https://example.com/';

        it('does not reorder or re-save pages already in the destination', async function () {
            const settings = mutableSettings({
                navigation: [
                    {label: 'Home', url: '/'},
                    {label: 'About', url: '/about/'},
                    {label: 'Contact', url: '/contact/'}
                ]
            });

            await setPagesNavigationPlacement(settings, {
                pages: [
                    {label: 'About', path: '/about/'},
                    {label: 'Partners', path: '/partners/'}
                ],
                placement: 'primary',
                blogUrl
            });

            expect(settings.saved).to.be.true;
            expect(settings.navigation.map(item => item.label)).to.deep.equal([
                'Home',
                'About',
                'Contact',
                'Partners'
            ]);
        });

        it('skips saving when every page is already in the destination', async function () {
            const settings = mutableSettings({
                navigation: [{label: 'About', url: '/about/'}]
            });

            await setPagesNavigationPlacement(settings, {
                pages: [{label: 'About', path: '/about/'}],
                placement: 'primary',
                blogUrl
            });

            expect(settings.saved).to.be.false;
            expect(settings.navigation.map(item => item.label)).to.deep.equal(['About']);
        });

        it('preserves icon and visibility when moving between menus', async function () {
            const settings = mutableSettings({
                navigation: [{
                    label: 'About',
                    url: '/about/',
                    icon: 'https://example.com/about.svg',
                    visibility: 'members'
                }]
            });

            await setPageNavigationPlacement(settings, {
                label: 'About',
                path: '/about/',
                placement: 'secondary',
                blogUrl
            });

            expect(settings.navigation).to.have.length(0);
            expect(settings.secondaryNavigation).to.have.length(1);

            const moved = settings.secondaryNavigation[0];
            expect(moved.label).to.equal('About');
            expect(moved.url).to.equal('/about/');
            expect(moved.icon).to.equal('https://example.com/about.svg');
            expect(moved.visibility).to.equal('members');
            expect(moved.isSecondary).to.be.true;
        });
    });
});
