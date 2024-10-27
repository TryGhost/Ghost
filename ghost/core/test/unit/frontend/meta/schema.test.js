const should = require('should');
const getSchema = require('../../../../core/frontend/meta/schema');
const markdownToMobiledoc = require('../../../utils/fixtures/data-generator').markdownToMobiledoc;

describe('getSchema', function () {
    it('should return post schema if context starts with post', function (done) {
        const metadata = {
            site: {
                title: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    url: 'http://mysite.com/author/image/url/logo.jpg',
                    dimensions: {
                        width: 500,
                        height: 500
                    }
                }
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            authorFacebook: 'testuser',
            creatorTwitter: '@testuser',
            authorUrl: 'http://mysite.com/author/me/',
            metaTitle: 'Post Title',
            url: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description',
            excerpt: 'Custom excerpt for description'
        };

        const data = {
            context: ['post'],
            post: {
                primary_author: {
                    name: 'Post Author',
                    website: 'http://myblogsite.com/',
                    bio: 'My author bio.',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Article',
            author: {
                '@type': 'Person',
                image: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/me.jpg',
                    width: 500,
                    height: 500
                },
                name: 'Post Author',
                sameAs: [
                    'http://myblogsite.com/',
                    'https://www.facebook.com/testuser',
                    'https://twitter.com/testuser'
                ],
                url: 'http://mysite.com/author/me/'
            },
            dateModified: '2016-01-21T22:13:05.412Z',
            datePublished: '2015-12-25T05:35:01.234Z',
            description: 'Custom excerpt for description',
            headline: 'Post Title',
            image: {
                '@type': 'ImageObject',
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                width: 500,
                height: 500
            },
            keywords: 'one, two, tag',
            mainEntityOfPage: 'http://mysite.com/post/my-post-slug/',
            publisher: {
                '@type': 'Organization',
                name: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/logo.jpg',
                    width: 500,
                    height: 500
                }
            },
            url: 'http://mysite.com/post/my-post-slug/'
        });
        done();
    });

    it('should return page schema if context starts with page', function (done) {
        const metadata = {
            site: {
                title: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    url: 'http://mysite.com/author/image/url/logo.jpg',
                    dimensions: {
                        width: 500,
                        height: 500
                    }
                }
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            authorFacebook: 'testuser',
            creatorTwitter: '@testuser',
            authorUrl: 'http://mysite.com/author/me/',
            metaTitle: 'Page Title',
            url: 'http://mysite.com/post/my-page-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: {
                url: 'http://mysite.com/content/image/mypagecoverimage.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            keywords: ['one', 'two'],
            metaDescription: 'Post meta description',
            excerpt: 'Custom excerpt for description'
        };

        const data = {
            context: ['page'],
            page: {
                primary_author: {
                    name: 'Page Author',
                    website: 'http://myblogsite.com/',
                    bio: 'My author bio.',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Article',
            author: {
                '@type': 'Person',
                image: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/me.jpg',
                    width: 500,
                    height: 500
                },
                name: 'Page Author',
                sameAs: [
                    'http://myblogsite.com/',
                    'https://www.facebook.com/testuser',
                    'https://twitter.com/testuser'
                ],
                url: 'http://mysite.com/author/me/'
            },
            dateModified: '2016-01-21T22:13:05.412Z',
            datePublished: '2015-12-25T05:35:01.234Z',
            description: 'Custom excerpt for description',
            headline: 'Page Title',
            image: {
                '@type': 'ImageObject',
                url: 'http://mysite.com/content/image/mypagecoverimage.jpg',
                width: 500,
                height: 500
            },
            keywords: 'one, two',
            mainEntityOfPage: 'http://mysite.com/post/my-page-slug/',
            publisher: {
                '@type': 'Organization',
                name: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/logo.jpg',
                    width: 500,
                    height: 500
                }
            },
            url: 'http://mysite.com/post/my-page-slug/'
        });
        done();
    });

    it('should return post schema if context starts with amp', function (done) {
        const metadata = {
            site: {
                title: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    url: 'http://mysite.com/author/image/url/logo.jpg',
                    dimensions: {
                        width: 500,
                        height: 500
                    }
                }
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            authorFacebook: 'testuser',
            creatorTwitter: '@testuser',
            authorUrl: 'http://mysite.com/author/me/',
            metaTitle: 'Post Title',
            url: 'http://mysite.com/post/my-amp-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description',
            excerpt: 'Post meta description'
        };

        const data = {
            context: ['amp', 'post'],
            post: {
                title: 'Post Title',
                slug: 'my-amp-post-slug',
                mobiledoc: markdownToMobiledoc('some markdown'),
                html: 'some html',
                primary_author: {
                    name: 'Post Author',
                    website: 'http://myblogsite.com/',
                    bio: 'My author bio.',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Article',
            author: {
                '@type': 'Person',
                image: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/me.jpg',
                    width: 500,
                    height: 500
                },
                name: 'Post Author',
                sameAs: [
                    'http://myblogsite.com/',
                    'https://www.facebook.com/testuser',
                    'https://twitter.com/testuser'
                ],
                url: 'http://mysite.com/author/me/'
            },
            dateModified: '2016-01-21T22:13:05.412Z',
            datePublished: '2015-12-25T05:35:01.234Z',
            description: 'Post meta description',
            headline: 'Post Title',
            image: {
                '@type': 'ImageObject',
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                width: 500,
                height: 500
            },
            keywords: 'one, two, tag',
            mainEntityOfPage: 'http://mysite.com/post/my-amp-post-slug/',
            publisher: {
                '@type': 'Organization',
                name: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/logo.jpg',
                    width: 500,
                    height: 500
                }
            },
            url: 'http://mysite.com/post/my-amp-post-slug/'
        });
        done();
    });

    it('should return post schema removing null or undefined values', function (done) {
        const metadata = {
            site: {
                title: 'Site Title'
            },
            authorImage: null,
            authorFacebook: undefined,
            creatorTwitter: undefined,
            authorUrl: 'http://mysite.com/author/me/',
            metaTitle: 'Post Title',
            url: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: undefined,
            keywords: [],
            metaDescription: '',
            excerpt: 'Post meta description'
        };

        const data = {
            context: ['post'],
            post: {
                primary_author: {
                    name: 'Post Author',
                    website: undefined,
                    bio: null,
                    facebook: null,
                    twitter: null
                }
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Article',
            author: {
                '@type': 'Person',
                name: 'Post Author',
                sameAs: [],
                url: 'http://mysite.com/author/me/'
            },
            dateModified: '2016-01-21T22:13:05.412Z',
            datePublished: '2015-12-25T05:35:01.234Z',
            description: 'Post meta description',
            headline: 'Post Title',
            mainEntityOfPage: 'http://mysite.com/post/my-post-slug/',
            publisher: {
                '@type': 'Organization',
                name: 'Site Title',
                url: null,
                logo: null
            },
            url: 'http://mysite.com/post/my-post-slug/'
        });
        done();
    });

    it('should return image url instead of ImageObjects if no dimensions supplied', function (done) {
        const metadata = {
            site: {
                title: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    url: 'http://mysite.com/author/image/url/logo.jpg'
                }
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg'
            },
            authorFacebook: 'testuser',
            creatorTwitter: '@testuser',
            authorUrl: 'http://mysite.com/author/me/',
            metaTitle: 'Post Title',
            url: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description',
            excerpt: 'Post meta description'
        };

        const data = {
            context: ['post'],
            post: {
                primary_author: {
                    name: 'Post Author',
                    website: 'http://myblogsite.com/',
                    bio: 'My author bio.',
                    facebook: 'testuser',
                    twitter: '@testuser',
                    metaDescription: 'My author bio.'
                }
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Article',
            author: {
                '@type': 'Person',
                description: 'My author bio.',
                image: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/me.jpg'
                },
                name: 'Post Author',
                sameAs: [
                    'http://myblogsite.com/',
                    'https://www.facebook.com/testuser',
                    'https://twitter.com/testuser'
                ],
                url: 'http://mysite.com/author/me/'
            },
            dateModified: '2016-01-21T22:13:05.412Z',
            datePublished: '2015-12-25T05:35:01.234Z',
            description: 'Post meta description',
            headline: 'Post Title',
            image: {
                '@type': 'ImageObject',
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg'
            },
            keywords: 'one, two, tag',
            mainEntityOfPage: 'http://mysite.com/post/my-post-slug/',
            publisher: {
                '@type': 'Organization',
                name: 'Site Title',
                url: 'http://mysite.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'http://mysite.com/author/image/url/logo.jpg'
                }
            },
            url: 'http://mysite.com/post/my-post-slug/'
        });
        done();
    });

    it('should return home schema if context starts with home', function () {
        const metadata = {
            site: {
                title: 'Site Title'
            },
            url: 'http://mysite.com/post/my-post-slug/',
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            metaDescription: 'This is the theme description'
        };

        const data = {
            context: ['home']
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            description: 'This is the theme description',
            image: {
                '@type': 'ImageObject',
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                width: 500,
                height: 500
            },
            mainEntityOfPage: 'http://mysite.com/post/my-post-slug/',
            name: 'Site Title',
            publisher: {
                '@type': 'Organization',
                name: 'Site Title',
                url: null,
                logo: null
            },
            url: 'http://mysite.com/post/my-post-slug/'
        });
    });

    it('should return tag schema if context starts with tag', function () {
        const metadata = {
            site: {
                title: 'Site Title'
            },
            url: 'http://mysite.com/post/my-post-slug/',
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            metaDescription: 'This is the tag description!'
        };

        const data = {
            context: ['tag'],
            tag: {
                name: 'Great Tag'
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Series',
            description: 'This is the tag description!',
            image: {
                '@type': 'ImageObject',
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                width: 500,
                height: 500
            },
            mainEntityOfPage: 'http://mysite.com/post/my-post-slug/',
            name: 'Great Tag',
            publisher: {
                '@type': 'Organization',
                name: 'Site Title',
                url: null,
                logo: null
            },
            url: 'http://mysite.com/post/my-post-slug/'
        });
    });

    it('should return author schema if context starts with author', function () {
        const metadata = {
            site: {
                title: 'Site Title',
                url: 'http://mysite.com'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            authorUrl: 'http://mysite.com/author/me/',
            metaDescription: 'This is the author description!'
        };

        const data = {
            context: ['author'],
            author: {
                name: 'Author Name',
                website: 'http://myblogsite.com/?user=bambedibu&a=<script>alert("bambedibu")</script>',
                twitter: '@testuser'
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Person',
            description: 'This is the author description!',
            image: {
                '@type': 'ImageObject',
                height: 500,
                url: 'http://mysite.com/author/image/url/me.jpg',
                width: 500
            },
            mainEntityOfPage: 'http://mysite.com/author/me/',
            name: 'Author Name',
            sameAs: [
                'http://myblogsite.com/?user&#x3D;bambedibu&amp;a&#x3D;&lt;script&gt;alert(&quot;bambedibu&quot;)&lt;/script&gt;',
                'https://twitter.com/testuser'
            ],
            url: 'http://mysite.com/author/me/'
        });
    });

    it('should return author schema if context starts with author and prefer the author profile image if also a cover image is given', function () {
        const metadata = {
            site: {
                title: 'Site Title',
                url: 'http://mysite.com'
            },
            authorImage: {
                url: 'http://mysite.com/author/image/url/me.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            coverImage: {
                url: 'http://mysite.com/author/cover/url/me.jpg',
                dimensions: {
                    width: 1024,
                    height: 500
                }
            },
            authorUrl: 'http://mysite.com/author/me/',
            metaDescription: 'This is the author description!'
        };

        const data = {
            context: ['author'],
            author: {
                name: 'Author Name',
                website: 'http://myblogsite.com/?user=bambedibu&a=<script>alert("bambedibu")</script>',
                twitter: '@testuser'
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Person',
            description: 'This is the author description!',
            image: {
                '@type': 'ImageObject',
                height: 500,
                url: 'http://mysite.com/author/image/url/me.jpg',
                width: 500
            },
            mainEntityOfPage: 'http://mysite.com/author/me/',
            name: 'Author Name',
            sameAs: [
                'http://myblogsite.com/?user&#x3D;bambedibu&amp;a&#x3D;&lt;script&gt;alert(&quot;bambedibu&quot;)&lt;/script&gt;',
                'https://twitter.com/testuser'
            ],
            url: 'http://mysite.com/author/me/'
        });
    });

    it('should return author schema if context starts with author and fall back to the cover image if given', function () {
        const metadata = {
            site: {
                title: 'Site Title',
                url: 'http://mysite.com'
            },
            coverImage: {
                url: 'http://mysite.com/author/cover/url/me.jpg',
                dimensions: {
                    width: 1024,
                    height: 500
                }
            },
            authorUrl: 'http://mysite.com/author/me/',
            metaDescription: 'This is the author description!'
        };

        const data = {
            context: ['author'],
            author: {
                name: 'Author Name',
                website: 'http://myblogsite.com/?user=bambedibu&a=<script>alert("bambedibu")</script>',
                twitter: '@testuser'
            }
        };

        const schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'https://schema.org',
            '@type': 'Person',
            description: 'This is the author description!',
            image: {
                '@type': 'ImageObject',
                height: 500,
                url: 'http://mysite.com/author/cover/url/me.jpg',
                width: 1024
            },
            mainEntityOfPage: 'http://mysite.com/author/me/',
            name: 'Author Name',
            sameAs: [
                'http://myblogsite.com/?user&#x3D;bambedibu&amp;a&#x3D;&lt;script&gt;alert(&quot;bambedibu&quot;)&lt;/script&gt;',
                'https://twitter.com/testuser'
            ],
            url: 'http://mysite.com/author/me/'
        });
    });

    it('should return null if not a supported type', function () {
        const metadata = {};
        const data = {};
        const schema = getSchema(metadata, data);

        should.deepEqual(schema, null);
    });
});
