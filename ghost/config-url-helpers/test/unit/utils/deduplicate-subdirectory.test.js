// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../../utils');

const deduplicateSubdirectory = require('../../../lib/utils/deduplicate-subdirectory');

describe('utils: deduplicateSubdirectory()', function () {
    describe('with url', function () {
        it('ignores rootUrl with no subdirectory', function () {
            let url = 'http://example.com/my/my/path.png';

            deduplicateSubdirectory(url, 'https://example.com')
                .should.eql('http://example.com/my/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(url, 'https://example.com/')
                .should.eql('http://example.com/my/my/path.png', 'with root trailing-slash');
        });

        it('deduplicates single directory', function () {
            let url = 'http://example.com/subdir/subdir/my/path.png';

            deduplicateSubdirectory(url, 'http://example.com/subdir')
                .should.eql('http://example.com/subdir/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(url, 'http://example.com/subdir/')
                .should.eql('http://example.com/subdir/my/path.png', 'with root trailing-slash');
        });

        it('deduplicates multiple directories', function () {
            let url = 'http://example.com/my/subdir/my/subdir/my/path.png';

            deduplicateSubdirectory(url, 'http://example.com/my/subdir')
                .should.eql('http://example.com/my/subdir/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(url, 'http://example.com/my/subdir/')
                .should.eql('http://example.com/my/subdir/my/path.png', 'with root trailing-slash');
        });

        it('handles file that matches subdirectory', function () {
            let url = 'http://example.com/my/path/my/path.png';

            deduplicateSubdirectory(url, 'http://example.com/my/path')
                .should.eql('http://example.com/my/path/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(url, 'http://example.com/my/path/')
                .should.eql('http://example.com/my/path/my/path.png', 'with root trailing-slash');
        });

        it('handles subdirectory that matches tld', function () {
            let url = 'http://example.blog/blog/file.png';

            deduplicateSubdirectory(url, 'http://example.blog/blog/subdir')
                .should.eql('http://example.blog/blog/file.png', 'without root trailing-slash');

            deduplicateSubdirectory(url, 'http://example.blog/blog/subdir/')
                .should.eql('http://example.blog/blog/file.png', 'with root trailing-slash');
        });

        it('keeps query and hash params', function () {
            let url = 'http://example.blog/blog/blog/file.png?test=true#testing';

            deduplicateSubdirectory(url, 'http://example.blog/blog/subdir')
                .should.eql('http://example.blog/blog/blog/file.png?test=true#testing', 'without root trailing-slash');

            deduplicateSubdirectory(url, 'http://example.blog/blog/subdir/')
                .should.eql('http://example.blog/blog/blog/file.png?test=true#testing', 'with root trailing-slash');
        });
    });

    describe('with path', function () {
        it('ignores rootUrl with no subdirectory', function () {
            let path = '/my/my/path.png';

            deduplicateSubdirectory(path, 'https://example.com')
                .should.eql('/my/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(path, 'https://example.com/')
                .should.eql('/my/my/path.png', 'with root trailing-slash');
        });

        it('deduplicates single directory', function () {
            let path = '/subdir/subdir/my/path.png';

            deduplicateSubdirectory(path, 'https://example.com/subdir')
                .should.eql('/subdir/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(path, 'https://example.com/subdir/')
                .should.eql('/subdir/my/path.png', 'with root trailing-slash');
        });

        it('deduplicates multiple directories', function () {
            let path = '/my/subdir/my/subdir/my/path.png';

            deduplicateSubdirectory(path, 'http://example.com/my/subdir')
                .should.eql('/my/subdir/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(path, 'http://example.com/my/subdir/')
                .should.eql('/my/subdir/my/path.png', 'with root trailing-slash');
        });

        it('handles file that matches subdirectory', function () {
            let path = '/my/path/my/path.png';

            deduplicateSubdirectory(path, 'http://example.com/my/path')
                .should.eql('/my/path/my/path.png', 'without root trailing-slash');

            deduplicateSubdirectory(path, 'http://example.com/my/path/')
                .should.eql('/my/path/my/path.png', 'with root trailing-slash');
        });

        it('handles subdirectory that matches tld', function () {
            let path = '/blog/file.png';

            deduplicateSubdirectory(path, 'http://example.blog/blog/subdir')
                .should.eql('/blog/file.png', 'without root trailing-slash');

            deduplicateSubdirectory(path, 'http://example.blog/blog/subdir/')
                .should.eql('/blog/file.png', 'with root trailing-slash');
        });

        it('keeps query and hash params', function () {
            let path = '/blog/blog/file.png?test=true#testing';

            deduplicateSubdirectory(path, 'http://example.blog/blog/subdir')
                .should.eql('/blog/blog/file.png?test=true#testing', 'without root trailing-slash');

            deduplicateSubdirectory(path, 'http://example.blog/blog/subdir/')
                .should.eql('/blog/blog/file.png?test=true#testing', 'with root trailing-slash');
        });

        it('deduplicates path with no trailing slash that matches subdir', function () {
            deduplicateSubdirectory('/blog/blog', 'http://example.com/blog')
                .should.equal('/blog/', 'without root trailing-slash');

            deduplicateSubdirectory('/blog/blog', 'http://example.com/blog/')
                .should.equal('/blog/', 'with root trailing-slash');
        });
    });
});
