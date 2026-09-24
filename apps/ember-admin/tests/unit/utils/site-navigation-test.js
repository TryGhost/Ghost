import NavigationItem from 'ghost-admin/models/navigation-item';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {
    getPagePlacement,
    pagePathForSlug,
    setPageNavigationPlacement
} from 'ghost-admin/utils/site-navigation';

// stubs for getPagePlacement / set*Placement
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
        it('uses the custom route for pages mapped to the homepage or another path', function () {
            const routes = {home: '/', about: '/company/'};
            expect(pagePathForSlug('home', routes)).to.equal('/');
            expect(pagePathForSlug('about', routes)).to.equal('/company/');
            expect(pagePathForSlug('contact', routes)).to.equal('/contact/');
        });

        it('returns a site-relative slug path when no custom routes are available', function () {
            expect(pagePathForSlug('about')).to.equal('/about/');
            expect(pagePathForSlug('about', {})).to.equal('/about/');
        });

        it('returns null for an empty slug', function () {
            expect(pagePathForSlug('')).to.be.null;
        });
    });

    describe('getPagePlacement on a subdirectory install', function () {
        const blogUrl = 'https://example.com/blog/';

        it('matches a nav item stored subdirectory-relative', function () {
            const settings = settingsWith({navigation: [{url: '/about/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('about', blogUrl), blogUrl)).to.equal('primary');
        });

        it('matches an absolute nav item pointing at the subdir page', function () {
            const settings = settingsWith({secondaryNavigation: [{url: 'https://example.com/blog/about/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('about', blogUrl), blogUrl)).to.equal('secondary');
        });

        it('keeps site-relative paths distinct even when they start with the install subdirectory', function () {
            const settings = settingsWith({navigation: [{url: '/blog/about/'}]});
            expect(getPagePlacement(settings, '/about/', blogUrl)).to.be.null;
            expect(getPagePlacement(settings, '/blog/about/', blogUrl)).to.equal('primary');
        });

        it('strips the install subdirectory exactly once from absolute custom-route links', function () {
            const settings = settingsWith({navigation: [{url: 'https://example.com/blog/blog/about/'}]});
            expect(getPagePlacement(settings, '/blog/about/', blogUrl)).to.equal('primary');
            expect(getPagePlacement(settings, '/about/', blogUrl)).to.be.null;
        });

        it('does not match absolute links outside the site subdirectory', function () {
            for (const url of ['https://example.com/about/', 'https://example.com/blogger/about/']) {
                const settings = settingsWith({navigation: [{url}]});
                expect(getPagePlacement(settings, '/about/', blogUrl)).to.be.null;
            }
        });

        it('distinguishes the absolute site homepage from a page named after the subdirectory', function () {
            const settings = settingsWith({navigation: [{url: blogUrl}]});
            expect(getPagePlacement(settings, '/blog/', blogUrl)).to.be.null;
            expect(getPagePlacement(settings, '/', blogUrl)).to.equal('primary');
        });

        it('does not collapse a page whose slug matches the subdir segment', function () {
            const settings = settingsWith({navigation: [{url: '/blog/'}]});
            expect(getPagePlacement(settings, pagePathForSlug('blog', blogUrl), blogUrl)).to.equal('primary');
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

    describe('setPageNavigationPlacement', function () {
        const blogUrl = 'https://example.com/';

        for (const placement of ['primary', 'secondary', null]) {
            it(`preserves unrelated links when setting a nested custom route to ${placement}`, async function () {
                const unrelated = {label: 'About', url: '/about/'};
                const settings = mutableSettings({navigation: [unrelated, {label: 'Custom', url: '/blog/about/'}]});
                const pageRoutes = {custom: '/blog/about/'};
                const subdirBlogUrl = 'https://example.com/blog/';
                const path = pagePathForSlug('custom', pageRoutes);

                await setPageNavigationPlacement(settings, {label: 'Custom', path, placement, blogUrl: subdirBlogUrl, pageRoutes});

                expect(settings.navigation.map(item => ({label: item.label, url: item.url}))).to.deep.include(unrelated);
                expect(getPagePlacement(settings, path, subdirBlogUrl, pageRoutes)).to.equal(placement);
            });
        }

        for (const siteUrl of [blogUrl, `${blogUrl}blog/`]) {
            for (const url of ['/home/', `${siteUrl}home/`]) {
                it(`recognizes, moves, and removes the slug alias ${url} on ${siteUrl}`, async function () {
                    const settings = mutableSettings({navigation: [{label: 'Welcome', url}]});
                    const pageRoutes = {home: '/'};
                    const path = pagePathForSlug('home', pageRoutes);
                    const options = {label: 'Home', path, blogUrl: siteUrl, pageRoutes};

                    expect(getPagePlacement(settings, path, siteUrl, pageRoutes)).to.equal('primary');
                    await setPageNavigationPlacement(settings, {...options, placement: 'primary'});
                    expect(settings.saved).to.be.false;
                    expect(settings.navigation).to.have.length(1);

                    await setPageNavigationPlacement(settings, {...options, placement: 'secondary'});
                    expect(settings.navigation).to.have.length(0);
                    expect(settings.secondaryNavigation.map(item => ({label: item.label, url: item.url})))
                        .to.deep.equal([{label: 'Welcome', url}]);

                    await setPageNavigationPlacement(settings, {...options, placement: null});
                    expect(settings.secondaryNavigation).to.have.length(0);
                });
            }
        }

        it('removes both the slug alias and the custom-route entry', async function () {
            const settings = mutableSettings({
                navigation: [{label: 'Home', url: '/home/'}],
                secondaryNavigation: [{label: 'Home', url: '/'}]
            });

            await setPageNavigationPlacement(settings, {path: '/', placement: null, blogUrl, pageRoutes: {home: '/'}});

            expect(settings.navigation).to.have.length(0);
            expect(settings.secondaryNavigation).to.have.length(0);
        });

        it('restores both menus when moving an alias fails to save', async function () {
            const settings = mutableSettings({
                navigation: [{label: 'Home', url: '/home/'}],
                secondaryNavigation: [{label: 'About', url: '/about/'}]
            });
            const primary = settings.navigation;
            const secondary = settings.secondaryNavigation;
            const failure = new Error('Save failed');
            settings.save = async () => {
                throw failure;
            };

            let error;
            try {
                await setPageNavigationPlacement(settings, {path: '/', placement: 'secondary', blogUrl, pageRoutes: {home: '/'}});
            } catch (e) {
                error = e;
            }

            expect(error).to.equal(failure);
            expect(settings.navigation).to.equal(primary);
            expect(settings.secondaryNavigation).to.equal(secondary);
            expect(settings.navigation[0].url).to.equal('/home/');
            expect(settings.navigation[0].isSecondary).to.be.false;
        });

        it('does not alias a slug URL that is itself claimed by another custom route', function () {
            const pageRoutes = {home: '/', landing: '/home/'};
            const settings = settingsWith({navigation: [{url: '/home/'}]});
            expect(getPagePlacement(settings, '/', blogUrl, pageRoutes)).to.be.null;
            expect(getPagePlacement(settings, '/home/', blogUrl, pageRoutes)).to.equal('primary');
        });

        it('moves an existing homepage link without adding a slug-based duplicate', async function () {
            const settings = mutableSettings({navigation: [{label: 'Home', url: '/'}]});
            const path = pagePathForSlug('home', {home: '/'});

            expect(getPagePlacement(settings, path, blogUrl)).to.equal('primary');
            await setPageNavigationPlacement(settings, {label: 'Home', path, placement: 'secondary', blogUrl});

            expect(settings.navigation).to.have.length(0);
            expect(settings.secondaryNavigation.map(item => item.url)).to.deep.equal(['/']);

            await setPageNavigationPlacement(settings, {label: 'Home', path, placement: null, blogUrl});
            expect(settings.secondaryNavigation).to.have.length(0);
        });

        it('preserves unrelated absolute links when removing a subdirectory page', async function () {
            const externalItem = {label: 'Corporate About', url: 'https://example.com/about/'};
            const settings = mutableSettings({
                navigation: [externalItem, {label: 'Blog About', url: '/about/'}]
            });

            await setPageNavigationPlacement(settings, {
                label: 'Blog About',
                path: '/about/',
                placement: null,
                blogUrl: 'https://example.com/blog/'
            });

            expect(settings.saved).to.be.true;
            expect(settings.navigation.map(item => ({label: item.label, url: item.url})))
                .to.deep.equal([externalItem]);
        });

        it('skips saving when the page is already in the destination', async function () {
            const settings = mutableSettings({
                navigation: [{label: 'About', url: '/about/'}]
            });

            await setPageNavigationPlacement(settings, {
                label: 'About',
                path: '/about/',
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

        it('preserves a blank label on icon-only items when moving', async function () {
            const settings = mutableSettings({
                navigation: [{
                    label: '',
                    url: '/about/',
                    icon: 'https://example.com/about.svg'
                }]
            });

            await setPageNavigationPlacement(settings, {
                label: 'About',
                path: '/about/',
                placement: 'secondary',
                blogUrl
            });

            const moved = settings.secondaryNavigation[0];
            expect(moved.label).to.equal('');
            expect(moved.icon).to.equal('https://example.com/about.svg');
        });

        it('stores subdirectory-relative urls on a subdirectory install', async function () {
            const settings = mutableSettings();
            const subdirBlogUrl = 'https://example.com/blog/';

            await setPageNavigationPlacement(settings, {
                label: 'About',
                path: pagePathForSlug('about', subdirBlogUrl),
                placement: 'primary',
                blogUrl: subdirBlogUrl
            });

            expect(settings.navigation).to.have.length(1);
            expect(settings.navigation[0].url).to.equal('/about/');
        });
    });
});
