const should = require('should');

// Stuff we are testing
const excerptHelper = require('../../../../core/frontend/helpers/excerpt');

describe('{{excerpt}} Helper', function () {
    function shouldCompileToExpected(data, hash, expected) {
        const rendered = excerptHelper.call(data, hash);
        should.exist(rendered);
        rendered.string.should.equal(expected);
    }

    it('renders empty string when html, excerpt, and custom_excerpt are null', function () {
        const expected = '';

        shouldCompileToExpected(
            {
                html: null,
                custom_excerpt: null,
                excerpt: null
            },
            {},
            expected);
    });

    it('can render custom_excerpt', function () {
        const custom_excerpt = 'Hello World';

        shouldCompileToExpected(
            {
                html: '',
                custom_excerpt
            },
            {},
            custom_excerpt);
    });

    it('can render excerpt when other fields are empty', function () {
        shouldCompileToExpected(
            {
                html: '',
                custom_excerpt: '',
                excerpt: 'Regular excerpt'
            },
            {},
            'Regular excerpt');
    });

    it('can truncate excerpt by word', function () {
        const excerpt = 'Hello World! It\'s me!';
        const expected = 'Hello World!';

        shouldCompileToExpected(
            {
                excerpt,
                custom_excerpt: ''
            },
            {hash: {words: '2'}},
            expected);
    });

    it('can truncate excerpt with non-ascii characters by word', function () {
        const excerpt = 'Едквюэ опортэат праэчынт ючю но, квуй эю';
        const expected = 'Едквюэ опортэат';
        shouldCompileToExpected(
            {
                excerpt,
                custom_excerpt: ''
            },
            {hash: {words: '2'}},
            expected
        );
    });

    it('can truncate html by character', function () {
        const excerpt = 'Hello World! It\'s me!';
        const expected = 'Hello Wo';

        shouldCompileToExpected(
            {
                excerpt,
                custom_excerpt: ''
            },
            {hash: {characters: '8'}},
            expected

        );
    });

    it('uses custom_excerpt if provided instead of truncating html', function () {
        const excerpt = 'Hello World! It\'s me!';
        const customExcerpt = 'My Custom Excerpt wins!';
        const expected = 'My Custom Excerpt wins!';

        shouldCompileToExpected(
            {
                excerpt,
                custom_excerpt: customExcerpt
            },
            {},
            expected
        );
    });

    it('does not truncate custom_excerpt if characters options is provided', function () {
        const excerpt = 'Hello World! It\'s me!';
        const customExcerpt = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                   'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                   'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
                   'after 300 characters. This give';
        const expected = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                   'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                   'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
            'after 300 characters. This give';

        shouldCompileToExpected(
            {
                excerpt,
                custom_excerpt: customExcerpt
            },
            {hash: {characters: '8'}},
            expected
        );
    });

    it('does not truncate custom_excerpt if words options is provided', function () {
        const excerpt = 'Hello World! It\'s me!';
        const customExcerpt = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                   'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                   'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
                   'after 300 characters. This give';
        const expected = 'This is a custom excerpt. It should always be rendered in full length and not being cut ' +
                   'off. The maximum length of a custom excerpt is 300 characters. Enough to tell a bit about ' +
                   'your story and make a nice summary for your readers. It\s only allowed to truncate anything ' +
            'after 300 characters. This give';

        shouldCompileToExpected(
            {
                excerpt,
                custom_excerpt: customExcerpt
            },
            {hash: {words: '10'}},
            expected
        );
    });
});
