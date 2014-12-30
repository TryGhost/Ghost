/**
 * Tests the footnotes extension for showdown
 *
 */

/*globals describe, it */
/*jshint expr:true*/
var should      = require('should'),

    // Stuff we are testing
    ghostfootnotes = require('../../shared/lib/showdown/extensions/ghostfootnotes'),
    Showdown       = require('showdown-ghost'),
    converter      = new Showdown.converter({extensions: []});

// To stop jshint complaining
should.equal(true, true);

function _ExecuteExtension(ext, text) {
    if (ext.regex) {
        var re = new RegExp(ext.regex, 'g');
        return text.replace(re, ext.replace);
    } else if (ext.filter) {
        return ext.filter(text);
    }
}

function _ConvertPhrase(testPhrase) {
    return ghostfootnotes(converter).reduce(function (text, ext) {
        return _ExecuteExtension(ext, text);
    }, testPhrase);
}

describe('Ghost footnotes showdown extension', function () {
    /*jslint regexp: true */

    it('should export an array of methods for processing', function () {
        ghostfootnotes.should.be.a.function;
        ghostfootnotes().should.be.an.Array;

        ghostfootnotes().forEach(function (processor) {
            processor.should.be.an.Object;
            processor.should.have.property('type');
            processor.type.should.be.a.String;
        });
    });

    it('should replace inline footnotes with the right html', function () {
        var testPhrase = {
            input: 'foo_bar[^1]',
            output: /<sup id="fnref:1"><a href="#fn:1" rel="footnote">1<\/a><\/sup>/
        }, processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it('should replace end footnotes with the right html', function () {
        var testPhrase = {
            input: '[^1]: foo bar',
            output: /<div class="footnotes"><ol><li class="footnote" id="fn:1"><p>foo bar <a href="#fnref:1" title="return to article">↩<\/a><\/p><\/li><\/ol><\/div>/
        }, processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it('should expand Markdown inside footnotes', function () {
        var testPhrase = {
            input: '[^1]: *foo*',
            output: /<em>foo<\/em>/
        }, processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it('should number multiple footnotes correctly', function () {
        var testPhrase = {
            input: 'foo[^1] bar[^n] etc[^2]',
            output: /foo<sup id="fnref:1"><a href="#fn:1" rel="footnote">1<\/a><\/sup> bar<sup id="fnref:2"><a href="#fn:2" rel="footnote">2<\/a><\/sup> etc<sup id="fnref:2"><a href="#fn:2" rel="footnote">2<\/a><\/sup>/
        }, processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it('should put everything together', function () {
        // Tests for some interaction bugs between components e.g.
        // confusing the end form and the inline form
        var testPhrase = {
            input: 'foo bar[^1] is a very[^n] foo bar[^1]\n' +
                   '[^n]: a metasyntactic variable\n' +
                   '[^n]: this is hard to measure',
            output: 'foo bar<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup> is a very<sup id="fnref:2"><a href="#fn:2" rel="footnote">2</a></sup> foo bar<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup>\n' +
                    '<div class="footnotes"><ol><li class="footnote" id="fn:1"><p>a metasyntactic variable <a href="#fnref:1" title="return to article">↩</a></p></li>\n' +
                    '<li class="footnote" id="fn:2"><p>this is hard to measure <a href="#fnref:2" title="return to article">↩</a></p></li></ol></div>'
        }, processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });
});
