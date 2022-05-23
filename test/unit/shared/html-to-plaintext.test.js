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

            assert.equal(excerpt, 'Some thing Google once told me.\n\nAnd another thing.');
            assert.equal(email, 'Some thing Google [https://google.com] once told me.\n\nAnd another thing.');
        });

        it('example case with figure + figcaption', function () {
            const input = '<figcaption>A snippet from a post template</figcaption></figure><p>See? Not that scary! But still completely optional. </p>';

            const {excerpt, email} = getEmailandExcert(input);

            assert.equal(excerpt, 'See? Not that scary! But still completely optional.');
            assert.equal(email, 'A snippet from a post template\n\nSee? Not that scary! But still completely optional.');
        });

        it('example case with figure + figcaption inside a link', function () {
            const input = '<a href="https://mysite.com"><figcaption>A snippet from a post template</figcaption></figure></a><p>See? Not that scary! But still completely optional. </p>';

            const {excerpt, email} = getEmailandExcert(input);

            assert.equal(excerpt, 'See? Not that scary! But still completely optional.');
            assert.equal(email, 'A snippet from a post template [https://mysite.com]\n\nSee? Not that scary! But still completely optional.');
        });

        it('longer example', function () {
            const input = '<p>As discussed in the <a href="https://demo.ghost.io/welcome/">introduction</a> post, one of the best things about Ghost is just how much you can customize to turn your site into something unique. Everything about your layout and design can be changed, so you\'re not stuck with yet another clone of a social network profile.</p><p>How far you want to go with customization is completely up to you, there\'s no right or wrong approach! The majority of people use one of Ghost\'s built-in themes to get started, and then progress to something more bespoke later on as their site grows. </p><p>The best way to get started is with Ghost\'s branding settings, where you can set up colors, images and logos to fit with your brand.</p><figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption"><img src="https://static.ghost.org/v4.0.0/images/brandsettings.png" class="kg-image" alt loading="lazy" width="3456" height="2338"><figcaption>Ghost Admin → Settings → Branding</figcaption></figure><p>Any Ghost theme that\'s up to date and compatible with Ghost 4.0 and higher will reflect your branding settings in the preview window, so you can see what your site will look like as you experiment with different options.</p><p>When selecting an accent color, try to choose something which will contrast well with white text. Many themes will use your accent color as the background for buttons, headers and navigational elements. Vibrant colors with a darker hue tend to work best, as a general rule.</p><h2 id="installing-ghost-themes">Installing Ghost themes</h2><p>By default, new sites are created with Ghost\'s friendly publication theme, called Casper. Everything in Casper is optimized to work for the most common types of blog, newsletter and publication that people create with Ghost — so it\'s a perfect place to start.</p><p>However, there are hundreds of different themes available to install, so you can pick out a look and feel that suits you best.</p><figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption"><img src="https://static.ghost.org/v4.0.0/images/themesettings.png" class="kg-image" alt loading="lazy" width="3208" height="1618"><figcaption>Ghost Admin → Settings → Theme</figcaption></figure><p>Inside Ghost\'s theme settings you\'ll find 4 more official themes that can be directly installed and activated. Each theme is suited to slightly different use-cases.</p><ul><li><strong>Casper</strong> <em>(default)</em> — Made for all sorts of blogs and newsletters</li><li><strong>Edition</strong> — A beautiful minimal template for newsletter authors</li><li><strong>Alto</strong> — A slick news/magazine style design for creators</li><li><strong>London</strong> — A light photography theme with a bold grid</li><li><strong>Ease</strong> — A library theme for organizing large content archives</li></ul><p>And if none of those feel quite right, head on over to the <a href="https://ghost.org/themes/">Ghost Marketplace</a>, where you\'ll find a huge variety of both free and premium themes.</p><h2 id="building-something-custom">Building something custom</h2><p>Finally, if you want something completely bespoke for your site, you can always build a custom theme from scratch and upload it to your site.</p><p>Ghost\'s theming template files are very easy to work with, and can be picked up in the space of a few hours by anyone who has just a little bit of knowledge of HTML and CSS. Templates from other platforms can also be ported to Ghost with relatively little effort.</p><p>If you want to take a quick look at the theme syntax to see what it\'s like, you can <a href="https://github.com/tryghost/casper/">browse through the files of the default Casper theme</a>. We\'ve added tons of inline code comments to make it easy to learn, and the structure is very readable.</p><figure class="kg-card kg-code-card"><pre><code class="language-handlebars">{{#post}}\n&lt;article class="article {{post_class}}"&gt;\n\n &lt;h1&gt;{{title}}&lt;/h1&gt;\n \n {{#if feature_image}}\n \t&lt;img src="{{feature_image}}" alt="Feature image" /&gt;\n {{/if}}\n \n {{content}}\n\n&lt;/article&gt;\n{{/post}}</code></pre><figcaption>A snippet from a post template</figcaption></figure><p>See? Not that scary! But still completely optional. </p><p>If you\'re interested in creating your own Ghost theme, check out our extensive <a href="https://ghost.org/docs/themes/">theme documentation</a> for a full guide to all the different template variables and helpers which are available.</p>';

            const {excerpt, email} = getEmailandExcert(input);

            // No link
            assert.doesNotMatch(excerpt, /https:\/\/demo\.ghost\.io\/welcome/);
            // No figcaption
            assert.doesNotMatch(excerpt, /Ghost Admin → Settings → Theme/);

            // contains link
            assert.match(email, /https:\/\/demo\.ghost\.io\/welcome/);
            // contains figcaption
            assert.match(email, /Ghost Admin → Settings → Theme/);
        });
    });

    describe('footnotes', function () {
        it('strips multiple inline footnotes', function () {
            const html = '<p>Testing<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup>, my footnotes. And stuff. Footnote<sup id="fnref:2"><a href="#fn:2" rel="footnote">2</a></sup><a href="http://google.com">with a link</a> right after.';
            const expected = 'Testing, my footnotes. And stuff. Footnotewith a link right after.';
            const {excerpt} = getEmailandExcert(html);
            assert.equal(excerpt, expected);
        });

        it('strips inline and bottom footnotes', function () {
            const html = '<p>Testing<sup id="fnref:1"><a href="#fn:1" rel="footnote">1</a></sup> a very short post with a single footnote.</p>\n' +
                    '<div class="footnotes"><ol><li class="footnote" id="fn:1"><p><a href="https://ghost.org">https://ghost.org</a> <a href="#fnref:1" title="return to article">↩</a></p></li></ol></div>';
            const expected = 'Testing a very short post with a single footnote.\n';
            const {excerpt} = getEmailandExcert(html);
            assert.equal(excerpt, expected);
        });
    });

    describe('Special cases', function () {
        it('Instagram (blockquotes)', function () {
            // This is an instagram embed, but with all the style attributes & svg content removed for brevity
            const html = '<p>Some text in a paragraph.</p><!--kg-card-begin: html--><blockquote class=\"instagram-media\" data-instgrm-captioned data-instgrm-permalink=\"https://www.instagram.com/p/AbC123dEf/?utm_source=ig_embed&amp;utm_campaign=loading\" data-instgrm-version=\"14\"><div> <a href=\"https://www.instagram.com/p/AbC123dEf/?utm_source=ig_embed&amp;utm_campaign=loading\" target=\"_blank\"><div><div></div><div><div></div><div></div></div></div><div></div><div><svg width=\"50px\" height=\"50px\" viewBox=\"0 0 60 60\" version=\"1.1\" xmlns=\"https://www.w3.org/2000/svg\" xmlns:xlink=\"https://www.w3.org/1999/xlink\"><!-- svg stuff --></svg></div><div><div>View this post on Instagram</div></div><div></div><div><div><div></div><div></div><div></div></div><div><div></div><div><div></div><div></div><div></div></div></div><div><div></div><div></div></div></a><p><a href=\"https://www.instagram.com/p/AbC123dEf/?utm_source=ig_embed&amp;utm_campaign=loading\" target=\"_blank\">A post shared by Some Dude (@somedude)</a></p></div></blockquote><script async src=\"//www.instagram.com/embed.js\"></script><!--kg-card-end: html-->';
            const expected = 'Some text in a paragraph.\n\nView this post on Instagram\n\nA post shared by Some Dude (@somedude)';
            const {excerpt} = getEmailandExcert(html);
            assert.equal(excerpt, expected);
        });

        it('HRs', function () {
            const html = '<p>See you later alligator...</p><hr><p>...in a while crocodile</p>';
            const expected = 'See you later alligator...\n\n...in a while crocodile';
            const {excerpt} = getEmailandExcert(html);
            assert.equal(excerpt, expected);
        });
    });
});
