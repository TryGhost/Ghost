const should = require('should');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

const concat = require('../../../../core/frontend/helpers/concat');
const url = require('../../../../core/frontend/helpers/url');

const configUtils = require('../../../utils/configUtils');
const {shouldCompileToExpected, shouldCompileToExpectedWithGlobals} = require('./utils/handlebars');

let defaultGlobals;

const draftPostData = {title: 'My Draft Post', slug: 'my-post', html: '<p>My Post</p>', uuid: '1234'};

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
        let templateString = '{{concat}}';
        let expected = '';
        shouldCompileToExpected(templateString, {}, expected);
    });

    it('can correctly concat things that resolve to empty', function () {
        let templateString = '{{concat tag.slug slug}}';
        let expected = '';
        shouldCompileToExpected(templateString, {tag: {}}, expected);
    });

    it('can concat simple strings', function () {
        let templateString = '{{concat "hello" "world"}}';
        let expected = 'helloworld';
        shouldCompileToExpected(templateString, {}, expected);
    });

    it('can concat simple strings with a custom separator', function () {
        let templateString = '{{concat "hello" "world" separator=" "}}';
        let expected = 'hello world';
        shouldCompileToExpected(templateString, {}, expected);
    });

    it('can concat strings and numbers', function () {
        let templateString = '{{concat "abcd" 1234}}';
        let expected = 'abcd1234';
        shouldCompileToExpected(templateString, {}, expected);
    });

    it('can concat strings and global variables', function () {
        let templateString = '{{concat @site.url "?my=param"}}';
        let expected = 'https://siteurl.com?my=param';
        shouldCompileToExpectedWithGlobals(templateString, {}, expected, defaultGlobals);
    });

    it('can concat strings and local variables', function () {
        let templateString = '{{concat tag.slug "?my=param"}}';
        let expected = 'my-tag?my=param';
        shouldCompileToExpected(templateString, {tag: {slug: 'my-tag'}}, expected);
    });

    it('can concat strings from custom helpers (SafeStrings)', function () {
        // Simulate a post - using a draft to prove url helper gets called
        // because published posts get their urls from a cache that we don't have access to, so we just get 404
        let templateString = '{{concat (url) "?my=param"}}';
        let expected = '/p/1234/?my=param';
        shouldCompileToExpected(templateString, draftPostData, expected);
    });

    it('can concat mixed args', function () {
        let templateString = '{{concat @site.url (url) "?slug=" slug}}';
        let expected = 'https://siteurl.com/p/1234/?slug=my-post';
        shouldCompileToExpectedWithGlobals(templateString, draftPostData, expected, defaultGlobals);
    });

    it('will output object Object for sill args', function () {
        let templateString = '{{concat @site "?my=param"}}';
        let expected = '[object Object]?my=param';
        shouldCompileToExpectedWithGlobals(templateString, {}, expected, defaultGlobals);
    });
});
