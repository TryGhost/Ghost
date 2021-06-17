// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const sinon = require('sinon');

const configUrlHelpers = require('../');

let nconf;

const fakeConfig = {
    url: '',
    adminUrl: null
};

describe('Config URL Helpers', function () {
    before(function () {
        const configFaker = (arg) => {
            if (arg === 'url') {
                return fakeConfig.url;
            } else if (arg === 'admin:url') {
                return fakeConfig.adminUrl;
            }
        };

        nconf = {
            get: sinon.stub().callsFake(configFaker)
        };

        configUrlHelpers.bindAll(nconf);
    });

    describe('getSubdir', function () {
        it('url has no subdir', function () {
            fakeConfig.url = 'http://my-ghost-blog.com/';

            nconf.getSubdir().should.eql('');
        });

        it('url has subdir', function () {
            fakeConfig.url = 'http://my-ghost-blog.com/blog';
            nconf.getSubdir().should.eql('/blog');

            fakeConfig.url = 'http://my-ghost-blog.com/blog/';
            nconf.getSubdir().should.eql('/blog');

            fakeConfig.url = 'http://my-ghost-blog.com/my/blog';
            nconf.getSubdir().should.eql('/my/blog');

            fakeConfig.url = 'http://my-ghost-blog.com/my/blog/';
            nconf.getSubdir().should.eql('/my/blog');
        });

        it('should not return a slash for subdir', function () {
            fakeConfig.url = 'http://my-ghost-blog.com';
            nconf.getSubdir().should.eql('');

            fakeConfig.url = 'http://my-ghost-blog.com/';
            nconf.getSubdir().should.eql('');
        });
    });

    describe('getSiteUrl', function () {
        it('returns config url', function () {
            fakeConfig.url = 'http://example.com/';

            nconf.getSiteUrl().should.eql('http://example.com/');
        });

        it('adds trailing slash', function () {
            fakeConfig.url = 'http://example.com';

            nconf.getSiteUrl().should.eql('http://example.com/');
        });

        it('returns https if secure=true', function () {
            fakeConfig.url = 'http://example.com/';

            nconf.getSiteUrl(true).should.eql('https://example.com/');
        });
    });

    describe('getAdminUrl', function () {
        it('returns undefinied if no admin URL is set', function () {
            should.not.exist(nconf.getAdminUrl());
        });

        it('returns config url', function () {
            fakeConfig.adminUrl = 'http://admin.example.com/';

            nconf.getAdminUrl().should.eql('http://admin.example.com/');
        });

        it('adds trailing slash', function () {
            fakeConfig.adminUrl = 'http://admin.example.com';

            nconf.getAdminUrl().should.eql('http://admin.example.com/');
        });

        it('returns with subdirectory correctly if not provided', function () {
            fakeConfig.url = 'http://example.com/blog/';
            fakeConfig.adminUrl = 'http://admin.example.com';

            nconf.getAdminUrl().should.eql('http://admin.example.com/blog/');
        });

        it('returns with subdirectory correctly if provided with slash', function () {
            fakeConfig.url = 'http://example.com/blog/';
            fakeConfig.adminUrl = 'http://admin.example.com/blog/';

            nconf.getAdminUrl().should.eql('http://admin.example.com/blog/');
        });

        it('returns with subdirectory correctly if provided without slash', function () {
            fakeConfig.url = 'http://example.com/blog/';
            fakeConfig.adminUrl = 'http://admin.example.com/blog';

            nconf.getAdminUrl().should.eql('http://admin.example.com/blog/');
        });
    });
});
