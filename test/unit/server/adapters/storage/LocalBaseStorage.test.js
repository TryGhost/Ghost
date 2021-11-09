const should = require('should');
const LocalStorageBase = require('../../../../../core/server/adapters/storage/LocalStorageBase');

describe('Local Storage Base', function () {
    describe('urlToPath', function () {
        it('returns path from url', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            localStorageBase.urlToPath('http://example.com/blog/content/media/2021/11/media.mp4')
                .should.eql('/media-storage/path/2021/11/media.mp4');
        });

        it('throws if the url does not match current site', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                url: 'http://example.com/blog/'
            });

            try {
                localStorageBase.urlToPath('http://anothersite.com/blog/content/media/2021/11/media.mp4');
                should.fail('urlToPath when urls do not match');
            } catch (error) {
                error.message.should.eql('The URL "http://anothersite.com/blog/content/media/2021/11/media.mp4" is not a valid URL for this site.');
            }
        });
    });
});
