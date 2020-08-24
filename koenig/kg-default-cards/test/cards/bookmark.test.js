// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/bookmark');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Bookmark card', function () {
    it('renders', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: 'http://example.com/icon.png',
                    thumbnail: 'http://exampple.com/thumbnail.png',
                    author: 'Author',
                    publisher: 'Publisher'
                },
                caption: 'Caption'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal(`<figure class="kg-card kg-bookmark-card kg-card-hascaption"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="http://example.com/icon.png"><span class="kg-bookmark-author">Author</span><span class="kg-bookmark-publisher">Publisher</span></div></div><div class="kg-bookmark-thumbnail"><img src="http://exampple.com/thumbnail.png"></div></a><figcaption>Caption</figcaption></figure>`);
    });

    it('renders email target', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: 'http://example.com/icon.png',
                    thumbnail: 'http://exampple.com/thumbnail.png',
                    author: 'Author',
                    publisher: 'Publisher'
                },
                caption: 'Caption'
            },
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal(`<!--[if !mso !vml]--><figure class="kg-card kg-bookmark-card kg-card-hascaption"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="http://example.com/icon.png"><span class="kg-bookmark-author">Author</span><span class="kg-bookmark-publisher">Publisher</span></div></div><div class="kg-bookmark-thumbnail"><img src="http://exampple.com/thumbnail.png"></div></a><figcaption>Caption</figcaption></figure><!--[endif]--><!--[if vml]><table class="kg-card kg-bookmark-card--outlook" style="margin: 0; padding: 0; width: 100%; border: 1px solid #e5eff5; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; border-collapse: collapse; border-spacing: 0;" width="100%"><tr><td width="100%" style="padding: 20px;"><table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;"><tr><td class="kg-bookmark-title--outlook"><a href="http://example.com" style="text-decoration: none; color: #15212A; font-size: 15px; line-height: 1.5em; font-weight: 600;">Title</a></td></tr><tr><td><div class="kg-bookmark-description--outlook"><a href="http://example.com" style="text-decoration: none; margin-top: 12px; color: #738a94; font-size: 13px; line-height: 1.5em; font-weight: 400;">Description</a></div></td></tr><tr><td class="kg-bookmark-metadata--outlook" style="padding-top: 14px; color: #15212A; font-size: 13px; font-weight: 400; line-height: 1.5em;"><table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;"><tr><td valign="middle" class="kg-bookmark-icon--outlook" style="padding-right: 8px; font-size: 0; line-height: 1.5em;"><a href="http://example.com" style="text-decoration: none; color: #15212A;"><img src="http://example.com/icon.png" width="22" height="22"></a></td><td valign="middle" class="kg-bookmark-byline--outlook"><a href="http://example.com" style="text-decoration: none; color: #15212A;">Author&nbsp;&#x2022;&nbsp;Publisher</a></td></tr></table></td></tr></table></td></tr></table><div class="kg-bookmark-spacer--outlook" style="height: 1.5em;">&nbsp;</div><![endif]-->`);
    });

    it('renders nothing when payload is empty', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {}
        };
        serializer.serialize(card.render(opts)).should.match('');
    });

    it('uses payload.url as href rather than payload.metadata.url', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com?utm=12345',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: 'http://example.com/icon.png',
                    thumbnail: 'http://exampple.com/thumbnail.png',
                    author: 'Author',
                    publisher: 'Publisher'
                },
                caption: 'Caption'
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<figure class="kg-card kg-bookmark-card kg-card-hascaption"><a class="kg-bookmark-container" href="http://example.com?utm&#x3D;12345"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="http://example.com/icon.png"><span class="kg-bookmark-author">Author</span><span class="kg-bookmark-publisher">Publisher</span></div></div><div class="kg-bookmark-thumbnail"><img src="http://exampple.com/thumbnail.png"></div></a><figcaption>Caption</figcaption></figure>');
    });

    it('keeps description element when description is blank', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Test bookmark',
                    description: null
                }
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Test bookmark</div><div class="kg-bookmark-description"></div><div class="kg-bookmark-metadata"></div></div></a></figure>');
    });

    it('skips icon when missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: null,
                    thumbnail: 'http://exampple.com/thumbnail.png',
                    author: 'Author',
                    publisher: 'Publisher'
                },
                caption: 'Caption'
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<figure class="kg-card kg-bookmark-card kg-card-hascaption"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><span class="kg-bookmark-author">Author</span><span class="kg-bookmark-publisher">Publisher</span></div></div><div class="kg-bookmark-thumbnail"><img src="http://exampple.com/thumbnail.png"></div></a><figcaption>Caption</figcaption></figure>');
    });

    it('skips thumbnail when missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: 'http://example.com/icon.png',
                    thumbnail: null,
                    author: 'Author',
                    publisher: 'Publisher'
                },
                caption: 'Caption'
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<figure class="kg-card kg-bookmark-card kg-card-hascaption"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="http://example.com/icon.png"><span class="kg-bookmark-author">Author</span><span class="kg-bookmark-publisher">Publisher</span></div></div></a><figcaption>Caption</figcaption></figure>');
    });

    it('skips author when missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: 'http://example.com/icon.png',
                    thumbnail: 'http://exampple.com/thumbnail.png',
                    author: null,
                    publisher: 'Publisher'
                },
                caption: 'Caption'
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<figure class="kg-card kg-bookmark-card kg-card-hascaption"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="http://example.com/icon.png"><span class="kg-bookmark-publisher">Publisher</span></div></div><div class="kg-bookmark-thumbnail"><img src="http://exampple.com/thumbnail.png"></div></a><figcaption>Caption</figcaption></figure>');
    });

    it('skips publisher when missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: 'http://example.com/icon.png',
                    thumbnail: 'http://exampple.com/thumbnail.png',
                    author: 'Author',
                    publisher: null
                },
                caption: 'Caption'
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<figure class="kg-card kg-bookmark-card kg-card-hascaption"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="http://example.com/icon.png"><span class="kg-bookmark-author">Author</span></div></div><div class="kg-bookmark-thumbnail"><img src="http://exampple.com/thumbnail.png"></div></a><figcaption>Caption</figcaption></figure>');
    });

    it('skips caption when missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: 'Title',
                    description: 'Description',
                    icon: 'http://example.com/icon.png',
                    thumbnail: 'http://exampple.com/thumbnail.png',
                    author: 'Author',
                    publisher: 'Publisher'
                },
                caption: ''
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="http://example.com"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Title</div><div class="kg-bookmark-description">Description</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="http://example.com/icon.png"><span class="kg-bookmark-author">Author</span><span class="kg-bookmark-publisher">Publisher</span></div></div><div class="kg-bookmark-thumbnail"><img src="http://exampple.com/thumbnail.png"></div></a></figure>');
    });

    it('renders nothing when payload is undefined', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                metadata: undefined
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('');
    });

    it('renders nothing when payload metadata is empty', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                metadata: {}
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('');
    });

    it('renders nothing when url is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: null,
                metadata: {
                    url: null,
                    title: 'Test bookmark',
                    description: 'This is just a test'
                }
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('');
    });

    it('renders nothing when title is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                url: 'http://example.com',
                metadata: {
                    url: 'http://example.com',
                    title: null,
                    description: 'This is just a test'
                }
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('');
    });

    it('transforms urls absolute to relative', function () {
        let payload = {
            url: 'http://127.0.0.1:2369/post',
            metadata: {
                url: 'http://127.0.0.1:2369/post'
            },
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.url
            .should.equal('/post');

        transformed.metadata.url
            .should.equal('/post');

        transformed.caption
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        let payload = {
            url: '/post',
            metadata: {
                url: '/post'
            },
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        transformed.url
            .should.equal('http://127.0.0.1:2369/post');

        transformed.metadata.url
            .should.equal('http://127.0.0.1:2369/post');

        transformed.caption
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });

    it('absoluteToRelative handles missing payload', function () {
        const payload = {};
        const transformed = card.absoluteToRelative(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        should.not.exist(transformed.url);
        should.not.exist(transformed.metadata);
    });

    it('relativeToAbsolute handles missing payload', function () {
        const payload = {};
        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        should.not.exist(transformed.url);
        should.not.exist(transformed.metadata);
    });
});
