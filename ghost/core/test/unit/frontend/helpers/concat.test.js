const should = require('should');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

const concat = require('../../../../core/frontend/helpers/concat');
const url = require('../../../../core/frontend/helpers/url');

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

describe('{{concat}} helper', function () {
    before(function () {
        handlebars.registerHelper('concat', concat);
        handlebars.registerHelper('url', url);
        configUtils.config.set('url', 'https://siteurl.com');

        defaultGlobals = {
            data: {
                site: {
                    url: configUtils.config.get('url')
                }
            }
        };
    });

    it('can correctly concat nothing', function () {
        compile('{{concat}}')
            .with({})
            .should.eql('');
    });

    it('can correctly concat things that resolve to empty', function () {
        compile('{{concat tag.slug slug}}')
            .with({tag: {}})
            .should.eql('');
    });

    it('can concat simple strings', function () {
        compile('{{concat "hello" "world"}}')
            .with({})
            .should.eql('helloworld');
    });

    it('can concat simple strings with a custom separator', function () {
        compile('{{concat "hello" "world" separator=" "}}')
            .with({})
            .should.eql('hello world');
    });

    it('can concat strings and numbers', function () {
        compile('{{concat "abcd" 1234}}')
            .with({})
            .should.eql('abcd1234');
    });

    it('can concat strings and global variables', function () {
        compile('{{concat @site.url "?my=param"}}')
            .with({})
            .should.eql('https://siteurl.com?my=param');
    });

    it('can concat strings and local variables', function () {
        compile('{{concat tag.slug "?my=param"}}')
            .with({tag: {slug: 'my-tag'}})
            .should.eql('my-tag?my=param');
    });

    it('can concat strings from custom helpers (SafeStrings)', function () {
        compile('{{concat (url) "?my=param"}}')
            // Simulate a post - using a draft to prove url helper gets called
            // because published posts get their urls from a cache that we don't have access to, so we just get 404
            .with({title: 'My Draft Post', slug: 'my-post', html: '<p>My Post</p>', uuid: '1234'})
            .should.eql('/p/1234/?my=param');
    });

    it('can concat mixed args', function () {
        compile('{{concat @site.url (url) "?slug=" slug}}')
            // Simulate a post - using a draft to prove url helper gets called
            // because published posts get their urls from a cache that we don't have access to, so we just get 404
            .with({title: 'My Draft Post', slug: 'my-post', html: '<p>My Post</p>', uuid: '1234'})
            .should.eql('https://siteurl.com/p/1234/?slug=my-post');
    });

    it('will output object Object for sill args', function () {
        compile('{{concat @site "?my=param"}}')
            .with({})
            .should.eql('[object Object]?my=param');
    });
});
