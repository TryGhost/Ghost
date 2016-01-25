/*globals describe, it*/
var getSchema = require('../../../server/data/meta/schema'),
    should = require('should');

describe('getSchema', function () {
    it('should return post schema if context starts with post', function () {
        var metadata = {
            blog: {
                title: 'Blog Title'
            },
            authorImage: 'http://mysite.com/author/image/url/me.jpg',
            authorUrl: 'http://mysite.com/author/me/',
            metaTitle: 'Post Title',
            url: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description'
        },  data = {
            context: ['post'],
            post: {
                author: {
                    name: 'Post Author',
                    website: 'http://myblogsite.com/',
                    bio: 'My author bio.'
                }
            }
        }, schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'http://schema.org',
            '@type': 'Article',
            author: {
                '@type': 'Person',
                description: 'My author bio.',
                image: 'http://mysite.com/author/image/url/me.jpg',
                name: 'Post Author',
                sameAs: 'http://myblogsite.com/',
                url: 'http://mysite.com/author/me/'
            },
            dateModified: '2016-01-21T22:13:05.412Z',
            datePublished: '2015-12-25T05:35:01.234Z',
            description: 'Post meta description',
            headline: 'Post Title',
            image: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            keywords: 'one, two, tag',
            publisher: 'Blog Title',
            url: 'http://mysite.com/post/my-post-slug/'
        });
    });

    it('should return post schema removing null or undefined values', function () {
        var metadata = {
            blog: {
                title: 'Blog Title'
            },
            authorImage: null,
            authorUrl: 'http://mysite.com/author/me/',
            metaTitle: 'Post Title',
            url: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: undefined,
            keywords: [],
            metaDescription: 'Post meta description'
        },  data = {
            context: ['post'],
            post: {
                author: {
                    name: 'Post Author',
                    website: undefined,
                    bio: null
                }
            }
        }, schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'http://schema.org',
            '@type': 'Article',
            author: {
                '@type': 'Person',
                name: 'Post Author',
                url: 'http://mysite.com/author/me/'
            },
            dateModified: '2016-01-21T22:13:05.412Z',
            datePublished: '2015-12-25T05:35:01.234Z',
            description: 'Post meta description',
            headline: 'Post Title',
            publisher: 'Blog Title',
            url: 'http://mysite.com/post/my-post-slug/'
        });
    });

    it('should return home schema if context starts with home', function () {
        var metadata = {
            blog: {
                title: 'Blog Title'
            },
            url: 'http://mysite.com/post/my-post-slug/',
            coverImage: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            metaDescription: 'This is the theme description'
        },  data = {
            context: ['home']
        }, schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'http://schema.org',
            '@type': 'Website',
            description: 'This is the theme description',
            image: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            publisher: 'Blog Title',
            url: 'http://mysite.com/post/my-post-slug/'
        });
    });

    it('should return tag schema if context starts with tag', function () {
        var metadata = {
            blog: {
                title: 'Blog Title'
            },
            url: 'http://mysite.com/post/my-post-slug/',
            coverImage: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            metaDescription: 'This is the tag description!'
        },  data = {
            context: ['tag'],
            tag: {
                name: 'Great Tag'
            }
        }, schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'http://schema.org',
            '@type': 'Series',
            description: 'This is the tag description!',
            image: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            name: 'Great Tag',
            publisher: 'Blog Title',
            url: 'http://mysite.com/post/my-post-slug/'
        });
    });

    it('should return author schema if context starts with author', function () {
        var metadata = {
            blog: {
                title: 'Blog Title'
            },
            authorImage: 'http://mysite.com/author/image/url/me.jpg',
            authorUrl: 'http://mysite.com/author/me/',
            metaDescription: 'This is the author description!'
        },  data = {
            context: ['author'],
            author: {
                name: 'Author Name',
                website: 'http://myblogsite.com/'
            }
        }, schema = getSchema(metadata, data);

        should.deepEqual(schema, {
            '@context': 'http://schema.org',
            '@type': 'Person',
            description: 'This is the author description!',
            name: 'Author Name',
            publisher: 'Blog Title',
            sameAs: 'http://myblogsite.com/',
            url: 'http://mysite.com/author/me/'
        });
    });

    it('should return null if not a supported type', function () {
        var metadata = {},
            data = {},
            schema = getSchema(metadata, data);

        should.deepEqual(schema, null);
    });
});
