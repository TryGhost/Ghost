/**
 * Tests the highlight extension for showdown
 *
 * Note, that the showdown highlight extension is a post-HTML filter, so most of the tests are in
 * showdown_client_integration_spec, to make it easier to test the behaviour on top of the already converted HTML
 *
 */

/*globals describe, it */
/*jshint expr:true*/
var should      = require('should'),

    // Stuff we are testing
    ghosthighlight   = require('../../shared/lib/showdown/extensions/ghosthighlight');

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
    return ghosthighlight().reduce(function (text, ext) {
        return _ExecuteExtension(ext, text);
    }, testPhrase);
}

describe('Ghost highlight showdown extension', function () {
    /*jslint regexp: true */

    it('should export an array of methods for processing', function () {
        ghosthighlight.should.be.a.function;
        ghosthighlight().should.be.an.Array;

        ghosthighlight().forEach(function (processor) {
            processor.should.be.an.Object;
            processor.should.have.property('type');
            processor.type.should.be.a.String;
        });
    });

    it('should replace showdown highlight with html', function () {
        var testPhrases = [
                {
                    input: '==foo_bar==',
                    output: /^<mark>foo_bar<\/mark>$/
                },
                {
                    input: 'My stuff that has a ==highlight== in the middle.',
                    output: /^My stuff that has a <mark>highlight<\/mark> in the middle.$/
                },
                {
                    input: 'My stuff that has a ==multiple word highlight== in the middle.',
                    output: /^My stuff that has a <mark>multiple word highlight<\/mark> in the middle.$/
                },
                {
                    input: 'My stuff that has a ==multiple word and\n line broken highlight== in the middle.',
                    output: /^My stuff that has a <mark>multiple word and\n line broken highlight<\/mark> in the middle.$/
                }

            ];

        testPhrases.forEach(function (testPhrase) {
            var processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should ignore multiple equals', function () {
        var testPhrase = {input: '=====', output: /^=====$/},
            processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });
});
