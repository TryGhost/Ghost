const should = require('should'),

    // Stuff we are testing
    helpers = require('../../../core/frontend/helpers');

describe('{{excerpt}} Helper', function () {
    it('renders empty string when html, excerpt, and custom_excerpt are null', function () {
        const html = null;
        const rendered = helpers.excerpt.call({
            html: html,
            custom_excerpt: null,
            excerpt: null
        });

        should.exist(rendered);
        rendered.string.should.equal('');
    });

    it('can render custom_excerpt', function () {
        const html = 'Hello World',
            rendered = helpers.excerpt.call({
                html: html,
                custom_excerpt: ''
            });

        should.exist(rendered);
        rendered.string.should.equal(html);
    });

    it('can render excerpt when other fields are empty', function () {
        const html = '',
            rendered = helpers.excerpt.call({
                html: html,
                custom_excerpt: '',
                excerpt: 'Regular excerpt'
            });

        should.exist(rendered);
        rendered.string.should.equal('Regular excerpt');
    });

    it('does not output HTML', function () {
        const html = '<p>There are <br />10<br> types<br/> of people in <img src="a">the world:' +
                '<img src=b alt="c"> those who <img src="@" onclick="javascript:alert(\'hello\');">' +
                'understand trinary,</p> those who don\'t <div style="" class=~/\'-,._?!|#>and' +
                '< test > those<<< test >>> who mistake it &lt;for&gt; binary.',
            expected = 'There are 10  types of people in the world: those who understand trinary,  those who ' +
                'don\'t and those>> who mistake it &lt;for&gt; binary.',
            rendered = helpers.excerpt.call({
                html: html,
                custom_excerpt: ''
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('strips multiple inline footnotes', function () {
        const html = '<p>Testing<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup>, my footnotes. And stuff. Footnote<sup id="fnref:2"><a href="#fn:2" rel="footnote">2</a></sup><a href="http://google.com">with a link</a> right after.',
            expected = 'Testing, my footnotes. And stuff. Footnotewith a link right after.',
            rendered = helpers.excerpt.call({
                html: html,
                custom_excerpt: ''
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('strips inline and bottom footnotes', function () {
        const html = '<p>Testing<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup> a very short post with a single footnote.</p>\n' +
                '<div class="footnotes"><ol><li class="footnote" id="fn:1"><p><a href="https://ghost.org">https://ghost.org</a> <a href="#fnref:1" title="return to article">↩</a></p></li></ol></div>',
            expected = 'Testing a very short post with a single footnote.',
            rendered = helpers.excerpt.call({
                html: html,
                custom_excerpt: ''
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('can truncate html by word', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            expected = 'Hello World!',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: ''
                    },
                    {hash: {words: '2'}}
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('can truncate html with non-ascii characters by word', function () {
        const html = '<p>Едквюэ опортэат <strong>праэчынт ючю но, квуй эю</strong></p>',
            expected = 'Едквюэ опортэат',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: ''
                    },
                    {hash: {words: '2'}}
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('can truncate html by character', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            expected = 'Hello Wo',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: ''
                    },
                    {hash: {characters: '8'}}
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('uses custom_excerpt if provided instead of truncating html', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            customExcerpt = 'My Custom Excerpt wins!',
            expected = 'My Custom Excerpt wins!',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: customExcerpt
                    }
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('does not truncate custom_excerpt if characters options is provided', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            customExcerpt = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                       'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                       'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
                       'after 300 characters. This give',
            expected = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                       'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                       'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
                       'after 300 characters. This give',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: customExcerpt
                    },
                    {hash: {characters: '8'}}
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('does not truncate custom_excerpt if words options is provided', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            customExcerpt = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                       'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                       'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
                       'after 300 characters. This give',
            expected = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                       'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                       'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
                       'after 300 characters. This give',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: customExcerpt
                    },
                    {hash: {words: '10'}}
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('puts additional space after closing paragraph', function () {
        const html = '<p>Testing.</p><p>Space before this text.</p><p>And this as well!</p>',
            expected = 'Testing. Space before this text. And this as well!',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: ''
                    }
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('puts additional space instead of <br> tag', function () {
        const html = '<p>Testing.<br>Space before this text.<br>And this as well!</p>',
            expected = 'Testing. Space before this text. And this as well!',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: ''
                    }
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('puts additional space between paragraph in markup generated by Ghost', function () {
        const html = '<p>put space in excerpt.</p><p></p><p>before this paragraph.</p>' +
                '<figure class="kg-card kg-image-card"><img src="/content/images/2019/08/photo.jpg" class="kg-image"></figure>' +
                '<p>and skip the image.</p><p></p>',
            expected = 'put space in excerpt.  before this paragraph. and skip the image.',
            rendered = (
                helpers.excerpt.call(
                    {
                        html: html,
                        custom_excerpt: ''
                    }
                )
            );

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
