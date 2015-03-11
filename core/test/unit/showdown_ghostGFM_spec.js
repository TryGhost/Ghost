/**
 * Tests the github extension for showdown
 *
 */

/*globals describe, it */
/*jshint expr:true*/
var should      = require('should'),

    // Stuff we are testing
    ghostgfm    = require('../../shared/lib/showdown/extensions/ghostgfm');

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
    return ghostgfm().reduce(function (text, ext) {
        return _ExecuteExtension(ext, text);
    }, testPhrase);
}

describe('Ghost GFM showdown extension', function () {
    /*jslint regexp: true */

    it('should export an array of methods for processing', function () {
        ghostgfm.should.be.a.function;
        ghostgfm().should.be.an.Array;

        ghostgfm().forEach(function (processor) {
            processor.should.be.an.Object;
            processor.should.have.property('type');
            processor.type.should.be.a.String;
        });
    });

    it('should replace showdown strike through with html', function () {
        var testPhrase = {input: '~T~Tfoo_bar~T~T', output: /<del>foo_bar<\/del>/},
            processedMarkup = _ConvertPhrase(testPhrase.input);

        // The image is the entire markup, so the image box should be too
        processedMarkup.should.match(testPhrase.output);
    });

    it('should honour escaped tildes', function () {
        /*jshint -W044 */
        var testPhrase = {input: '\\~T\\~Tfoo_bar\\~T\\~T', output: /~T~Tfoo_bar~T~T/},
        /*jshint +W044 */
            processedMarkup = _ConvertPhrase(testPhrase.input);

        // The image is the entire markup, so the image box should be too
        processedMarkup.should.match(testPhrase.output);
    });

    it('should allow 4 underscores', function () {
        var testPhrase = {input: 'Ghost ____', output: /Ghost\s(?:&#95;){4}$/},
            processedMarkup = _ConvertPhrase(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it('should auto-link URL in text with markdown syntax', function () {
        var testPhrases = [
            {
                input: 'http://google.co.uk',
                output: /^<a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: 'https://atest.com/fizz/buzz?baz=fizzbuzz',
                output: /^<a href="https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz">https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz<\/a>$/
            },
            {
                input: 'Some text http://www.google.co.uk some other text',
                output: /^Some text <a href="http:\/\/www.google.co.uk">http:\/\/www.google.co.uk<\/a> some other text$/
            },
            {
                input: 'Some [ text http://www.google.co.uk some other text',
                output: /^Some \[ text <a href="http:\/\/www.google.co.uk">http:\/\/www.google.co.uk<\/a> some other text$/
            },
            {
                input: 'Some [ text (http://www.google.co.uk) some other text',
                output: /^Some \[ text \(<a href="http:\/\/www.google.co.uk">http:\/\/www.google.co.uk<\/a>\) some other text$/
            },
            {
                input: '  http://google.co.uk  ',
                output: /^  <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>  $/
            },
            {
                input: '>http://google.co.uk',
                output: /^><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '> http://google.co.uk',
                output: /^> <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '<>>> http://google.co.uk',
                output: /^<>>> <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '<>>>http://google.co.uk',
                output: /^<>>><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '<some text>>>http://google.co.uk',
                output: /^<some text>>><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '<strong>http://google.co.uk',
                output: /^<strong><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '# http://google.co.uk',
                output: /^# <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '#http://google.co.uk',
                output: /^#<a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '* http://google.co.uk',
                output: /^\* <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should NOT auto-link URL in HTML', function () {
        var testPhrases = [
            {
                input: '<img src="http://placekitten.com/50">',
                output: /^<img src=\"http:\/\/placekitten.com\/50\">$/
            },
            {
                input: '<img src="http://placekitten.com/50" />',
                output: /^<img src=\"http:\/\/placekitten.com\/50\" \/>$/
            },
            {
                input: '<script type="text/javascript" src="http://google.co.uk"></script>',
                output: /^<script type=\"text\/javascript\" src=\"http:\/\/google.co.uk\"><\/script>$/
            },
            {
                input: '<script>var url = "http://google.co.uk"</script>',
                output: /^<script>var url = \"http:\/\/google.co.uk\"<\/script>$/
            },
            {
                input: '<a href="http://facebook.com">http://google.co.uk</a>',
                output: /^<a href=\"http:\/\/facebook.com\">http:\/\/google.co.uk<\/a>$/
            },
            {
                input: '<a href="http://facebook.com">test</a> http://google.co.uk',
                output: /^<a href="http:\/\/facebook.com">test<\/a> <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should NOT auto-link reference URL', function () {
        var testPhrases = [
            {
                input: '[1]: http://www.google.co.uk',
                output: /^\n\n\[1\]: http:\/\/www.google.co.uk$/
            },
            {
                input: '[http://www.google.co.uk]: http://www.google.co.uk',
                output: /^\n\n\[http:\/\/www.google.co.uk]: http:\/\/www.google.co.uk$/
            },
            {
                input: '[1]: http://dsurl.stuff/something.jpg',
                output: /^\n\n\[1\]: http:\/\/dsurl.stuff\/something.jpg$/
            },
            {
                input: '[1]:http://www.google.co.uk',
                output: /^\n\n\[1\]:http:\/\/www.google.co.uk$/
            },
            {
                input: ' [1]:http://www.google.co.uk',
                output: /^\n\n \[1\]:http:\/\/www.google.co.uk$/
            },
            {
                input: '[http://www.google.co.uk]: http://www.google.co.uk',
                output: /^\n\n\[http:\/\/www.google.co.uk\]: http:\/\/www.google.co.uk$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should NOT auto-link URL in link or image markdown', function () {
        var testPhrases = [
            {
                input: '[1](http://google.co.uk)',
                output: /^\[1\]\(http:\/\/google.co.uk\)$/
            },
            {
                input: '  [1](http://google.co.uk)',
                output: /^  \[1\]\(http:\/\/google.co.uk\)$/
            },
            {
                input: '[http://google.co.uk](http://google.co.uk)',
                output: /^\[http:\/\/google.co.uk\]\(http:\/\/google.co.uk\)$/
            },
            {
                input: '[http://google.co.uk][id]',
                output: /^\[http:\/\/google.co.uk\]\[id\]$/
            },
            {
                input: '![1](http://google.co.uk/kitten.jpg)',
                output: /^<img src=\"http:\/\/google.co.uk\/kitten.jpg\" alt=\"1\" \/>$/
            },
            {
                input: '  ![1](http://google.co.uk/kitten.jpg)',
                output: /^  !\[1\]\(http:\/\/google.co.uk\/kitten.jpg\)$/
            },
            {
                input: '![http://google.co.uk/kitten.jpg](http://google.co.uk/kitten.jpg)',
                output: /^<img src=\"http:\/\/google.co.uk\/kitten.jpg\" alt=\"http:\/\/google.co.uk\/kitten.jpg\" \/>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

     // behaviour if you add a gap between [] and ()
    it('should auto-link if markdown is invalid', function () {
        var testPhrases = [
            {
                input: '[1] (http://google.co.uk)',
                output: /^\[1\] \(<a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a>\)$/
            },
            {
                input: '![1] (http://google.co.uk/kitten.jpg)',
                output:
                    /^!\[1\] \(<a href="http:\/\/google.co.uk\/kitten.jpg">http:\/\/google.co.uk\/kitten.jpg<\/a>\)$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should not output image if there is no src', function () {
        var testPhrases = [
            {
                input: '![anything here]()',
                output: /^$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = _ConvertPhrase(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });
});
