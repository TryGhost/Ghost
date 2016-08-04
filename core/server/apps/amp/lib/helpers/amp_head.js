// # Amp Head Helper
// Usage: `{{amp_head}}`
//
// Returns metadata for AMP posts

var hbs             = require('express-hbs'),
    ampHead;

ampHead = function () {
    // var root = options.data.root;
    // console.log('root:', root);
    // <link rel="canonical" href="{{url}}">
    // <meta name="referrer" content="origin-when-cross-origin">
    // <meta name="generator" content="Ghost 0.9">
    // <link rel="alternate" type="application/rss+xml" title="{{@blog.title}}" href="http://localhost:2368/rss/">
    // <script type="application/ld+json">
    //     {
    //         "@context": "https://schema.org",
    //         "@type": "Article",
    //         "publisher": {
    //             "@type": "Organization",
    //             "name": "Ghost Blog",
    //             "logo": "http://localhost:2368/content/images/2016/07/blog_logo.png"
    //         },
    //         "author": {
    //             "@type": "Person",
    //             "name": "Aileen",
    //             "image": {
    //                 "@type": "ImageObject",
    //                 "url": "//www.gravatar.com/avatar/85a47a60d579572601ff74b72fe8b32d?s=250&d=mm&r=x",
    //                 "width": 250,
    //                 "heigth": 250
    //             },
    //             "url": "http://localhost:2368/author/aileen/",
    //             "sameAs": [
    //                 "https://come-on-aileen.ghost.io/",
    //                 "https://www.facebook.com/aileencgn",
    //                 "https://twitter.com/aileencgn"
    //             ]
    //         },
    //         "headline": "Welcome to Ghost",
    //         "url": "http://localhost:2368/welcome-to-ghost/",
    //         "datePublished": "2016-06-10T13:26:45.000Z",
    //         "dateModified": "2016-07-14T08:27:17.000Z",
    //         "image": "http://localhost:2368/content/images/2016/07/A_small_cup_of_coffee.JPG",
    //         "keywords": "Getting Started, Welcome, Awesome",
    //         "description": "You&#x27;re live! Nice. We&#x27;ve put together a little post to introduce you to the Ghost editor and get you started. You can manage your content by signing in to the admin area at &amp;lt;your blog URL&amp;gt;/ghost/. When you arrive, you can select this post from a list"
    //     }
    // </script>

    return new hbs.handlebars.SafeString(this.html);
};

module.exports = ampHead;
