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

    it('includes the error message in the failure email', function () {
        const result = {
            data: {
                errors: [new Error('Value in [posts.title] exceeds maximum length of 2000 characters.')]
            }
        };

        const html = emailTemplate({result, siteUrl, postsUrl, emailRecipient});

        assert.match(html, /Import unsuccessful/);
        assert.match(html, /Error: Value in \[posts\.title\] exceeds maximum length of 2000 characters\./);
    });

    it('escapes HTML in the error message', function () {
        const result = {
            data: {
                errors: [new Error('Invalid value <script>alert("xss")</script> & more')]
            }
        };

        const html = emailTemplate({result, siteUrl, postsUrl, emailRecipient});

        assert.doesNotMatch(html, /<script>alert/);
        assert.match(html, /Error: Invalid value &lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt; &amp; more/);
    });

    it('renders the generic failure email when the error has no message', function () {
        const result = {
            data: {
                errors: [{}]
            }
        };

        const html = emailTemplate({result, siteUrl, postsUrl, emailRecipient});

        assert.match(html, /Import unsuccessful/);
        assert.doesNotMatch(html, /Error: /);
    });
});
