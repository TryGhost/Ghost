const assert = require('node:assert/strict');
const concat = require('../../../../core/frontend/helpers/concat');
const link_class = require('../../../../core/frontend/helpers/link_class');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

const configUtils = require('../../../utils/config-utils');

let defaultGlobals;

function compile(templateString) {
    const template = handlebars.compile(templateString);
    template.with = (locals = {}, globals) => {
        globals = globals || defaultGlobals;

        return template(locals, globals);
    };

    return template;
}

describe('{{link_class}} helper', function () {
    before(function () {
        handlebars.registerHelper('link_class', link_class);
        handlebars.registerHelper('concat', concat);
        configUtils.config.set('url', 'https://siteurl.com');
        defaultGlobals = {
            data: {
                site: {
                    url: configUtils.config.get('url')
                }
            }
        };
    });

    after(async function () {
        await configUtils.restore();
    });

    it('throws an error for missing for=""', function () {
        assert.throws((function compileWith() {
            compile('{{link_class}}')
                .with({});
        }));
    });

    it('silently accepts an empty for...', function () {
        assert.equal(compile('{{link_class for=tag.slug}}')
            .with({tag: null}), '');
    });

    it('silently accepts an empty SafeString', function () {
        assert.equal(compile('{{link_class for=blank_safe_string}}')
            .with({blank_safe_string: new handlebars.SafeString('')}), '');
    });

    describe('activeClass', function () {
        it('gets applied correctly', function () {
            // Test matching relative URL
            assert.equal(compile('{{link_class for="/about/"}}')
                .with({relativeUrl: '/about/'}), 'nav-current');

            // Test non-matching relative URL
            assert.equal(compile('{{link_class for="/about/"}}')
                .with({relativeUrl: '/'}), '');
        });

        it('ignores anchors', function () {
            // Anchor in href
            assert.equal(compile('{{link_class for="/about/#me"}}')
                .with({relativeUrl: '/about/'}), 'nav-current');

            // Anchor in relative URL
            assert.equal(compile('{{link_class for="/about/"}}')
                .with({relativeUrl: '/about/#me'}), 'nav-current');
        });

        it('handles missing trailing slashes', function () {
            assert.equal(compile('{{link_class for="/about"}}')
                .with({relativeUrl: '/about/'}), 'nav-current');
        });

        it('handles absolute URLs', function () {
            // Correct URL gets class
            assert.equal(compile('{{link_class for="https://siteurl.com/about/"}}')
                .with({relativeUrl: '/about/'}), 'nav-current');

            // Incorrect URL doesn't get class
            assert.equal(compile('{{link_class for="https://othersite.com/about/"}}')
                .with({relativeUrl: '/about/'}), '');
        });

        it('handles absolute URL with missing trailing slash', function () {
            assert.equal(compile('{{link_class for="https://siteurl.com/about"}}')
                .with({relativeUrl: '/about/'}), 'nav-current');
        });

        it('activeClass can be customised', function () {
            assert.equal(compile('{{link_class for="/about/" activeClass="nav-active"}}')
                .with({relativeUrl: '/about/'}), 'nav-active');

            assert.equal(compile('{{link_class for="/about/" activeClass=slug}}')
                .with({relativeUrl: '/about/', slug: 'fred'}), 'fred');

            assert.equal(compile('{{link_class for="/about/" activeClass=(concat slug "active" separator="-")}}')
                .with({relativeUrl: '/about/', slug: 'fred'}), 'fred-active');
        });

        it('activeClass and other classes work together', function () {
            // Single extra class
            assert.equal(compile('{{link_class for="/about/" class="about"}}')
                .with({relativeUrl: '/about/'}), 'about nav-current');

            // Multiple extra classes
            assert.equal(compile('{{link_class for="/about/" class="about my-link"}}')
                .with({relativeUrl: '/about/'}), 'about my-link nav-current');
        });

        it('can disable activeClass with falsey values', function () {
            // Empty string
            assert.equal(compile('{{link_class for="/about/" activeClass=""}}')
                .with({relativeUrl: '/about/'}), '');

            // false
            assert.equal(compile('{{link_class for="/about/" activeClass=false}}')
                .with({relativeUrl: '/about/'}), '');
        });
    });

    describe('parentActiveClass', function () {
        it('gets applied correctly', function () {
            // Parent and child links with PARENT as relative URL
            assert.equal(compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'}), '<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            assert.equal(compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('ignores anchors', function () {
            // Anchor in href

            // Parent and child links with PARENT as relative URL
            assert.equal(compile('<li class="{{link_class for="/about/#me"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'}), '<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            assert.equal(compile('<li class="{{link_class for="/about/#me"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');

            // Anchor in relative URL

            // Parent and child links with PARENT as relative URL
            assert.equal(compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/#me'}), '<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            assert.equal(compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/#me'}), '<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('handles missing trailing slashes', function () {
            // Parent and child links with PARENT as relative URL
            assert.equal(compile('<li class="{{link_class for="/about"}}">parent</li><li class="{{link_class for="/about/team"}}">child</li>')
                .with({relativeUrl: '/about/'}), '<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            assert.equal(compile('<li class="{{link_class for="/about"}}">parent</li><li class="{{link_class for="/about/team"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('handles absolute URLs', function () {
            // Correct URL gets class

            // Parent and child links with PARENT as relative URL
            assert.equal(compile('<li class="{{link_class for="https://siteurl.com/about/"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'}), '<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            assert.equal(compile('<li class="{{link_class for="https://siteurl.com/about/"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');

            // Incorrect URL doesn't get class

            // Parent and child links with PARENT as relative URL
            assert.equal(compile('<li class="{{link_class for="https://othersite.com/about/"}}">parent</li><li class="{{link_class for="https://othersite.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'}), '<li class="">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            assert.equal(compile('<li class="{{link_class for="https://othersite.com/about/"}}">parent</li><li class="{{link_class for="https://othersite.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="">parent</li><li class="">child</li>');
        });

        it('handles absolute URLs with missing trailing slashes', function () {
            // Parent and child links with PARENT as relative URL
            assert.equal(compile('<li class="{{link_class for="https://siteurl.com/about"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team"}}">child</li>')
                .with({relativeUrl: '/about/'}), '<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            assert.equal(compile('<li class="{{link_class for="https://siteurl.com/about"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('parentActiveClass can be customised', function () {
            assert.equal(compile('<li class="{{link_class for="/about/" parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="parent">parent</li><li class="nav-current">child</li>');

            assert.equal(compile('<li class="{{link_class for="/about/" parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/" parentActiveClass="parent"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="parent">parent</li><li class="nav-current">child</li>');

            assert.equal(compile('<li class="{{link_class for="/about/" parentActiveClass=slug}}">parent</li><li class="{{link_class for="/about/team/" parentActiveClass="parent"}}">child</li>')
                .with({relativeUrl: '/about/team/', slug: 'fred'}), '<li class="fred">parent</li><li class="nav-current">child</li>');

            assert.equal(compile('<li class="{{link_class for="/about/" parentActiveClass=(concat slug "-parent")}}">parent</li><li class="{{link_class for="/about/team/" parentActiveClass="parent"}}">child</li>')
                .with({relativeUrl: '/about/team/', slug: 'fred'}), '<li class="fred-parent">parent</li><li class="nav-current">child</li>');
        });

        it('customising activeClass also customises parentActiveClass', function () {
            assert.equal(compile('<li class="{{link_class for="/about/" activeClass="active"}}">parent</li><li class="{{link_class for="/about/team/" activeClass="active"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="active-parent">parent</li><li class="active">child</li>');

            assert.equal(compile('<li class="{{link_class for="/about/" activeClass="active" parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/" activeClass="active"}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="parent">parent</li><li class="active">child</li>');
        });

        it('can disable parentActiveClass with falsey values', function () {
            assert.equal(compile('{{link_class for="/about/" parentActiveClass=""}}')
                .with({relativeUrl: '/about/team/'}), '');

            assert.equal(compile('{{link_class for="/about/" parentActiveClass=false}}')
                .with({relativeUrl: '/about/team/'}), '');
        });

        it('disabling activeClass does not affect parentActiveClass', function () {
            assert.equal(compile('<li class="{{link_class for="/about/" activeClass=""}}">parent</li><li class="{{link_class for="/about/team/" activeClass=""}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="nav-current-parent">parent</li><li class="">child</li>');

            assert.equal(compile('<li class="{{link_class for="/about/" activeClass=false parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/" activeClass=false}}">child</li>')
                .with({relativeUrl: '/about/team/'}), '<li class="parent">parent</li><li class="">child</li>');
        });
    });
});
