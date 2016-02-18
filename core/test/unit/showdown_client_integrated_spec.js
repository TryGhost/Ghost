/**
 * Client showdown integration tests
 *
 * Ensures that the final output from showdown + client extensions is as expected
 */

/*globals describe, it */
var should      = require('should'),

    // Stuff we are testing
    Showdown    = require('showdown-ghost'),
    converter   = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm', 'footnotes', 'highlight']});

// To stop jshint complaining
should.equal(true, true);

describe('Showdown client side converter', function () {
    /*jslint regexp: true */

    it('should replace showdown strike through with html', function () {
        var testPhrase = {input: '~~foo_bar~~', output: /^<p><del>foo_bar<\/del><\/p>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        // The image is the entire markup, so the image box should be too
        processedMarkup.should.match(testPhrase.output);
    });

    it('should honour escaped tildes', function () {
        var testPhrase = {input: '\\~\\~foo_bar\\~\\~', output: /^<p>~~foo_bar~~<\/p>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        // The image is the entire markup, so the image box should be too
        processedMarkup.should.match(testPhrase.output);
    });

    it('should not touch single underscores inside words', function () {
        var testPhrase = {input: 'foo_bar', output: /^<p>foo_bar<\/p>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    // Currently failing - fixing this causes other issues
    // it('should not create italic words between lines', function () {
    //     var testPhrase = {input: 'foo_bar\nbar_foo', output: /^<p>foo_bar <br \/>\nbar_foo<\/p>$/},
    //         processedMarkup = converter.makeHtml(testPhrase.input);

    //     processedMarkup.should.match(testPhrase.output);
    // });

    it('should not touch underscores in code blocks', function () {
        var testPhrase = {input: '    foo_bar_baz', output: /^<pre><code>foo_bar_baz\n<\/code><\/pre>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it('should not touch underscores in pre blocks', function () {
        var testPhrases = [
                {input: '<pre>\nfoo_bar_baz\n</pre>', output: /^<pre>\nfoo_bar_baz\n<\/pre>$/},
                {input: '<pre>foo_bar_baz</pre>', output: /^<pre>foo_bar_baz<\/pre>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should not escape double underscores at the beginning of a line', function () {
        var testPhrases = [
                {input: '\n__test__\n', output: /^<p><strong>test<\/strong><\/p>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should not treat pre blocks with pre-text differently', function () {
        var testPhrases = [
            {
                input: '<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n</pre>',
                output: /^<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n<\/pre>$/
            },
            {
                input: 'hmm<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n</pre>',
                output: /^<p>hmm<\/p>\n\n<pre>\nthis is `a\\_test` and this\\_too and finally_this_is\n<\/pre>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should escape two or more underscores inside words', function () {
        var testPhrases = [
                {input: 'foo_bar_baz', output: /^<p>foo_bar_baz<\/p>$/},
                {input: 'foo_bar_baz_bat', output: /^<p>foo_bar_baz_bat<\/p>$/},
                {input: 'foo_bar_baz_bat_boo', output: /^<p>foo_bar_baz_bat_boo<\/p>$/},
                {input: 'FOO_BAR', output: /^<p>FOO_BAR<\/p>$/},
                {input: 'FOO_BAR_BAZ', output: /^<p>FOO_BAR_BAZ<\/p>$/},
                {input: 'FOO_bar_BAZ_bat', output: /^<p>FOO_bar_BAZ_bat<\/p>$/},
                {input: 'FOO_bar_BAZ_bat_BOO', output: /^<p>FOO_bar_BAZ_bat_BOO<\/p>$/},
                {input: 'foo_BAR_baz_BAT_boo', output: /^<p>foo_BAR_baz_BAT_boo<\/p>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should turn newlines into br tags in simple cases', function () {
        var testPhrases = [
                {input: 'fizz\nbuzz', output: /^<p>fizz <br \/>\nbuzz<\/p>$/},
                {input: 'Hello world\nIt is a fine day', output: /^<p>Hello world <br \/>\nIt is a fine day<\/p>$/},
                {input: '\'first\nsecond', output: /^<p>\'first <br \/>\nsecond<\/p>$/},
                {input: '\'first\nsecond', output: /^<p>\'first <br \/>\nsecond<\/p>$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should convert newlines in all groups', function () {
        var testPhrases = [
            {
                input: 'ruby\npython\nerlang',
                output: /^<p>ruby <br \/>\npython <br \/>\nerlang<\/p>$/
            },
            {
                input: 'Hello world\nIt is a fine day\nout',
                output: /^<p>Hello world <br \/>\nIt is a fine day <br \/>\nout<\/p>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should convert newlines in even long groups', function () {
        var testPhrases = [
                {
                    input: 'ruby\npython\nerlang\ngo',
                    output: /^<p>ruby <br \/>\npython <br \/>\nerlang <br \/>\ngo<\/p>$/
                },
                {
                    input: 'Hello world\nIt is a fine day\noutside\nthe window',
                    output: /^<p>Hello world <br \/>\nIt is a fine day <br \/>\noutside <br \/>\nthe window<\/p>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should not convert newlines in lists', function () {
        var testPhrases = [
                {
                    input: '#fizz\n# buzz\n### baz',
                    output: /^<h1 id="fizz">fizz<\/h1>\n\n<h1 id="buzz">buzz<\/h1>\n\n<h3 id="baz">baz<\/h3>$/
                },
                {
                    input: '* foo\n* bar',
                    output: /^<ul>\n<li>foo<\/li>\n<li>bar<\/li>\n<\/ul>$/
                }
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should auto-link URL in text with markdown syntax', function () {
        var testPhrases = [
            {
                input: 'http://google.co.uk',
                output: /^<p><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>$/
            },
            {
                input: 'https://atest.com/fizz/buzz?baz=fizzbuzz',
                output: /^<p><a href="https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz">https:\/\/atest.com\/fizz\/buzz\?baz=fizzbuzz<\/a><\/p>$/
            },
            {
                input: 'Some [ text (http://www.google.co.uk) some other text',
                output: /^<p>Some \[ text \(<a href="http:\/\/www.google.co.uk">http:\/\/www.google.co.uk<\/a>\) some other text<\/p>$/
            },
            {
                input: '>http://google.co.uk',
                output: /^<blockquote>\n  <p><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>\n<\/blockquote>$/
            },
            {
                input: '> http://google.co.uk',
                output: /^<blockquote>\n  <p><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>\n<\/blockquote>$/
            },
            {
                input: '<>>> http://google.co.uk',
                output: /^<p>&lt;>>> <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>$/
            },
            {
                input: '<strong>http://google.co.uk',
                output: /^<p><strong><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>$/
            },
            {
                input: '# http://google.co.uk',
                output: /^<h1 id="httpgooglecouk"><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/h1>$/
            },
            {
                input: '* http://google.co.uk',
                output: /^<ul>\n<li><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/li>\n<\/ul>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should convert reference format URL', function () {
        var testPhrases = [
            {
                input: '[Google][1]\n\n[1]: http://google.co.uk',
                output: /^<p><a href="http:\/\/google.co.uk">Google<\/a><\/p>$/
            },
            {
                input: '[Google][1]\n\n[1]: http://google.co.uk \"some text\"',
                output: /^<p><a href="http:\/\/google.co.uk" title="some text">Google<\/a><\/p>$/
            },
            {
                input: '[http://google.co.uk]: http://google.co.uk\n\n[Hello][http://google.co.uk]',
                output: /^<p><a href="http:\/\/google.co.uk">Hello<\/a><\/p>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    /* No ref-style for now
     it('should convert reference format image', function () {
     var testPhrases = [
     {
     input: '![Google][1]\n\n[1]: http://dsurl.stuff/something.jpg',
     output: /^<section.*?<img.*?src="http:\/\/dsurl.stuff\/something.jpg"\/>.*?<\/section>$/,
     },
     {
     input: '![Google][1]\n\n[1]: http://dsurl.stuff/something.jpg \"some text\"',
     output: /^<section.*?<img.*?src="http:\/\/dsurl.stuff\/something.jpg"\/>.*?<\/section>$/
     },
     {
     input: '[http://www.google.co.uk]: http://www.google.co.uk\n\n![Hello][http://www.google.co.uk]',
     output: /^<section.*?<img.*?src="http:\/\/www.google.co.uk"\/>.*?<\/section>$/
     }
     ],
     processedMarkup;

     testPhrases.forEach(function (testPhrase) {
     processedMarkup = converter.makeHtml(testPhrase.input);
     processedMarkup.should.match(testPhrase.output);
     });
     });
     */

    it('should NOT auto-link URL in HTML', function () {
        var testPhrases = [
            {
                input: '<img src="http://placekitten.com/50">',
                output: /^<p><img src=\"http:\/\/placekitten.com\/50\"><\/p>$/
            },
            {
                input: '<img src="http://placekitten.com/50" />',
                output: /^<p><img src=\"http:\/\/placekitten.com\/50\" \/><\/p>$/
            },
            {
                input: '<script type="text/javascript" src="http://google.co.uk"></script>',
                output: /^<script type=\"text\/javascript\" src=\"http:\/\/google.co.uk\"><\/script>$/
            },
            {
                input: '<a href="http://facebook.com">http://google.co.uk</a>',
                output: /^<p><a href=\"http:\/\/facebook.com\">http:\/\/google.co.uk<\/a><\/p>$/
            },
            {
                input: '<a href="http://facebook.com">test</a> http://google.co.uk',
                output: /^<p><a href=\"http:\/\/facebook.com\">test<\/a> <a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should NOT escape underscore inside of code/pre blocks', function () {
        var testPhrase = {
                input: '```\n_____\n```',
                output: /^<pre><code>_____  \n<\/code><\/pre>$/
            },
            processedMarkup;

        processedMarkup = converter.makeHtml(testPhrase.input);
        processedMarkup.should.match(testPhrase.output);
    });

    it('should NOT auto-link URLS inside of code/pre blocks', function () {
        var testPhrases = [
            {
                input: '```\nurl: http://google.co.uk\n```',
                output: /^<pre><code>url: http:\/\/google.co.uk  \n<\/code><\/pre>$/
            },
            {
                input: '`url: http://google.co.uk`',
                output: /^<p><code>url: http:\/\/google.co.uk<\/code><\/p>$/
            },
            {
                input: 'Hello type some `url: http://google.co.uk` stuff',
                output: /^<p>Hello type some <code>url: http:\/\/google.co.uk<\/code> stuff<\/p>$/
            }

        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should not display anything for reference URL', function () {
        var testPhrases = [
            {
                input: '[1]: http://www.google.co.uk',
                output: /^$/
            },
            {
                input: '[http://www.google.co.uk]: http://www.google.co.uk',
                output: /^$/
            },
            {
                input: '[1]: http://dsurl.stuff/something.jpg',
                output: /^$/
            },
            {
                input: '[1]:http://www.google.co.uk',
                output: /^$/
            },
            {
                input: ' [1]:http://www.google.co.uk',
                output: /^$/
            },
            {
                input: '',
                output: /^$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should show placeholder for image markdown', function () {
        var testPhrases = [
                {input: '![image and another,/ image](http://dsurl stuff)', output: /^<section.*?section>\n*$/},
                {input: '![image and another,/ image]', output: /^<section.*?section>\n*$/},
                {input: '![]()', output: /^<section.*?section>\n*$/},
                {input: '![]', output: /^<section.*?section>\n*$/}
            ],
            processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should have placeholder with image ONLY if image URL is present and valid', function () {
        var testPhrases = [
                {
                    input: '![image stuff](http://dsurl.stuff/something.jpg)',
                    output: /^<section.*?<img class="js-upload-target.*?<\/section>$/
                },
                {input: '![]', output: /<img class="js-upload-target"/, not: true},
                {input: '![]', output: /^<section.*?<\/section>$/},
                {input: '![]()', output: /<img class="js-upload-target"/, not: true},
                {input: '![]()', output: /^<section.*?<\/section>$/},
                {input: '![]', output: /<img class="js-upload-target"/, not: true},
                {input: '![]', output: /^<section.*?<\/section>$/}
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

    /* No ref-style for now
     it('should have placeholder with image if image reference is present', function () {
     var testPhrases = [
     {
     input: '![alt][id]\n\n[id]: http://dsurl.stuff/something.jpg',
     output:  /^<section.*?<img class="js-upload-target.*?<\/section>$/
     },
     {input: '![][]', output: /^<section.*?<\/section>$/},
     {input: '![][]',  output:  /<img class="js-upload-target"/, not: true},
     {input: '![][id]', output: /^<section.*?<\/section>$/},
     {input: '![][id]',  output:  /<img class="js-upload-target"/, not: true}
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
     */

    it('should correctly output link and image markdown without autolinks', function () {
        var testPhrases = [
            {
                input: '[1](http://google.co.uk)',
                output: /^<p><a href="http:\/\/google.co.uk">1<\/a><\/p>$/
            },
            {
                input: '  [1](http://google.co.uk)',
                output: /^<p><a href="http:\/\/google.co.uk">1<\/a><\/p>$/
            },
            {
                input: '[http://google.co.uk](http://google.co.uk)',
                output: /^<p><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>$/
            },
            {
                input: '[http://google.co.uk][id]\n\n[id]: http://google.co.uk',
                output: /^<p><a href="http:\/\/google.co.uk">http:\/\/google.co.uk<\/a><\/p>$/
            },
            {
                input: '![http://google.co.uk/kitten.jpg](http://google.co.uk/kitten.jpg)',
                output: /^<section.*?((?!<a href="http:\/\/google.co.uk\/kitten.jpg").)*<\/section>$/
            },
            {
                input: '![image stuff](http://dsurl.stuff/something)',
                output: /^<section.*?((?!<a href="http:\/\/dsurl.stuff\/something").)*<\/section>$/
            }
        ],
        processedMarkup;

        testPhrases.forEach(function (testPhrase) {
            processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should output block HTML untouched', function () {
        var testPhrases = [
            {
                input: '<table class=\"test\">\n    <tr>\n        <td>Foo</td>\n    </tr>\n    <tr>\n        <td>Bar</td>\n    </tr>\n</table>',
                output: /^<table class=\"test\">  \n    <tr>\n        <td>Foo<\/td>\n    <\/tr>\n    <tr>\n        <td>Bar<\/td>\n    <\/tr>\n<\/table>$/
            },
            {
                input: '<hr />',
                output: /^<hr \/>$/
            },
            {   // audio isn't counted as a block tag by showdown so gets wrapped in <p></p>
                input: '<audio class=\"podcastplayer\" controls>\n    <source src=\"foobar.mp3\" type=\"audio/mp3\" preload=\"none\"></source>\n    <source src=\"foobar.off\" type=\"audio/ogg\" preload=\"none\"></source>\n</audio>',
                output: /^<audio class=\"podcastplayer\" controls>  \n    <source src=\"foobar.mp3\" type=\"audio\/mp3\" preload=\"none\"><\/source>\n    <source src=\"foobar.off\" type=\"audio\/ogg\" preload=\"none\"><\/source>\n<\/audio>$/
            }
        ];

        testPhrases.forEach(function (testPhrase) {
            var processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should treat ![^n] as footnote unless it occurs on a new line', function () {
        var testPhrases = [
            {
                input: 'Foo![^1](bar)',
                output: '<p>Foo!<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup>(bar)</p>'
            },

            {
                input: '![^1](bar)',
                output: '<section class="js-drop-zone image-uploader"><img class="js-upload-target" src="bar"/><div class="description">Add image of <strong>^1</strong></div><input data-url="upload" class="js-fileupload main fileupload" type="file" name="uploadimage"></section>'
            }
        ];

        testPhrases.forEach(function (testPhrase) {
            var processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should replace showdown highlight with html', function () {
        var testPhrases = [
            {
                input: '==foo_bar==',
                output: /^<p><mark>foo_bar<\/mark><\/p>$/
            },
            {
                input: 'My stuff that has a ==highlight== in the middle.',
                output: /^<p>My stuff that has a <mark>highlight<\/mark> in the middle.<\/p>$/
            },
            {
                input: 'My stuff that has a ==multiple word highlight== in the middle.',
                output: /^<p>My stuff that has a <mark>multiple word highlight<\/mark> in the middle.<\/p>$/
            },
            {
                input: 'My stuff that has a ==multiple word **bold** highlight== in the middle.',
                output: /^<p>My stuff that has a <mark>multiple word <strong>bold<\/strong> highlight<\/mark> in the middle.<\/p>$/
            },
            {
                input: 'My stuff that has a ==multiple word and\n line broken highlight== in the middle.',
                output: /^<p>My stuff that has a <mark>multiple word and <br \/>\n line broken highlight<\/mark> in the middle.<\/p>$/
            },
            {
                input: 'Test ==Highlighting with a [link](https://ghost.org) in the middle== of it.',
                output: /^<p>Test <mark>Highlighting with a <a href="https:\/\/ghost.org">link<\/a> in the middle<\/mark> of it.<\/p>$/
            },
            {
                input: '==[link](http://ghost.org)==',
                output: /^<p><mark><a href="http:\/\/ghost.org">link<\/a><\/mark><\/p>$/
            },
            {
                input: '[==link==](http://ghost.org)',
                output: /^<p><a href="http:\/\/ghost.org"><mark>link<\/mark><\/a><\/p>$/
            },
            {
                input: '====test==test==test====test',
                output: /^<p><mark>==test<\/mark>test<mark>test<\/mark>==test<\/p>$/
            }
        ];

        testPhrases.forEach(function (testPhrase) {
            var processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    it('should not effect pre tags', function () {
        var testPhrase = {
            input:  '```javascript\n' +
                    'var foo = "bar";\n' +
                    'if (foo === "bar") {\n' +
                    '    return true;\n' +
                    '} else if (foo === "baz") {\n' +
                    '    return "magic happened";\n' +
                    '}\n' +
                    '```',
            output: /^<mark><\/mark>$/
        },
            processedMarkup = converter.makeHtml(testPhrase.input);

        // this does not get mark tags
        processedMarkup.should.not.match(testPhrase.output);
    });

    it('should ignore multiple equals', function () {
        var testPhrase = {input: '=====', output: /^<p>=====<\/p>$/},
            processedMarkup = converter.makeHtml(testPhrase.input);

        processedMarkup.should.match(testPhrase.output);
    });

    it('should still handle headers correctly', function () {
        var testPhrases = [
            {
                input: 'Header\n==',
                output: /^<h1 id="header">Header  <\/h1>$/
            },
            {
                input: 'First Header\n==\nSecond Header\n==',
                output: /^<h1 id="firstheader">First Header  <\/h1>\n\n<h1 id="secondheader">Second Header  <\/h1>$/
            }
        ];

        testPhrases.forEach(function (testPhrase) {
            var processedMarkup = converter.makeHtml(testPhrase.input);
            processedMarkup.should.match(testPhrase.output);
        });
    });

    // Waiting for showdown typography to be updated
    // it('should correctly convert quotes to curly quotes', function () {
    //    var testPhrases = [
    //        {
    //            input: 'Hello world\nIt's a fine day\nout',
    //            output: /^<p>Hello world <br \/>\nIt’s a fine day <br \/>\nout<\/p>$/}
    //    ];

    //    testPhrases.forEach(function (testPhrase) {
    //        processedMarkup = converter.makeHtml(testPhrase.input);
    //        processedMarkup.should.match(testPhrase.output);
    //    });
    // });
});
