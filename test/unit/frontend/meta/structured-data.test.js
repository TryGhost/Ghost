const should = require('should');
const getStructuredData = require('../../../../core/frontend/meta/structured-data');

describe('getStructuredData', function () {
    it('should return structured data from metadata per post', function (done) {
        const metadata = {
            site: {
                title: 'Site Title',
                facebook: 'testuser',
                twitter: '@testuser'
            },
            authorName: 'Test User',
            ogType: 'article',
            metaTitle: 'Post Title',
            canonicalUrl: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: {
                url: 'http://mysite.com/content/image/mypostcoverimage.jpg',
                dimensions: {
                    width: 500,
                    height: 500
                }
            },
            ogImage: {
                url: null
            },
            twitterImage: null,
            ogTitle: 'Post Title',
            ogDescription: 'Post meta description',
            twitterTitle: 'Post Title',
            twitterDescription: 'Post meta description',
            authorFacebook: 'testpage',
            creatorTwitter: '@twitterpage',
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description'
        };

        const structuredData = getStructuredData(metadata);

        should.deepEqual(structuredData, {
            'article:modified_time': '2016-01-21T22:13:05.412Z',
            'article:published_time': '2015-12-25T05:35:01.234Z',
            'article:tag': ['one', 'two', 'tag'],
            'article:publisher': 'https://www.facebook.com/testuser',
            'article:author': 'https://www.facebook.com/testpage',
            'og:description': 'Post meta description',
            'og:image': 'http://mysite.com/content/image/mypostcoverimage.jpg',
            'og:image:width': 500,
            'og:image:height': 500,
            'og:site_name': 'Site Title',
            'og:title': 'Post Title',
            'og:type': 'article',
            'og:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:card': 'summary_large_image',
            'twitter:data1': 'Test User',
            'twitter:data2': ['one', 'two', 'tag'].join(', '),
            'twitter:description': 'Post meta description',
            'twitter:image': 'http://mysite.com/content/image/mypostcoverimage.jpg',
            'twitter:label1': 'Written by',
            'twitter:label2': 'Filed under',
            'twitter:title': 'Post Title',
            'twitter:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:site': '@testuser',
            'twitter:creator': '@twitterpage'
        });
        done();
    });

    it('should return structured data from metadata with provided og and twitter images only per post', function (done) {
        const metadata = {
            site: {
                title: 'Site Title',
                facebook: 'testuser',
                twitter: '@testuser'
            },
            authorName: 'Test User',
            ogType: 'article',
            metaTitle: 'Post Title',
            canonicalUrl: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            ogImage: {
                url: 'http://mysite.com/content/image/mypostogimage.jpg',
                dimensions: {
                    width: 20,
                    height: 100
                }
            },
            twitterImage: 'http://mysite.com/content/image/myposttwitterimage.jpg',
            ogTitle: 'Custom Facebook title',
            ogDescription: 'Custom Facebook description',
            twitterTitle: 'Custom Twitter title',
            twitterDescription: 'Custom Twitter description',
            authorFacebook: 'testpage',
            creatorTwitter: '@twitterpage',
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description'
        };

        const structuredData = getStructuredData(metadata);

        should.deepEqual(structuredData, {
            'article:modified_time': '2016-01-21T22:13:05.412Z',
            'article:published_time': '2015-12-25T05:35:01.234Z',
            'article:tag': ['one', 'two', 'tag'],
            'article:publisher': 'https://www.facebook.com/testuser',
            'article:author': 'https://www.facebook.com/testpage',
            'og:description': 'Custom Facebook description',
            'og:image': 'http://mysite.com/content/image/mypostogimage.jpg',
            'og:image:width': 20,
            'og:image:height': 100,
            'og:site_name': 'Site Title',
            'og:title': 'Custom Facebook title',
            'og:type': 'article',
            'og:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:card': 'summary_large_image',
            'twitter:data1': 'Test User',
            'twitter:data2': ['one', 'two', 'tag'].join(', '),
            'twitter:description': 'Custom Twitter description',
            'twitter:image': 'http://mysite.com/content/image/myposttwitterimage.jpg',
            'twitter:label1': 'Written by',
            'twitter:label2': 'Filed under',
            'twitter:title': 'Custom Twitter title',
            'twitter:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:site': '@testuser',
            'twitter:creator': '@twitterpage'
        });
        done();
    });

    it('should return structured data from metadata with no nulls', function (done) {
        const metadata = {
            site: {
                title: 'Site Title',
                facebook: '',
                twitter: ''
            },
            authorName: 'Test User',
            ogType: 'article',
            metaTitle: 'Post Title',
            canonicalUrl: 'http://mysite.com/post/my-post-slug/',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            authorFacebook: null,
            creatorTwitter: null,
            coverImage: {
                url: undefined
            },
            ogImage: {
                url: null
            },
            twitterImage: null,
            ogTitle: 'Post Title',
            ogDescription: null,
            twitterTitle: 'Post Title',
            twitterDescription: null,
            keywords: null,
            metaDescription: null
        };

        const structuredData = getStructuredData(metadata);

        should.deepEqual(structuredData, {
            'article:modified_time': '2016-01-21T22:13:05.412Z',
            'og:site_name': 'Site Title',
            'og:title': 'Post Title',
            'og:type': 'article',
            'og:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:card': 'summary',
            'twitter:data1': 'Test User',
            'twitter:label1': 'Written by',
            'twitter:title': 'Post Title',
            'twitter:url': 'http://mysite.com/post/my-post-slug/'
        });
        done();
    });
});
