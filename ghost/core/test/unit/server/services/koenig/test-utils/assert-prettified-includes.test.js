const assert = require('assert/strict');
const assertPrettifiedIncludes = require('./assert-prettified-includes');

describe('assertPrettifiedIncludes', function () {
    it('passes when HTML includes expected content', function () {
        const actual = '<div><p>Hello World</p></div>';
        const expected = '<p>Hello World</p>';

        // Should not throw
        assertPrettifiedIncludes(actual, expected);
    });

    it('passes with different whitespace', function () {
        const actual = '<div>  <p>  Hello   World  </p>  </div>';
        const expected = '<p>Hello World</p>';

        // Should not throw
        assertPrettifiedIncludes(actual, expected);
    });

    it('passes with nested content', function () {
        const actual = '<div><section><p>Hello <strong>World</strong></p></section></div>';
        const expected = '<p>Hello <strong>World</strong></p>';

        // Should not throw
        assertPrettifiedIncludes(actual, expected);
    });

    it('fails when HTML does not include expected content', function () {
        const actual = '<div><p>Hello World</p></div>';
        const expected = '<p>Goodbye World</p>';

        assert.throws(() => {
            assertPrettifiedIncludes(actual, expected);
        }, {
            message: /Expected HTML to include substring/
        });
    });

    it('fails with helpful error message', function () {
        const actual = '<div><p>Hello World</p></div>';
        const expected = '<p>Goodbye World</p>';

        try {
            assertPrettifiedIncludes(actual, expected);
        } catch (error) {
            assert.ok(error.message.includes('Received:'));
            assert.ok(error.message.includes('Expected:'));
            assert.ok(error.message.includes(actual));
            assert.ok(error.message.includes(expected));
        }
    });

    it('handles empty strings', function () {
        const actual = '';
        const expected = '';

        // Should not throw
        assertPrettifiedIncludes(actual, expected);
    });

    it('handles complex HTML structures', function () {
        const actual = `
            <div class="container">
                <header>
                    <h1>Title</h1>
                </header>
                <main>
                    <article>
                        <p>Content</p>
                    </article>
                </main>
            </div>
        `;
        const expected = `
            <main>
                <article>
                    <p>Content</p>
                </article>
            </main>
        `;

        // Should not throw
        assertPrettifiedIncludes(actual, expected);
    });

    it('handles complex nesting', function () {
        const actual = `
            <table class="kg-card kg-cta-card kg-cta-bg-none kg-cta-minimal kg-cta-has-img" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tbody>
                    <tr>
                        <td>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                    <tr>
                                        <td class="kg-cta-sponsor-label">
                                            <p><span style="white-space: pre-wrap">SPONSORED</span></p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="kg-cta-content">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="kg-cta-content-wrapper">
                                <tbody>
                                    <tr>
                                        <td class="kg-cta-image-container" width="64">
                                            <a href="http://blog.com/post1">
                                                <img src="http://blog.com/image1.jpg" alt="CTA Image" class="kg-cta-image" width="64" height="64"/>
                                            </a>
                                        </td>
                                        <td class="kg-cta-content-inner">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                    <tr>
                                                        <td class="kg-cta-text">This is a cool advertisement</td>
                                                    </tr>
                                                    <tr>
                                                        <td class="kg-cta-button-container">
                                                            <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0">
                                                                <tbody>
                                                                    <tr>
                                                                        <td align="center">
                                                                            <a href="http://blog.com/post1">
                                                                                click me
                                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;

        const expected = `
            <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0">
                <tbody>
                    <tr>
                        <td align="center">
                            <a href="http://blog.com/post1">
                                click me
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;

        // Should not throw
        assertPrettifiedIncludes(actual, expected);
    });
});
