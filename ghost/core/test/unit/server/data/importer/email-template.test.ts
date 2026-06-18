import assert from 'node:assert/strict';
import {emailTemplate} from '../../../../../core/server/data/importer/email-template';

describe('Importer email template', function () {
    const siteUrl = new URL('http://example.com');
    const postsUrl = new URL('http://example.com/ghost/#/posts');
    const emailRecipient = 'recipient@example.com';

    it('renders the success email when there are no errors', function () {
        const html = emailTemplate({result: {data: {}}, siteUrl, postsUrl, emailRecipient});

        assert.match(html, /Your content import has finished successfully/);
        assert.doesNotMatch(html, /Import unsuccessful/);
    });

    it('lists every error message in the failure email', function () {
        const result = {
            data: {
                errors: [
                    new Error('Value in [posts.title] exceeds maximum length of 2000 characters.'),
                    new Error('Value in [users.bio] exceeds maximum length of 250 characters.')
                ]
            }
        };

        const html = emailTemplate({result, siteUrl, postsUrl, emailRecipient});

        assert.match(html, /Import unsuccessful/);
        assert.match(html, /Value in \[posts\.title\] exceeds maximum length of 2000 characters\./);
        assert.match(html, /Value in \[users\.bio\] exceeds maximum length of 250 characters\./);
        assert.doesNotMatch(html, /check the server logs/);
    });

    it('caps the listed errors at 5 and points to the server logs for the rest', function () {
        const result = {
            data: {
                errors: Array.from({length: 8}, (_, i) => new Error(`Import error number ${i + 1}`))
            }
        };

        const html = emailTemplate({result, siteUrl, postsUrl, emailRecipient});

        assert.match(html, /Import error number 1/);
        assert.match(html, /Import error number 5/);
        assert.doesNotMatch(html, /Import error number 6/);
        assert.match(html, /and 3 more &mdash; check the server logs for the full list/);
    });

    it('escapes HTML in error messages', function () {
        const result = {
            data: {
                errors: [new Error('Invalid value <script>alert("xss")</script> & more')]
            }
        };

        const html = emailTemplate({result, siteUrl, postsUrl, emailRecipient});

        assert.doesNotMatch(html, /<script>alert/);
        assert.match(html, /Invalid value &lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt; &amp; more/);
    });

    it('falls back to a generic label for errors without a message', function () {
        const result = {
            data: {
                errors: [{}]
            }
        };

        const html = emailTemplate({result, siteUrl, postsUrl, emailRecipient});

        assert.match(html, /Import unsuccessful/);
        assert.match(html, /Unknown error/);
    });
});
