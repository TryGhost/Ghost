/**
 * Test the ghostdown extension
 *
 * Only ever runs on the client (i.e in the editor)
 * Server processes showdown without it so there can never be an image upload form in a post.
 */

/*globals describe, it */
var testUtils = require('./testUtils'),
    should = require('should'),

    // Stuff we are testing
    gdPath = "../../client/assets/vendor/showdown/extensions/ghostdown.js",
    ghostdown = require(gdPath);

describe("Ghostdown showdown extensions", function () {

    it("should export an array of methods for processing", function () {

        ghostdown.should.be.a("function");
        ghostdown().should.be.an.instanceof(Array);

        ghostdown().forEach(function (processor) {
            processor.should.be.a("object");
            processor.should.have.property("type");
            processor.should.have.property("filter");
            processor.type.should.be.a("string");
            processor.filter.should.be.a("function");
        });
    });

    it("should accurately detect images in markdown", function () {
        [
            "![]",
            "![]()",
            "![image and another,/ image]",
            "![image and another,/ image]()",
            "![image and another,/ image](http://dsurl.stuff)",
            "![](http://dsurl.stuff)"
            /* No ref-style for now
            "![][]",
            "![image and another,/ image][stuff]",
            "![][stuff]",
            "![image and another,/ image][]"
            */
        ]
            .forEach(function (imageMarkup) {
                var processedMarkup =
                    ghostdown().reduce(function (prev, processor) {
                        return processor.filter(prev);
                    }, imageMarkup);

                // The image is the entire markup, so the image box should be too
                processedMarkup.should.match(/^<section.*?section>\n*$/);
            });
    });

    it("should correctly include an image", function () {
        [
            "![image and another,/ image](http://dsurl.stuff)",
            "![](http://dsurl.stuff)"
            /* No ref-style for now
            "![image and another,/ image][test]\n\n[test]: http://dsurl.stuff",
            "![][test]\n\n[test]: http://dsurl.stuff"
            */
        ]
            .forEach(function (imageMarkup) {
                var processedMarkup =
                    ghostdown().reduce(function (prev, processor) {
                        return processor.filter(prev);
                    }, imageMarkup);

                processedMarkup.should.match(/<img class="js-upload-target"/);
            });
    });
});