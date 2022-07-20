const should = require('should');
const concat = require('../../../../core/frontend/helpers/concat');
const link_class = require('../../../../core/frontend/helpers/link_class');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

const configUtils = require('../../../utils/configUtils');

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

    after(function () {
        configUtils.restore();
    });

    it('throws an error for missing for=""', function () {
        (function compileWith() {
            compile('{{link_class}}')
                .with({});
        }).should.throw();
    });

    it('silently accepts an empty for...', function () {
        compile('{{link_class for=tag.slug}}')
            .with({tag: null})
            .should.eql('');
    });

    it('silently accepts an empty SafeString', function () {
        compile('{{link_class for=blank_safe_string}}')
            .with({blank_safe_string: new handlebars.SafeString('')})
            .should.eql('');
    });

    describe('activeClass', function () {
        it('gets applied correctly', function () {
            // Test matching relative URL
            compile('{{link_class for="/about/"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('nav-current');

            // Test non-matching relative URL
            compile('{{link_class for="/about/"}}')
                .with({relativeUrl: '/'})
                .should.eql('');
        });

        it('ignores anchors', function () {
            // Anchor in href
            compile('{{link_class for="/about/#me"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('nav-current');

            // Anchor in relative URL
            compile('{{link_class for="/about/"}}')
                .with({relativeUrl: '/about/#me'})
                .should.eql('nav-current');
        });

        it('handles missing trailing slashes', function () {
            compile('{{link_class for="/about"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('nav-current');
        });

        it('handles absolute URLs', function () {
            // Correct URL gets class
            compile('{{link_class for="https://siteurl.com/about/"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('nav-current');

            // Incorrect URL doesn't get class
            compile('{{link_class for="https://othersite.com/about/"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('');
        });

        it('handles absolute URL with missing trailing slash', function () {
            compile('{{link_class for="https://siteurl.com/about"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('nav-current');
        });

        it('activeClass can be customised', function () {
            compile('{{link_class for="/about/" activeClass="nav-active"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('nav-active');

            compile('{{link_class for="/about/" activeClass=slug}}')
                .with({relativeUrl: '/about/', slug: 'fred'})
                .should.eql('fred');

            compile('{{link_class for="/about/" activeClass=(concat slug "active" separator="-")}}')
                .with({relativeUrl: '/about/', slug: 'fred'})
                .should.eql('fred-active');
        });

        it('activeClass and other classes work together', function () {
            // Single extra class
            compile('{{link_class for="/about/" class="about"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('about nav-current');

            // Multiple extra classes
            compile('{{link_class for="/about/" class="about my-link"}}')
                .with({relativeUrl: '/about/'})
                .should.eql('about my-link nav-current');
        });

        it('can disable activeClass with falsey values', function () {
            // Empty string
            compile('{{link_class for="/about/" activeClass=""}}')
                .with({relativeUrl: '/about/'})
                .should.eql('');

            // false
            compile('{{link_class for="/about/" activeClass=false}}')
                .with({relativeUrl: '/about/'})
                .should.eql('');
        });
    });

    describe('parentActiveClass', function () {
        it('gets applied correctly', function () {
            // Parent and child links with PARENT as relative URL
            compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'})
                .should.eql('<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('ignores anchors', function () {
            // Anchor in href

            // Parent and child links with PARENT as relative URL
            compile('<li class="{{link_class for="/about/#me"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'})
                .should.eql('<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            compile('<li class="{{link_class for="/about/#me"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');

            // Anchor in relative URL

            // Parent and child links with PARENT as relative URL
            compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/#me'})
                .should.eql('<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            compile('<li class="{{link_class for="/about/"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/#me'})
                .should.eql('<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('handles missing trailing slashes', function () {
            // Parent and child links with PARENT as relative URL
            compile('<li class="{{link_class for="/about"}}">parent</li><li class="{{link_class for="/about/team"}}">child</li>')
                .with({relativeUrl: '/about/'})
                .should.eql('<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            compile('<li class="{{link_class for="/about"}}">parent</li><li class="{{link_class for="/about/team"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('handles absolute URLs', function () {
            // Correct URL gets class

            // Parent and child links with PARENT as relative URL
            compile('<li class="{{link_class for="https://siteurl.com/about/"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'})
                .should.eql('<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            compile('<li class="{{link_class for="https://siteurl.com/about/"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');

            // Incorrect URL doesn't get class

            // Parent and child links with PARENT as relative URL
            compile('<li class="{{link_class for="https://othersite.com/about/"}}">parent</li><li class="{{link_class for="https://othersite.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/'})
                .should.eql('<li class="">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            compile('<li class="{{link_class for="https://othersite.com/about/"}}">parent</li><li class="{{link_class for="https://othersite.com/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="">parent</li><li class="">child</li>');
        });

        it('handles absolute URLs with missing trailing slashes', function () {
            // Parent and child links with PARENT as relative URL
            compile('<li class="{{link_class for="https://siteurl.com/about"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team"}}">child</li>')
                .with({relativeUrl: '/about/'})
                .should.eql('<li class="nav-current">parent</li><li class="">child</li>');

            // Parent and child links with CHILD as relative URL
            compile('<li class="{{link_class for="https://siteurl.com/about"}}">parent</li><li class="{{link_class for="https://siteurl.com/about/team"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="nav-current-parent">parent</li><li class="nav-current">child</li>');
        });

        it('parentActiveClass can be customised', function () {
            compile('<li class="{{link_class for="/about/" parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="parent">parent</li><li class="nav-current">child</li>');

            compile('<li class="{{link_class for="/about/" parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/" parentActiveClass="parent"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="parent">parent</li><li class="nav-current">child</li>');

            compile('<li class="{{link_class for="/about/" parentActiveClass=slug}}">parent</li><li class="{{link_class for="/about/team/" parentActiveClass="parent"}}">child</li>')
                .with({relativeUrl: '/about/team/', slug: 'fred'})
                .should.eql('<li class="fred">parent</li><li class="nav-current">child</li>');

            compile('<li class="{{link_class for="/about/" parentActiveClass=(concat slug "-parent")}}">parent</li><li class="{{link_class for="/about/team/" parentActiveClass="parent"}}">child</li>')
                .with({relativeUrl: '/about/team/', slug: 'fred'})
                .should.eql('<li class="fred-parent">parent</li><li class="nav-current">child</li>');
        });

        it('customising activeClass also customises parentActiveClass', function () {
            compile('<li class="{{link_class for="/about/" activeClass="active"}}">parent</li><li class="{{link_class for="/about/team/" activeClass="active"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="active-parent">parent</li><li class="active">child</li>');

            compile('<li class="{{link_class for="/about/" activeClass="active" parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/" activeClass="active"}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="parent">parent</li><li class="active">child</li>');
        });

        it('can disable parentActiveClass with falsey values', function () {
            compile('{{link_class for="/about/" parentActiveClass=""}}')
                .with({relativeUrl: '/about/team/'})
                .should.eql('');

            compile('{{link_class for="/about/" parentActiveClass=false}}')
                .with({relativeUrl: '/about/team/'})
                .should.eql('');
        });

        it('disabling activeClass does not affect parentActiveClass', function () {
            compile('<li class="{{link_class for="/about/" activeClass=""}}">parent</li><li class="{{link_class for="/about/team/" activeClass=""}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="nav-current-parent">parent</li><li class="">child</li>');

            compile('<li class="{{link_class for="/about/" activeClass=false parentActiveClass="parent"}}">parent</li><li class="{{link_class for="/about/team/" activeClass=false}}">child</li>')
                .with({relativeUrl: '/about/team/'})
                .should.eql('<li class="parent">parent</li><li class="">child</li>');
        });
    });
});
