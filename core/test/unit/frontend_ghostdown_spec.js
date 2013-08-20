/*globals describe, it */
var gdPath = "../../client/assets/vendor/showdown/extensions/ghostdown.js",
    should = require('should'),
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
        
        [   "![image and another,/ image](http://dsurl stuff)",
            "![image and another,/ image]",
            "![]()",
            "![]" ]
            .forEach(function (imageMarkup) {
                var processedMarkup = 
                    ghostdown().reduce(function(prev,processor) {
                        return processor.filter(prev);
                    },imageMarkup);
                
                // The image is the entire markup, so the image box should be too
                processedMarkup.should.match(/^<section.*?section>\n*$/);
            });
    });
});