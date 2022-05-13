const assert = require('assert');
const htmlToPlaintext = require('../../../core/shared/html-to-plaintext');

describe('Html to Plaintext', function () {
    function getEmailandExcert(input) {
        const excerpt = htmlToPlaintext.excerpt(input);
        const email = htmlToPlaintext.email(input);

        return {email, excerpt};
    }

    describe('excerpt vs email behaviour', function () {
        it('example case with img & link', function () {
            const input = '<p>Some thing <a href="https://google.com">Google</a> once told me.</p><img src="https://hotlink.com" alt="An important image"><p>And <strong>another</strong> thing.</p>';

            const {excerpt, email} = getEmailandExcert(input);

            assert.equal(excerpt, 'Some thing Google [https://google.com] once told me.\n\nAnd another thing.');
            assert.equal(email, 'Some thing Google [https://google.com] once told me.\n\nAnd another thing.');
        });

        it('example case with figure + figcaption', function () {
            const input = '<figcaption>A snippet from a post template</figcaption></figure><p>See? Not that scary! But still completely optional. </p>';

            const {excerpt, email} = getEmailandExcert(input);

            assert.equal(excerpt, 'A snippet from a post template\n\nSee? Not that scary! But still completely optional.');
            assert.equal(email, 'A snippet from a post template\n\nSee? Not that scary! But still completely optional.');
        });

        it('example case with figure + figcaption inside a link', function () {
            const input = '<a href="https://mysite.com"><figcaption>A snippet from a post template</figcaption></figure></a><p>See? Not that scary! But still completely optional. </p>';

            const {excerpt, email} = getEmailandExcert(input);

            assert.equal(excerpt, 'A snippet from a post template [https://mysite.com]\n\nSee? Not that scary! But still completely optional.');
            assert.equal(email, 'A snippet from a post template [https://mysite.com]\n\nSee? Not that scary! But still completely optional.');
        });
    });
});
