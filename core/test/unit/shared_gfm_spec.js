/**
 * Tests the github extension for showdown
 *
 */

/*globals describe, it */
var ghPath = "../../shared/vendor/showdown/extensions/github.js",
    should = require('should'),
    github = require(ghPath);

function _ExecuteExtension(ext, text) {
    if (ext.regex) {
        var re = new RegExp(ext.regex, 'g');
        return text.replace(re, ext.replace);
    } else if (ext.filter) {
        return ext.filter(text);
    }
}

function _ConvertPhrase(testPhrase) {
    return github().reduce(function (text, ext) {
        return _ExecuteExtension(ext, text);
    }, testPhrase);
}


describe("Github showdown extensions", function () {

    it("should export an array of methods for processing", function () {
        github.should.be.a("function");
        github().should.be.an.instanceof(Array);

        github().forEach(function (processor) {
            processor.should.be.a("object");
            processor.should.have.property("type");
            processor.type.should.be.a("string");
        });

    });

    it("should replace showdown strike through with html", function () {
        var testPhrase = {input: "~T~Tfoo_bar~T~T", output: /<del>foo_bar<\/del>/},
            processedMarkup = _ConvertPhrase(testPhrase.input);

        // The image is the entire markup, so the image box should be too
        processedMarkup.should.match(testPhrase.output);
    });

    it("should auto-link URL", function () {
        var testPhrases = [
                {input: "http://google.co.uk", output: /^<a href=\'http:\/\/google.co.uk\'>http:\/\/google.co.uk<\/a>$/},
                {
                    input: "https://atest.com/fizz/buzz?baz=fizzbuzz",
                    output: /^<a href=\'https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz\'>https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz<\/a>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should auto-link Email", function () {
        var testPhrase = {input: "info@tryghost.org", output: /^<a href=\'mailto:info@tryghost.org\'>info@tryghost.org<\/a>$/},
            processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it("should NOT auto-link reference URL", function () {
        var testPhrase = {input: "[1]: http://google.co.uk", output: /^\n\n\[1\]: http:\/\/google.co.uk$/},
            processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it("should NOT auto-link image URL", function () {
        var testPhrase = {input: "[1]: http://dsurl.stuff/something.jpg", output: /^\n\n\[1\]: http:\/\/dsurl.stuff\/something.jpg$/},
            processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });
});