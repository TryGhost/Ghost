const assert = require('node:assert/strict');
const concat = require('../../../../core/frontend/helpers/concat');
const link = require('../../../../core/frontend/helpers/link');
const url = require('../../../../core/frontend/helpers/url');
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

describe('{{link}} helper', function () {
    before(function () {
        handlebars.registerHelper('link', link);
        handlebars.registerHelper('url', url);
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

    describe('basic behavior: simple links without context', function () {
        it('throws an error for missing href=""', function () {
            assert.throws((function compileWith() {
                compile('{{#link}}text{{/link}}')
                    .with({});
            }));
        });

        it('silently accepts an empty href...', function () {
            assert.equal(compile('{{#link href=tag.slug}}text{{/link}}')
                .with({tag: null}), '<a href="">text</a>');
        });

        it('<a> tag with a specific URL', function () {
            assert.equal(compile('{{#link href="/about/"}}text{{/link}}')
                .with({}), '<a href="/about/">text</a>');
        });

        it('<a> tag with an anchor', function () {
            assert.equal(compile('{{#link href="#myheading"}}text{{/link}}')
                .with({}), '<a href="#myheading">text</a>');
        });

        it('<a> tag with global variable', function () {
            assert.equal(compile('{{#link href=@site.url}}text{{/link}}')
                .with({}), '<a href="https://siteurl.com">text</a>');
        });

        it('<a> tag with local variable', function () {
            assert.equal(compile('{{#link href=tag.slug}}text{{/link}}')
                .with({tag: {slug: 'my-tag'}}), '<a href="my-tag">text</a>');
        });

        it('<a> tag with nested helpers', function () {
            assert.equal(compile('{{#link href=(url)}}{{title}}{{/link}}')
            // Simulate a post - using a draft to prove url helper gets called
            // because published posts get their urls from a cache that we don't have access to, so we just get 404
                .with({title: 'My Draft Post', slug: 'my-post', html: '<p>My Post</p>', uuid: '1234'}), '<a href="/p/1234/">My Draft Post</a>');
        });

        it('can wrap html content', function () {
            assert.equal(compile('{{#link href="/"}}<img src="myfile.jpg" />{{/link}}')
                .with({}), '<a href="/"><img src="myfile.jpg" /></a>');
        });

        it('honours class attribute', function () {
            assert.equal(compile('{{#link href="#myheading" class="my-class"}}text{{/link}}')
                .with({}), '<a class="my-class" href="#myheading">text</a>');
        });

        it('supports multiple classes', function () {
            assert.equal(compile('{{#link href="#myheading" class="my-class and-stuff"}}text{{/link}}')
                .with({}), '<a class="my-class and-stuff" href="#myheading">text</a>');
        });

        it('can handle classes that come from variables', function () {
            assert.equal(compile('{{#link href="#myheading" class=slug}}text{{/link}}')
                .with({slug: 'fred'}), '<a class="fred" href="#myheading">text</a>');
        });

        it('can handle classes that come from helpers', function () {
            assert.equal(compile('{{#link href="#myheading" class=(concat "my-" slug)}}text{{/link}}')
                .with({slug: 'fred'}), '<a class="my-fred" href="#myheading">text</a>');
        });

        it('supports multiple attributes', function () {
            assert.equal(compile('{{#link href="#myheading" class="my-class" target="_blank"}}text{{/link}}')
                .with({}), '<a class="my-class" href="#myheading" target="_blank">text</a>');
        });
    });

    describe('dynamic behavior: advanced links using context', function () {
        describe('activeClass', function () {
            it('gets applied correctly', function () {
                // Test matching relative URL
                assert.equal(compile('{{#link href="/about/"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="/about/">text</a>');

                // Test non-matching relative URL
                assert.equal(compile('{{#link href="/about/"}}text{{/link}}')
                    .with({relativeUrl: '/'}), '<a href="/about/">text</a>');
            });

            it('ignores anchors', function () {
                // Anchor in href
                assert.equal(compile('{{#link href="/about/#me"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="/about/#me">text</a>');

                // Anchor in relative URL
                assert.equal(compile('{{#link href="/about/"}}text{{/link}}')
                    .with({relativeUrl: '/about/#me'}), '<a class="nav-current" href="/about/">text</a>');
            });

            it('handles missing trailing slashes', function () {
                assert.equal(compile('{{#link href="/about"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="/about">text</a>');
            });

            it('handles absolute URLs', function () {
                // Correct URL gets class
                assert.equal(compile('{{#link href="https://siteurl.com/about/"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="https://siteurl.com/about/">text</a>');

                // Incorrect URL doesn't get class
                assert.equal(compile('{{#link href="https://othersite.com/about/"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a href="https://othersite.com/about/">text</a>');
            });

            it('handles absolute URL with missing trailing slash', function () {
                assert.equal(compile('{{#link href="https://siteurl.com/about"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="https://siteurl.com/about">text</a>');
            });

            it('activeClass can be customised', function () {
                assert.equal(compile('{{#link href="/about/" activeClass="nav-active"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-active" href="/about/">text</a>');

                assert.equal(compile('{{#link href="/about/" activeClass=slug}}text{{/link}}')
                    .with({relativeUrl: '/about/', slug: 'fred'}), '<a class="fred" href="/about/">text</a>');

                assert.equal(compile('{{#link href="/about/" activeClass=(concat slug "active" separator="-")}}text{{/link}}')
                    .with({relativeUrl: '/about/', slug: 'fred'}), '<a class="fred-active" href="/about/">text</a>');
            });

            it('activeClass and other classes work together', function () {
                // Single extra class
                assert.equal(compile('{{#link href="/about/" class="about"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="about nav-current" href="/about/">text</a>');

                // Multiple extra classes
                assert.equal(compile('{{#link href="/about/" class="about my-link"}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="about my-link nav-current" href="/about/">text</a>');
            });

            it('can disable activeClass with falsey values', function () {
                // Empty string
                assert.equal(compile('{{#link href="/about/" activeClass=""}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a href="/about/">text</a>');

                // false
                assert.equal(compile('{{#link href="/about/" activeClass=false}}text{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a href="/about/">text</a>');
            });
        });

        describe('parentActiveClass', function () {
            it('gets applied correctly', function () {
                // Parent and child links with PARENT as relative URL
                assert.equal(compile('{{#link href="/about/"}}parent{{/link}}{{#link href="/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="/about/">parent</a><a href="/about/team/">child</a>');

                // Parent and child links with CHILD as relative URL
                assert.equal(compile('{{#link href="/about/"}}parent{{/link}}{{#link href="/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="nav-current-parent" href="/about/">parent</a><a class="nav-current" href="/about/team/">child</a>');
            });

            it('ignores anchors', function () {
                // Anchor in href

                // Parent and child links with PARENT as relative URL
                assert.equal(compile('{{#link href="/about/#me"}}parent{{/link}}{{#link href="/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="/about/#me">parent</a><a href="/about/team/">child</a>');

                // Parent and child links with CHILD as relative URL
                assert.equal(compile('{{#link href="/about/#me"}}parent{{/link}}{{#link href="/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="nav-current-parent" href="/about/#me">parent</a><a class="nav-current" href="/about/team/">child</a>');

                // Anchor in relative URL

                // Parent and child links with PARENT as relative URL
                assert.equal(compile('{{#link href="/about/"}}parent{{/link}}{{#link href="/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/#me'}), '<a class="nav-current" href="/about/">parent</a><a href="/about/team/">child</a>');

                // Parent and child links with CHILD as relative URL
                assert.equal(compile('{{#link href="/about/"}}parent{{/link}}{{#link href="/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/#me'}), '<a class="nav-current-parent" href="/about/">parent</a><a class="nav-current" href="/about/team/">child</a>');
            });

            it('handles missing trailing slashes', function () {
                // Parent and child links with PARENT as relative URL
                assert.equal(compile('{{#link href="/about"}}parent{{/link}}{{#link href="/about/team"}}child{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="/about">parent</a><a href="/about/team">child</a>');

                // Parent and child links with CHILD as relative URL
                assert.equal(compile('{{#link href="/about"}}parent{{/link}}{{#link href="/about/team"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="nav-current-parent" href="/about">parent</a><a class="nav-current" href="/about/team">child</a>');
            });

            it('handles absolute URLs', function () {
                // Correct URL gets class

                // Parent and child links with PARENT as relative URL
                assert.equal(compile('{{#link href="https://siteurl.com/about/"}}parent{{/link}}{{#link href="https://siteurl.com/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="https://siteurl.com/about/">parent</a><a href="https://siteurl.com/about/team/">child</a>');

                // Parent and child links with CHILD as relative URL
                assert.equal(compile('{{#link href="https://siteurl.com/about/"}}parent{{/link}}{{#link href="https://siteurl.com/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="nav-current-parent" href="https://siteurl.com/about/">parent</a><a class="nav-current" href="https://siteurl.com/about/team/">child</a>');

                // Incorrect URL doesn't get class

                // Parent and child links with PARENT as relative URL
                assert.equal(compile('{{#link href="https://othersite.com/about/"}}parent{{/link}}{{#link href="https://othersite.com/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a href="https://othersite.com/about/">parent</a><a href="https://othersite.com/about/team/">child</a>');

                // Parent and child links with CHILD as relative URL
                assert.equal(compile('{{#link href="https://othersite.com/about/"}}parent{{/link}}{{#link href="https://othersite.com/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a href="https://othersite.com/about/">parent</a><a href="https://othersite.com/about/team/">child</a>');
            });

            it('handles absolute URLs with missing trailing slashes', function () {
                // Parent and child links with PARENT as relative URL
                assert.equal(compile('{{#link href="https://siteurl.com/about"}}parent{{/link}}{{#link href="https://siteurl.com/about/team"}}child{{/link}}')
                    .with({relativeUrl: '/about/'}), '<a class="nav-current" href="https://siteurl.com/about">parent</a><a href="https://siteurl.com/about/team">child</a>');

                // Parent and child links with CHILD as relative URL
                assert.equal(compile('{{#link href="https://siteurl.com/about"}}parent{{/link}}{{#link href="https://siteurl.com/about/team"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="nav-current-parent" href="https://siteurl.com/about">parent</a><a class="nav-current" href="https://siteurl.com/about/team">child</a>');
            });

            it('parentActiveClass can be customised', function () {
                assert.equal(compile('{{#link href="/about/" parentActiveClass="parent"}}parent{{/link}}{{#link href="/about/team/"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="parent" href="/about/">parent</a><a class="nav-current" href="/about/team/">child</a>');

                assert.equal(compile('{{#link href="/about/" parentActiveClass="parent"}}parent{{/link}}{{#link href="/about/team/" parentActiveClass="parent"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="parent" href="/about/">parent</a><a class="nav-current" href="/about/team/">child</a>');

                assert.equal(compile('{{#link href="/about/" parentActiveClass=slug}}parent{{/link}}{{#link href="/about/team/" parentActiveClass="parent"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/', slug: 'fred'}), '<a class="fred" href="/about/">parent</a><a class="nav-current" href="/about/team/">child</a>');

                assert.equal(compile('{{#link href="/about/" parentActiveClass=(concat slug "-parent")}}parent{{/link}}{{#link href="/about/team/" parentActiveClass="parent"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/', slug: 'fred'}), '<a class="fred-parent" href="/about/">parent</a><a class="nav-current" href="/about/team/">child</a>');
            });

            it('customising activeClass also customises parentActiveClass', function () {
                assert.equal(compile('{{#link href="/about/" activeClass="active"}}parent{{/link}}{{#link href="/about/team/" activeClass="active"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="active-parent" href="/about/">parent</a><a class="active" href="/about/team/">child</a>');

                assert.equal(compile('{{#link href="/about/" activeClass="active" parentActiveClass="parent"}}parent{{/link}}{{#link href="/about/team/" activeClass="active"}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="parent" href="/about/">parent</a><a class="active" href="/about/team/">child</a>');
            });

            it('can disable parentActiveClass with falsey values', function () {
                assert.equal(compile('{{#link href="/about/" parentActiveClass=""}}text{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a href="/about/">text</a>');

                assert.equal(compile('{{#link href="/about/" parentActiveClass=false}}text{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a href="/about/">text</a>');
            });

            it('disabling activeClass does not affect parentActiveClass', function () {
                assert.equal(compile('{{#link href="/about/" activeClass=""}}parent{{/link}}{{#link href="/about/team/" activeClass=""}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="nav-current-parent" href="/about/">parent</a><a href="/about/team/">child</a>');

                assert.equal(compile('{{#link href="/about/" activeClass=false parentActiveClass="parent"}}parent{{/link}}{{#link href="/about/team/" activeClass=false}}child{{/link}}')
                    .with({relativeUrl: '/about/team/'}), '<a class="parent" href="/about/">parent</a><a href="/about/team/">child</a>');
            });
        });
    });
});
