const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

const concat = require('../../../../core/frontend/helpers/concat');
const split = require('../../../../core/frontend/helpers/split');
const url = require('../../../../core/frontend/helpers/url');

const configUtils = require('../../../utils/config-utils');
const SafeString = require('../../../../core/frontend/services/handlebars').SafeString;
const {shouldCompileToExpected, shouldCompileToExpectedWithGlobals} = require('./utils/handlebars');

let defaultGlobals;

const draftPostData = {title: 'My Draft Post', slug: 'my-post', html: '<p>My Post</p>', uuid: '1234'};

describe('{{concat}} helper', function () {
    before(function () {
        handlebars.registerHelper('concat', concat);
        handlebars.registerHelper('url', url);
        handlebars.registerHelper('split', split);
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

    it('can concat empty safestrings', function () {
        let templateString = '{{concat non_empty_safe_string empty_safe_string}}';
        let expected = 'non_empty_safe_string';
        shouldCompileToExpected(templateString, {non_empty_safe_string: new SafeString('non_empty_safe_string'), empty_safe_string: new SafeString('')}, expected);
    });

    it('can concat arrays with default separator', function () {
        const testArray = [new SafeString('hello'), new SafeString('world'), new SafeString('test')];
        let templateString = '{{concat test_array}}';
        let expected = 'helloworldtest';
        shouldCompileToExpected(templateString, {test_array: testArray}, expected);
    });

    it('can concat arrays with custom separator', function () {
        const testArray = [new SafeString('hello'), new SafeString('world'), new SafeString('test')];
        let templateString = '{{concat test_array separator="|"}}';
        let expected = 'hello|world|test';
        shouldCompileToExpected(templateString, {test_array: testArray}, expected);
    });

    it('can concat arrays with empty strings', function () {
        const testArray = [new SafeString('hello'), new SafeString(''), new SafeString('world')];
        let templateString = '{{concat test_array separator="|"}}';
        let expected = 'hello||world';
        shouldCompileToExpected(templateString, {test_array: testArray}, expected);
    });

    it('can concat mixed arrays and strings', function () {
        const testArray = [new SafeString('array1'), new SafeString('array2')];
        let templateString = '{{concat "prefix" test_array "suffix" separator="-"}}';
        let expected = 'prefix-array1-array2-suffix';
        shouldCompileToExpected(templateString, {test_array: testArray}, expected);
    });

    it('can concat multiple arrays', function () {
        const array1 = [new SafeString('a'), new SafeString('b')];
        const array2 = [new SafeString('c'), new SafeString('d')];
        let templateString = '{{concat array1 array2 separator="|"}}';
        let expected = 'a|b|c|d';
        shouldCompileToExpected(templateString, {array1: array1, array2: array2}, expected);
    });

    it('can concat arrays with trailing empty strings', function () {
        const testArray = [new SafeString('hello'), new SafeString('world'), new SafeString('')];
        let templateString = '{{concat test_array separator="|"}}';
        let expected = 'hello|world|';
        shouldCompileToExpected(templateString, {test_array: testArray}, expected);
    });
    it('can concatenate an array produced by the split helper', function () {
        const templateString = '{{concat (split "hello,world,") separator="|"}}';
        const expected = 'hello|world';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('can concatenate an array produced by the split helper with a custom separator', function () {
        const templateString = '{{concat (split "hello world" separator=" ") separator="|"}}';
        const expected = 'hello|world';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('does not handle objects, returning [object Object]', function () {
        const templateString = '{{concat post post.slug separator=" | "}}';
        const expected = '[object Object] | my-post';
        shouldCompileToExpected(templateString, {post: {title: 'My Post', slug: 'my-post'}}, expected);
    });
});
