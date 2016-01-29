/*globals describe, it*/
var getStructuredData = require('../../../server/data/meta/structured_data'),
    should = require('should');

describe('getStructuredData', function () {
    it('should return structored data from metadata', function () {
        var metadata = {
            blog: {
                title: 'Blog Title'
            },
            ogType: 'article',
            metaTitle: 'Post Title',
            canonicalUrl: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description'
        },  structuredData = getStructuredData(metadata);

        should.deepEqual(structuredData, {
            'article:modified_time': '2016-01-21T22:13:05.412Z',
            'article:published_time': '2015-12-25T05:35:01.234Z',
            'article:tag': ['one', 'two', 'tag'],
            'og:description': 'Post meta description',
            'og:image': 'http://mysite.com/content/image/mypostcoverimage.jpg',
            'og:site_name': 'Blog Title',
            'og:title': 'Post Title',
            'og:type': 'article',
            'og:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:card': 'summary_large_image',
            'twitter:description': 'Post meta description',
            'twitter:image:src': 'http://mysite.com/content/image/mypostcoverimage.jpg',
            'twitter:title': 'Post Title',
            'twitter:url': 'http://mysite.com/post/my-post-slug/'
        });
    });

    it('should return structored data from metadata with no nulls', function () {
        var metadata = {
            blog: {
                title: 'Blog Title'
            },
            ogType: 'article',
            metaTitle: 'Post Title',
            canonicalUrl: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: undefined,
            keywords: null,
            metaDescription: null
        },  structuredData = getStructuredData(metadata);

        should.deepEqual(structuredData, {
            'article:modified_time': '2016-01-21T22:13:05.412Z',
            'article:published_time': '2015-12-25T05:35:01.234Z',
            'og:site_name': 'Blog Title',
            'og:title': 'Post Title',
            'og:type': 'article',
            'og:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:card': 'summary',
            'twitter:title': 'Post Title',
            'twitter:url': 'http://mysite.com/post/my-post-slug/'
        });
    });
});
