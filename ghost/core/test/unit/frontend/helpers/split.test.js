const {registerHelper, shouldCompileToExpected} = require('./utils/handlebars');
const {SafeString} = require('handlebars');

describe('{{split}} helper in block mode', function () {
    before(function () {
        registerHelper('split');
        registerHelper('foreach');
        registerHelper('match');
    });

    it('splits strings correctly with the default separator (not specified - a comma) ', function () {
        const templateString = '{{#split "hello,world" as |elements|}}{{#foreach elements}}-{{this}}-{{/foreach}}{{/split}}';
        const expected = '-hello--world-';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('can split strings when the separator is an empty string', function () {
        const templateString = '{{#split "hello" separator="" as |elements|}}{{#foreach elements}}{{this}} {{/foreach}}{{/split}}';
        const expected = 'h e l l o ';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('returns an empty array if the string is empty', function () {
        const templateString = '{{#split "" as |elements|}}{{#foreach elements}}{{this}}{{/foreach}}{{/split}}';
        const expected = '';
        shouldCompileToExpected(templateString, {}, expected);
    });

    it('splits strings with a custom separator correctly', function () {
        const templateString = '{{#split "hello world" separator=" " as |elements|}}{{#foreach elements}}{{this}}{{/foreach}}{{/split}}';
        const expected = 'helloworld';
        shouldCompileToExpected(templateString, {}, expected);
    });
    
    it('splits strings when the default separator is specified', function () {
        const templateString = '{{#split "hello,world" separator="," as |elements|}}{{#foreach elements}}{{this}}{{#unless @last}}|{{/unless}}{{/foreach}}{{/split}}';
        const expected = 'hello|world';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('splits safe strings correctly', function () {
        const hash = {
            safestring_split_me: new SafeString('hello-world-lets-gooo')
        };
        const templateString = '{{#split safestring_split_me separator="-" as |elements|}}{{#foreach elements}}{{this}}{{/foreach}}{{/split}}';
        const expected = 'helloworldletsgooo';
        shouldCompileToExpected(templateString, hash, expected);
    });
    it('does not need a block definition', function () {
        const templateString = '{{#split "hello,world" separator=","}}{{#foreach this}}{{this}}{{#unless @last}}|{{/unless}}{{/foreach}}{{/split}}';
        const expected = 'hello|world';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('can be counted', function () {
        const templateString = '{{#split "hello,world" separator=","}}{{this.length}}{{/split}}';
        const expected = '2';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('can be used with match helper', function () {
        const templateString = '{{#split "my-slug-is-long-too-long" separator="-"}}{{#foreach this}}{{#match this "long"}}LONG{{else}}{{this}}{{/match}}{{#unless @last}}-{{/unless}}{{/foreach}}{{/split}}';
        const expected = 'my-slug-is-LONG-too-LONG';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('handles undefined input gracefully', function () {
        const templateString = '{{#split undefined}}{{this.length}}{{/split}}';
        const expected = '0';
        shouldCompileToExpected(templateString, {}, expected);
    });
    
    it('handles null input gracefully', function () {
        const hash = {nullValue: null};
        const templateString = '{{#split nullValue}}{{this.length}}{{/split}}';
        const expected = '0';
        shouldCompileToExpected(templateString, hash, expected);
    });
    
    it('handles number input by converting to string', function () {
        const templateString = '{{#split 12345 separator=""}}{{#foreach this}}{{this}}-{{/foreach}}{{/split}}';
        const expected = '1-2-3-4-5-';
        shouldCompileToExpected(templateString, {}, expected);
    });
});

describe('{{split}} helper in inline mode', function () {
    before(function () {
        registerHelper('split');
        registerHelper('foreach');
        registerHelper('match');
    });
    it('splits strings correctly with the default separator (not specified - a comma) ', function () {
        const templateString = '{{#foreach (split "hello,world" separator=",")}}{{this}}{{#unless @last}}<br>{{/unless}}{{/foreach}}';
        const expected = 'hello<br>world';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('splits strings correctly with a custom separator', function () {
        const templateString = '{{#foreach (split "hello beautiful world" separator=" ")}}{{this}}{{#unless @last}}<br>{{/unless}}{{/foreach}}';
        const expected = 'hello<br>beautiful<br>world';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('can be used to remove a suffix from a string', function () {
        const templateString = '{{#foreach (split "my-slug-is-long-too-long" separator="-")}}{{#unless @first}}{{#unless @last}}-{{/unless}}{{/unless}}{{#unless @last}}{{this}}{{/unless}}{{/foreach}}';
        const expected = 'my-slug-is-long-too';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('can be used with match helper', function () {
        const templateString = '{{#foreach (split "my-slug-is-long-too-long" separator="-")}}{{#match this "long"}}LONG{{else}}{{this}}{{/match}}{{#unless @last}}-{{/unless}}{{/foreach}}';
        const expected = 'my-slug-is-LONG-too-LONG';
        shouldCompileToExpected(templateString, {}, expected);
    });
    it('splits safe strings correctly', function () {
        const hash = {
            safestring_split_me: new SafeString('hello-world-lets-gooo')
        };
        const templateString = '{{#foreach (split safestring_split_me separator="-")}}{{this}}{{/foreach}}';
        const expected = 'helloworldletsgooo';
        shouldCompileToExpected(templateString, hash, expected);
    });
});