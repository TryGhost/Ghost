/**
 * Client showdown integration tests
 *
 * Ensures that the final output from showdown + client extensions is as expected
 */

/*globals describe, it */
var Showdown = require('showdown'),
    github = require('../../shared/vendor/showdown/extensions/github'),
    ghostdown = require('../../client/assets/vendor/showdown/extensions/ghostdown'),
    converter = new Showdown.converter({extensions: [ghostdown, github]}),

    should = require('should');

describe("Showdown client side converter", function () {

    it("should replace showdown strike through with html", function () {
        var testPhrase = {input: "~~foo_bar~~", output: /^<p><del>foo_bar<\/del><\/p>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        // The image is the entire markup, so the image box should be too
        processedMarkup.should.match(testPhrase.output);
    });

    it("should not touch single underscores inside words", function () {
        var testPhrase = {input: "foo_bar", output: /^<p>foo_bar<\/p>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it("should not touch underscores in code blocks", function () {
        var testPhrase = {input: "    foo_bar_baz", output: /^<pre><code>foo_bar_baz\n<\/code><\/pre>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it("should not touch underscores in pre blocks", function () {
        var testPhrases = [
                {input: "<pre>\nfoo_bar_baz\n</pre>", output: /^<pre>\nfoo_bar_baz\n<\/pre>$/},
                {input: "<pre>foo_bar_baz</pre>", output: /^<pre>foo_bar_baz<\/pre>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should not treat pre blocks with pre-text differently", function () {
        var testPhrases = [
                {input: "<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n</pre>", output: /^<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n<\/pre>$/},
                {input: "hmm<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n</pre>", output: /^<p>hmm<\/p>\n\n<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n<\/pre>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should escape two or more underscores inside words", function () {
        var testPhrases = [
                {input: "foo_bar_baz", output: /^<p>foo_bar_baz<\/p>$/},
                {input: "foo_bar_baz_bat", output: /^<p>foo_bar_baz_bat<\/p>$/},
                {input: "foo_bar_baz_bat_boo", output: /^<p>foo_bar_baz_bat_boo<\/p>$/},
                {input: "FOO_BAR", output: /^<p>FOO_BAR<\/p>$/},
                {input: "FOO_BAR_BAZ", output: /^<p>FOO_BAR_BAZ<\/p>$/},
                {input: "FOO_bar_BAZ_bat", output: /^<p>FOO_bar_BAZ_bat<\/p>$/},
                {input: "FOO_bar_BAZ_bat_BOO", output: /^<p>FOO_bar_BAZ_bat_BOO<\/p>$/},
                {input: "foo_BAR_baz_BAT_boo", output: /^<p>foo_BAR_baz_BAT_boo<\/p>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should turn newlines into br tags in simple cases", function () {
        var testPhrases = [
                {input: "fizz\nbuzz", output: /^<p>fizz <br \/>\nbuzz<\/p>$/},
                {input: "Hello world\nIt's a fine day", output: /^<p>Hello world <br \/>\nIt\'s a fine day<\/p>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should convert newlines in all groups", function () {
        var testPhrases = [
                {input: "ruby\npython\nerlang", output: /^<p>ruby <br \/>\npython <br \/>\nerlang<\/p>$/},
                {input: "Hello world\nIt's a fine day\nout", output: /^<p>Hello world <br \/>\nIt\'s a fine day <br \/>\nout<\/p>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should convert newlines in even long groups", function () {
        var testPhrases = [
                {input: "ruby\npython\nerlang\ngo", output: /^<p>ruby <br \/>\npython <br \/>\nerlang <br \/>\ngo<\/p>$/},
                {
                    input: "Hello world\nIt's a fine day\noutside\nthe window",
                    output: /^<p>Hello world <br \/>\nIt\'s a fine day <br \/>\noutside <br \/>\nthe window<\/p>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should not convert newlines in lists", function () {
        var testPhrases = [
                {input: "#fizz\n# buzz\n### baz", output: /^<h1 id="fizz">fizz<\/h1>\n\n<h1 id="buzz">buzz<\/h1>\n\n<h3 id="baz">baz<\/h3>$/},
                {input: "* foo\n* bar", output: /^<ul>\n<li>foo<\/li>\n<li>bar<\/li>\n<\/ul>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should auto-link URL", function () {
        var testPhrases = [
                {input: "http://google.co.uk", output: /^<p><a href=\'http:\/\/google.co.uk\'>http:\/\/google.co.uk<\/a><\/p>$/},
                {
                    input: "https://atest.com/fizz/buzz?baz=fizzbuzz",
                    output: /^<p><a href=\'https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz\'>https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz<\/a><\/p>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should auto-link Email", function () {
        var testPhrase = {input: "info@tryghost.org", output: /^<p><a href=\'mailto:info@tryghost.org\'>info@tryghost.org<\/a><\/p>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    // Fails
    it("should convert reference format URL", function () {
        var testPhrases = [
                {
                    input: "[Google][1]\n\n[1]: http://google.co.uk",
                    output: /^<p><a href="http:\/\/google.co.uk">Google<\/a><\/p>$/,
                },
                {
                    input: "[Google][1]\n\n[1]: http://google.co.uk \"some text\"",
                    output: /^<p><a href="http:\/\/google.co.uk" title="some text">Google<\/a><\/p>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should convert reference format image", function () {
        var testPhrases = [
                {
                    input: "![Google][1]\n\n[1]: http://dsurl.stuff/something.jpg",
                    output: /^<section.*?<img.*?src="http:\/\/dsurl.stuff\/something.jpg"\/>.*?<\/section>$/,
                },
                {
                    input: "![Google][1]\n\n[1]: http://dsurl.stuff/something.jpg \"some text\"",
                    output: /^<section.*?<img.*?src="http:\/\/dsurl.stuff\/something.jpg"\/>.*?<\/section>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should NOT auto-link reference URL", function () {
        var testPhrase = {input: "[1]: http://google.co.uk", output: /^$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });


    it("should NOT auto-link image reference URL", function () {
        var testPhrase = {input: "[1]: http://dsurl.stuff/something.jpg", output: /^$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it("should show placeholder for image markdown", function () {
        var testPhrases = [
                {input:  "![image and another,/ image](http://dsurl stuff)", output: /^<section.*?section>\n*$/},
                {input: "![image and another,/ image]", output: /^<section.*?section>\n*$/},
                {input: "![]()", output: /^<section.*?section>\n*$/},
                {input: "![]", output: /^<section.*?section>\n*$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it("should have placeholder with image ONLY if image URL is present and valid", function () {
        var testPhrases = [
                {
                    input:  "![image stuff](http://dsurl.stuff/something.jpg)",
                    output: /^<section.*?<img class="js-upload-target.*?<\/section>$/
                },
                {input: "![]", output: /<img class="js-upload-target"/, not: true},
                {input: "![]", output: /^<section.*?<\/section>$/},
                {input: "![]()", output: /<img class="js-upload-target"/, not: true},
                {input: "![]()", output: /^<section.*?<\/section>$/},
                {input: "![]", output:  /<img class="js-upload-target"/, not: true},
                {input: "![]", output:  /^<section.*?<\/section>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            if (testPhrase.not) {
                processedMarkup.should.not.match(testPhrase.output);
            } else {
                processedMarkup.should.match(testPhrase.output);
            }
        });
    });

    it("should have placeholder with image if image reference is present", function () {
        var testPhrases = [
                {
                    input: "![alt][id]\n\n[id]: http://dsurl.stuff/something.jpg",
                    output:  /^<section.*?<img class="js-upload-target.*?<\/section>$/
                },
                {input: "![][]", output: /^<section.*?<\/section>$/},
                {input: "![][]",  output:  /<img class="js-upload-target"/, not: true},
                {input: "![][id]", output: /^<section.*?<\/section>$/},
                {input: "![][id]",  output:  /<img class="js-upload-target"/, not: true}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            if (testPhrase.not) {
                processedMarkup.should.not.match(testPhrase.output);
            } else {
                processedMarkup.should.match(testPhrase.output);
            }
        });
    });

    it("should NOT auto-link image URL", function () {
        var testPhrases = [
                {
                    input:  "![image stuff](http://dsurl.stuff/something)",
                    output: /^<section.*?((?!<a href=\'http:\/\/dsurl.stuff\/something\').)*<\/section>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

});