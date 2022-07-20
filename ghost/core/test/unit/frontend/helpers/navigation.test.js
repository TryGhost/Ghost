const should = require('should');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/configUtils');
const path = require('path');

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

    before(function (done) {
        hbs.express4({
            partialsDir: [configUtils.config.get('paths').helperTemplates]
        });

        hbs.cachePartials(function () {
            done();
        });

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
        runHelperThunk(optionsData).should.throwError('navigation data is not an object or is a function');

        // Test 2: navigation = function
        optionsData.data.site.navigation = function () {
        };
        runHelperThunk(optionsData).should.throwError('navigation data is not an object or is a function');

        // Test 3: invalid label
        optionsData.data.site.navigation = [{label: 1, url: 'bar'}];
        runHelperThunk(optionsData).should.throwError('Invalid value, Url and Label must be strings');

        // Test 4: invalid url
        optionsData.data.site.navigation = [{label: 'foo', url: 1}];
        runHelperThunk(optionsData).should.throwError('Invalid value, Url and Label must be strings');
    });

    it('can render empty nav', function () {
        const rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.be.equal('');
    });

    it('can handle relativeUrl not being set (e.g. for images/assets)', function () {
        const singleItem = {label: 'Foo', url: '/foo'};
        let rendered;
        delete optionsData.data.root.relativeUrl;

        optionsData.data.site.navigation = [singleItem];
        rendered = runHelper(optionsData);
        rendered.string.should.containEql('li');
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('/foo');
    });

    it('can render one item', function () {
        const singleItem = {label: 'Foo', url: '/foo'};
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        let rendered;

        optionsData.data.site.navigation = [singleItem];
        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('li');
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql(testUrl);
    });

    it('can render multiple items', function () {
        const firstItem = {label: 'Foo', url: '/foo'};
        const secondItem = {label: 'Bar Baz Qux', url: '/qux'};
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        const testUrl2 = 'href="' + configUtils.config.get('url') + '/qux"';
        let rendered;

        optionsData.data.site.navigation = [firstItem, secondItem];
        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-bar-baz-qux');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql(testUrl2);
    });

    it('can annotate the current url', function () {
        const firstItem = {label: 'Foo', url: '/foo'};
        const secondItem = {label: 'Bar', url: '/qux'};
        let rendered;

        optionsData.data.site.navigation = [firstItem, secondItem];
        optionsData.data.root.relativeUrl = '/foo';
        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-current');
        rendered.string.should.containEql('nav-foo nav-current');
        rendered.string.should.containEql('nav-bar"');
    });

    it('can annotate current url with trailing slash', function () {
        const firstItem = {label: 'Foo', url: '/foo'};
        const secondItem = {label: 'Bar', url: '/qux'};
        let rendered;

        optionsData.data.site.navigation = [firstItem, secondItem];
        optionsData.data.root.relativeUrl = '/foo/';
        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-current');
        rendered.string.should.containEql('nav-foo nav-current');
        rendered.string.should.containEql('nav-bar"');
    });

    it('doesn\'t html-escape URLs', function () {
        const firstItem = {label: 'Foo', url: '/?foo=bar&baz=qux'};
        let rendered;

        optionsData.data.site.navigation = [firstItem];
        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.not.containEql('&#x3D;');
        rendered.string.should.not.containEql('&amp;');
        rendered.string.should.containEql('/?foo=bar&baz=qux');
    });

    it('encodes URLs', function () {
        const firstItem = {label: 'Foo', url: '/?foo=space bar&<script>alert("gotcha")</script>'};
        let rendered;

        optionsData.data.site.navigation = [firstItem];
        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.containEql('foo=space%20bar');
        rendered.string.should.not.containEql('<script>alert("gotcha")</script>');
        rendered.string.should.containEql('%3Cscript%3Ealert(%22gotcha%22)%3C/script%3E');
    });

    it('doesn\'t double-encode URLs', function () {
        const firstItem = {label: 'Foo', url: '/?foo=space%20bar'};
        let rendered;

        optionsData.data.site.navigation = [firstItem];
        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.not.containEql('foo=space%2520bar');
    });

    describe('type="secondary"', function () {
        it('can render one item', function () {
            const singleItem = {label: 'Foo', url: '/foo'};
            const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
            let rendered;

            optionsData.data.site.secondary_navigation = [singleItem];
            optionsData.hash = {type: 'secondary'};
            rendered = runHelper(optionsData);

            should.exist(rendered);
            rendered.string.should.containEql('li');
            rendered.string.should.containEql('nav-foo');
            rendered.string.should.containEql(testUrl);
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

            should.exist(rendered);
            rendered.string.should.containEql('nav-foo');
            rendered.string.should.containEql('nav-bar-baz-qux');
            rendered.string.should.containEql(testUrl);
            rendered.string.should.containEql(testUrl2);
        });
    });
});

describe('{{navigation}} helper with custom template', function () {
    let optionsData;

    before(function (done) {
        hbs.express4({partialsDir: [path.resolve(__dirname, './test_tpl')]});

        hbs.cachePartials(function () {
            done();
        });
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

        should.exist(rendered);
        rendered.string.should.containEql('Chaos is a ladder');
        rendered.string.should.not.containEql('isHeader is set');
        rendered.string.should.not.containEql('Jeremy Bearimy baby!');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql('Foo');
    });

    it('can pass attributes through', function () {
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        let rendered;

        // Simulate {{navigation isHeader=true}}
        optionsData.hash = {isHeader: true};

        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.not.containEql('Chaos is a ladder');
        rendered.string.should.containEql('isHeader is set');
        rendered.string.should.not.containEql('Jeremy Bearimy baby!');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql('Foo');
    });

    it('sets isSecondary for type=secondary', function () {
        const testUrl = 'href="' + configUtils.config.get('url') + '/foo"';
        let rendered;

        // Simulate {{navigation type="secondary"}}
        optionsData.hash = {type: 'secondary'};

        rendered = runHelper(optionsData);

        should.exist(rendered);
        rendered.string.should.not.containEql('Chaos is a ladder');
        rendered.string.should.not.containEql('isHeader is set');
        rendered.string.should.containEql('Jeremy Bearimy baby!');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql('Fighters');
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

        before(function () {
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
            compile('{{navigation}}{{navigation type="secondary"}}')
                .with({})
                .should.eql('\n\n\n\nPrime time!\n\n    <a href="">Foo</a>\n\n\n\n\nJeremy Bearimy baby!\n\n    <a href="">Fighters</a>\n');
        });

        it('can render both primary and secondary nav in reverse order', function () {
            compile('{{navigation type="secondary"}}{{navigation}}')
                .with({})
                .should.eql('\n\n\n\nJeremy Bearimy baby!\n\n    <a href="">Fighters</a>\n\n\n\n\nPrime time!\n\n    <a href="">Foo</a>\n');
        });
    });
});
