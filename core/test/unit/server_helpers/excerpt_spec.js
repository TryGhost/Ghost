/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{excerpt}} Helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded excerpt helper', function () {
        should.exist(handlebars.helpers.excerpt);
    });

    it('can render excerpt', function () {
        var html = 'Hello World',
            rendered = helpers.excerpt.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal(html);
    });

    it('does not output HTML', function () {
        var html = '<p>There are <br />10<br> types<br/> of people in <img src="a">the world:' +
                '<img src=b alt="c"> those who <img src="@" onclick="javascript:alert(\'hello\');">' +
                'understand trinary</p>, those who don\'t <div style="" class=~/\'-,._?!|#>and' +
                '< test > those<<< test >>> who mistake it &lt;for&gt; binary.',
            expected = 'There are 10 types of people in the world: those who understand trinary, those who ' +
                'don\'t and those>> who mistake it &lt;for&gt; binary.',
            rendered = helpers.excerpt.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('strips multiple inline footnotes', function () {
        var html = '<p>Testing<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup>, my footnotes. And stuff. Footnote<sup id="fnref:2"><a href="#fn:2" rel="footnote">2</a></sup><a href="http://google.com">with a link</a> right after.',
            expected = 'Testing, my footnotes. And stuff. Footnotewith a link right after.',
            rendered = helpers.excerpt.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('strips inline and bottom footnotes', function () {
        var html = '<p>Testing<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup> a very short post with a single footnote.</p>\n' +
            '<div class="footnotes"><ol><li class="footnote" id="fn:1"><p><a href="https://ghost.org">https://ghost.org</a> <a href="#fnref:1" title="return to article">↩</a></p></li></ol></div>',
        expected = 'Testing a very short post with a single footnote.',
        rendered = helpers.excerpt.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('can truncate html by word', function () {
        var html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            expected = 'Hello World!',
            rendered = (
                helpers.excerpt.call(
                    {html: html},
                    {hash: {words: '2'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('can truncate html with non-ascii characters by word', function () {
        var html = '<p>Едквюэ опортэат <strong>праэчынт ючю но, квуй эю</strong></p>',
            expected = 'Едквюэ опортэат',
            rendered = (
                helpers.excerpt.call(
                    {html: html},
                    {hash: {words: '2'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('can truncate html by character', function () {
        var html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            expected = 'Hello Wo',
            rendered = (
                helpers.excerpt.call(
                    {html: html},
                    {hash: {characters: '8'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
