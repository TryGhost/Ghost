/**
 * Tests the twitter extension for showdown
 *
 */

/*globals describe, it */
var testUtils = require('../utils'),
    should = require('should'),

    // Stuff we are testing
    ghPath = "../../shared/vendor/showdown/extensions/twitter.js",
    twitter = require(ghPath);

function _ExecuteExtension(ext, text) {
    if (ext.regex) {
        var re = new RegExp(ext.regex, 'g');
        return text.replace(re, ext.replace);
    } else if (ext.filter) {
        return ext.filter(text);
    }
}

function _ConvertPhrase(testPhrase) {
    return twitter().reduce(function (text, ext) {
        return _ExecuteExtension(ext, text);
    }, testPhrase);
}


describe("twitter showdown extensions", function () {
    /*jslint regexp: true */

    it("should export an array of methods for processing", function () {
        twitter.should.be.a.function;
        twitter().should.be.an.Array;

        twitter().forEach(function (processor) {
            processor.should.be.an.Object;
            processor.should.have.property("type");
            processor.type.should.be.a.String;
        });

    });

    it("should auto-link URL in text with markdown syntax", function () {
        var testPhrases = [
                {
                    input: "\nhttps://twitter.com/xdamman/status/408455694241636352\n",
                    output: /twitter-tweet/
                },
                {
                    input: "\nhttps://twitter.com/jack/status/20\n",
                    output: /twitter-tweet/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should NOT auto-link URL in HTML", function () {
        var testPhrases = [
                {
                    input: '<a href="http://facebook.com">http://google.co.uk</a>',
                    output: /^<a href=\"http:\/\/facebook.com\">http:\/\/google.co.uk<\/a>$/
                },
                {
                    input: '<a href="https://twitter.com/xdamman/status/408455694241636352">test</a> https://twitter.com/xdamman/status/408455694241636352',
                    output: /^<a href=\"https:\/\/twitter.com\/xdamman\/status\/408455694241636352\">test<\/a> https:\/\/twitter.com\/xdamman\/status\/408455694241636352$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should NOT auto-link reference URL", function () {
        var testPhrases = [
                {
                    input: "[1]: https://twitter.com/xdamman/status/408455694241636352", 
                    output: /^\[1\]: https:\/\/twitter.com\/xdamman\/status\/408455694241636352$/
                },
                {
                    input: "[https://twitter.com/xdamman/status/408455694241636352]: https://twitter.com/xdamman/status/408455694241636352",
                    output: /^\[https:\/\/twitter.com\/xdamman\/status\/408455694241636352]: https:\/\/twitter.com\/xdamman\/status\/408455694241636352$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

});

