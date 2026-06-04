const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/config-utils');
const path = require('path');
const {promisify} = require('node:util');

const concat = require('../../../../core/frontend/helpers/concat');
const foreach = require('../../../../core/frontend/helpers/foreach');
const link_class = require('../../../../core/frontend/helpers/link_class');
const url = require('../../../../core/frontend/helpers/url');
const navigation = require('../../../../core/frontend/helpers/navigation');

const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

const runHelper = data => navigation.call({}, data);
const runHelperThunk = data => () => runHelper(data);

describe('{{navigation}} helper', function () {
    let optionsData;

    beforeAll(async function () {
        hbs.express4({
            partialsDir: [configUtils.config.get('paths').helperTemplates]
        });

        const cachePartials = promisify(hbs.cachePartials.bind(hbs));
        await cachePartials();

        // The navigation partial expects this helper
        // @TODO: change to register with Ghost's own registration tools
        hbs.registerHelper('link_class', link_class);
        hbs.registerHelper('concat', concat);
        hbs.registerHelper('url', url);
        hbs.registerHelper('foreach', foreach);
    });

    beforeEach(function () {
        optionsData = {
            data: {
                site: {
                    navigation: [],
                    secondary_navigation: []
                },
                root: {
                    relativeUrl: ''
                }
            }
        };
    });

    it('should throw errors on invalid data', function () {
        // Test 1: navigation = string
        optionsData.data.site.navigation = 'not an object';
        assert.throws(runHelperThunk(optionsData), {message: 'navigation data is not an object or is a function'});

        // Test 2: navigation = function
        optionsData.data.site.navigation = function () {
        };
        assert.throws(runHelperThunk(optionsData), {message: 'navigation data is not an object or is a function'});

        // Test 3: invalid label
        optionsData.data.site.navigation = [{label: 1, url: 'bar'}];
        assert.throws(runHelperThunk(optionsData), {message: 'Invalid value, Url, Label and Icon must be strings'});

        // Test 4: invalid url
        optionsData.data.site.navigation = [{label: 'foo', url: 1}];
        assert.throws(runHelperThunk(optionsData), {message: 'Invalid value, Url, Label and Icon must be strings'});

        // Test 5: invalid icon
        optionsData.data.site.navigation = [{label: 'foo', url: '/foo', icon: 1}];
        assert.throws(runHelperThunk(optionsData), {message: 'Invalid value, Url, Label and Icon must be strings'});

        // Test 6: invalid visibility
        optionsData.data.site.navigation = [{label: 'foo', url: '/foo', visibility: 'invalid'}];
        assert.throws(runHelperThunk(optionsData), {message: 'Invalid navigation visibility value'});
    });

    it('can render empty nav', function () {
        const rendered = runHelper(optionsData);

        assertExists(rendered);
        assert.equal(rendered.string, '');
    });

    it('can handle relativeUrl not being set (e.g. for images/assets)', function () {
        const singleItem = {label: 'Foo', url: '/foo'};
        let rendered;
        delete optionsData.data.root.relativeUrl;

        optionsData.data.site.navigation = [singleItem];
        rendered = runHelper(optionsData);
        assert(rendered.string.includes('li'));
        assert(rendered.string.includes('nav-foo'));
        assert(rendered.string.includes('/foo'));
    });

    it('can render one item', function () {
        const singleItem = {label: 'Foo', url: '/foo'};
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        let rendered;

        optionsData.data.site.navigation = [singleItem];
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('li'));
        assert(rendered.string.includes('nav-foo'));
        assert(rendered.string.includes(testUrl));
    });

    it('can render one item with an icon', function () {
        const singleItem = {label: 'Foo', url: '/foo', icon: 'https://example.com/icon.svg'};
        let rendered;

        optionsData.data.site.navigation = [singleItem];
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('class="nav-icon"'));
        assert(rendered.string.includes('src="https://example.com/icon.svg"'));
        assert(rendered.string.includes('alt=""'));
        assert(!rendered.string.includes('alt="icon"'));
        assert(!rendered.string.includes('aria-hidden'));
        assert(!rendered.string.includes('loading='));
        assert(rendered.string.includes('<span class="nav-label">Foo</span>'));
    });

    it('can render an icon-only item', function () {
        const singleItem = {url: '/icon-only', icon: 'https://example.com/icons/Ambulance%20Truck.svg'};
        let rendered;

        optionsData.data.site.navigation = [singleItem];
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('nav-ambulance-truck'));
        assert(!rendered.string.includes('nav- '));
        assert(rendered.string.includes('class="nav-icon"'));
        assert(rendered.string.includes('src="https://example.com/icons/Ambulance%20Truck.svg"'));
        assert(rendered.string.includes('alt="Ambulance Truck"'));
        assert(!rendered.string.includes('aria-hidden'));
        assert(!rendered.string.includes('loading='));
        assert(!rendered.string.includes('class="nav-label"'));
    });

    it('can render multiple items', function () {
        const firstItem = {label: 'Foo', url: '/foo'};
        const secondItem = {label: 'Bar Baz Qux', url: '/qux'};
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        const testUrl2 = 'href="' + configUtils.config.get('url') + '/qux"';
        let rendered;

        optionsData.data.site.navigation = [firstItem, secondItem];
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('nav-foo'));
        assert(rendered.string.includes('nav-bar-baz-qux'));
        assert(rendered.string.includes(testUrl));
        assert(rendered.string.includes(testUrl2));
    });

    it('can annotate the current url', function () {
        const firstItem = {label: 'Foo', url: '/foo'};
        const secondItem = {label: 'Bar', url: '/qux'};
        let rendered;

        optionsData.data.site.navigation = [firstItem, secondItem];
        optionsData.data.root.relativeUrl = '/foo';
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('nav-foo'));
        assert(rendered.string.includes('nav-current'));
        assert(rendered.string.includes('nav-foo nav-current'));
        assert(rendered.string.includes('nav-bar"'));
    });

    it('can annotate current url with trailing slash', function () {
        const firstItem = {label: 'Foo', url: '/foo'};
        const secondItem = {label: 'Bar', url: '/qux'};
        let rendered;

        optionsData.data.site.navigation = [firstItem, secondItem];
        optionsData.data.root.relativeUrl = '/foo/';
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('nav-foo'));
        assert(rendered.string.includes('nav-current'));
        assert(rendered.string.includes('nav-foo nav-current'));
        assert(rendered.string.includes('nav-bar"'));
    });

    it('doesn\'t html-escape URLs', function () {
        const firstItem = {label: 'Foo', url: '/?foo=bar&baz=qux'};
        let rendered;

        optionsData.data.site.navigation = [firstItem];
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(!rendered.string.includes('&#x3D;'));
        assert(!rendered.string.includes('&amp;'));
        assert(rendered.string.includes('/?foo=bar&baz=qux'));
    });

    it('encodes URLs', function () {
        const firstItem = {label: 'Foo', url: '/?foo=space bar&<script>alert("gotcha")</script>'};
        let rendered;

        optionsData.data.site.navigation = [firstItem];
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('foo=space%20bar'));
        assert(!rendered.string.includes('<script>alert("gotcha")</script>'));
        assert(rendered.string.includes('%3Cscript%3Ealert(%22gotcha%22)%3C/script%3E'));
    });

    it('doesn\'t double-encode URLs', function () {
        const firstItem = {label: 'Foo', url: '/?foo=space%20bar'};
        let rendered;

        optionsData.data.site.navigation = [firstItem];
        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(!rendered.string.includes('foo=space%2520bar'));
    });

    it('filters navigation items by member visibility', function () {
        const hasLabel = (rendered, label) => rendered.string.includes(`<span class="nav-label">${label}</span>`);
        optionsData.data.site.navigation = [
            {label: 'Public', url: '/public'},
            {label: 'Members', url: '/members', visibility: 'members'},
            {label: 'Paid', url: '/paid', visibility: 'paid'},
            {label: 'Public Free', url: '/public-free', visibility: 'public_free'},
            {label: 'Public Paid', url: '/public-paid', visibility: 'public_paid'},
            {label: 'Public Only', url: '/public-only', visibility: 'public_only'},
            {label: 'Free Members', url: '/free-members', visibility: 'free_members'},
            {label: 'Hidden', url: '/hidden', visibility: 'none'}
        ];

        let rendered = runHelper(optionsData);
        assert(hasLabel(rendered, 'Public'));
        assert(!hasLabel(rendered, 'Members'));
        assert(!hasLabel(rendered, 'Paid'));
        assert(hasLabel(rendered, 'Public Free'));
        assert(hasLabel(rendered, 'Public Paid'));
        assert(hasLabel(rendered, 'Public Only'));
        assert(!hasLabel(rendered, 'Free Members'));
        assert(!hasLabel(rendered, 'Hidden'));

        optionsData.data.root.member = {status: 'free'};
        rendered = runHelper(optionsData);
        assert(hasLabel(rendered, 'Public'));
        assert(hasLabel(rendered, 'Members'));
        assert(!hasLabel(rendered, 'Paid'));
        assert(hasLabel(rendered, 'Public Free'));
        assert(!hasLabel(rendered, 'Public Paid'));
        assert(!hasLabel(rendered, 'Public Only'));
        assert(hasLabel(rendered, 'Free Members'));
        assert(!hasLabel(rendered, 'Hidden'));

        optionsData.data.root.member = {status: 'paid'};
        rendered = runHelper(optionsData);
        assert(hasLabel(rendered, 'Public'));
        assert(hasLabel(rendered, 'Members'));
        assert(hasLabel(rendered, 'Paid'));
        assert(!hasLabel(rendered, 'Public Free'));
        assert(hasLabel(rendered, 'Public Paid'));
        assert(!hasLabel(rendered, 'Public Only'));
        assert(!hasLabel(rendered, 'Free Members'));
        assert(!hasLabel(rendered, 'Hidden'));
    });

    it('renders empty nav when all items are filtered out', function () {
        optionsData.data.site.navigation = [{label: 'Paid', url: '/paid', visibility: 'paid'}];

        const rendered = runHelper(optionsData);

        assertExists(rendered);
        assert.equal(rendered.string, '');
    });

    describe('type="secondary"', function () {
        it('can render one item', function () {
            const singleItem = {label: 'Foo', url: '/foo'};
            const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
            let rendered;

            optionsData.data.site.secondary_navigation = [singleItem];
            optionsData.hash = {type: 'secondary'};
            rendered = runHelper(optionsData);

            assertExists(rendered);
            assert(rendered.string.includes('li'));
            assert(rendered.string.includes('nav-foo'));
            assert(rendered.string.includes(testUrl));
        });

        it('can render multiple items', function () {
            const firstItem = {label: 'Foo', url: '/foo'};
            const secondItem = {label: 'Bar Baz Qux', url: '/qux'};
            const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
            const testUrl2 = 'href="' + configUtils.config.get('url') + '/qux"';
            let rendered;

            optionsData.data.site.secondary_navigation = [firstItem, secondItem];
            optionsData.hash = {type: 'secondary'};
            rendered = runHelper(optionsData);

            assertExists(rendered);
            assert(rendered.string.includes('nav-foo'));
            assert(rendered.string.includes('nav-bar-baz-qux'));
            assert(rendered.string.includes(testUrl));
            assert(rendered.string.includes(testUrl2));
        });
    });
});

describe('{{navigation}} helper with custom template', function () {
    let optionsData;

    beforeAll(async function () {
        hbs.express4({partialsDir: [path.resolve(__dirname, './test_tpl')]});

        const cachePartials = promisify(hbs.cachePartials.bind(hbs));
        await cachePartials();
    });

    beforeEach(function () {
        optionsData = {
            data: {
                site: {
                    navigation: [{label: 'Foo', url: '/foo'}],
                    secondary_navigation: [{label: 'Fighters', url: '/foo'}]
                },
                root: {
                    relativeUrl: ''
                }
            }
        };
    });

    it('can render one item and @site title', function () {
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        let rendered;

        // Set @site.title
        optionsData.data.site.title = 'Chaos is a ladder.';

        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(rendered.string.includes('Chaos is a ladder'));
        assert(!rendered.string.includes('isHeader is set'));
        assert(!rendered.string.includes('Jeremy Bearimy baby!'));
        assert(rendered.string.includes(testUrl));
        assert(rendered.string.includes('Foo'));
    });

    it('can pass attributes through', function () {
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        let rendered;

        // Simulate {{navigation isHeader=true}}
        optionsData.hash = {isHeader: true};

        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(!rendered.string.includes('Chaos is a ladder'));
        assert(rendered.string.includes('isHeader is set'));
        assert(!rendered.string.includes('Jeremy Bearimy baby!'));
        assert(rendered.string.includes(testUrl));
        assert(rendered.string.includes('Foo'));
    });

    it('sets isSecondary for type=secondary', function () {
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        let rendered;

        // Simulate {{navigation type="secondary"}}
        optionsData.hash = {type: 'secondary'};

        rendered = runHelper(optionsData);

        assertExists(rendered);
        assert(!rendered.string.includes('Chaos is a ladder'));
        assert(!rendered.string.includes('isHeader is set'));
        assert(rendered.string.includes('Jeremy Bearimy baby!'));
        assert(rendered.string.includes(testUrl));
        assert(rendered.string.includes('Fighters'));
    });

    describe('using compile', function () {
        let defaultGlobals;
        function compile(templateString) {
            const template = handlebars.compile(templateString);
            template.with = (locals = {}, globals) => {
                globals = globals || defaultGlobals;

                return template(locals, globals);
            };

            return template;
        }

        beforeAll(function () {
            handlebars.registerHelper('link_class', link_class);
            handlebars.registerHelper('concat', concat);
            handlebars.registerHelper('url', concat);
            handlebars.registerHelper('navigation', navigation);
            configUtils.config.set('url', 'https://siteurl.com');
            defaultGlobals = {
                data: {
                    site: {
                        url: configUtils.config.get('url'),
                        navigation: [{label: 'Foo', url: '/foo'}],
                        secondary_navigation: [{label: 'Fighters', url: '/foo'}]
                    }
                }
            };
        });

        it('can render both primary and secondary nav in order', function () {
            assert.equal(compile('{{navigation}}{{navigation type="secondary"}}')
                .with({}), '\n\n\n\nPrime time!\n\n    <a href="">Foo</a>\n\n\n\n\nJeremy Bearimy baby!\n\n    <a href="">Fighters</a>\n');
        });

        it('can render both primary and secondary nav in reverse order', function () {
            assert.equal(compile('{{navigation type="secondary"}}{{navigation}}')
                .with({}), '\n\n\n\nJeremy Bearimy baby!\n\n    <a href="">Fighters</a>\n\n\n\n\nPrime time!\n\n    <a href="">Foo</a>\n');
        });
    });
});
