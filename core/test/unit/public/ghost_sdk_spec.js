const should = require('should');
const ghostSdk = require('../../../server/public/ghost-sdk');
const configUtils = require('../../utils/configUtils');
const urlService = require('../../../server/services/url');
const testUtils = require('../../utils');

describe('Ghost Ajax Helper', function () {
    beforeEach(function () {
        configUtils.set({
            url: 'http://testblog.com/'
        });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('sets url empty if it is not set on init', function () {
        ghostSdk.init({
            clientId: '',
            clientSecret: ''
        });

        ghostSdk.url.api().should.equal('');
    });

    ['deprecated', 'active'].forEach((apiVersion) => {
        describe(`for api version: ${apiVersion}`, function () {
            it('renders basic url correctly when no arguments are presented', function () {
                ghostSdk.init({
                    clientId: '',
                    clientSecret: '',
                    url: urlService.utils.urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                });

                ghostSdk.url.api().should.equal(`//testblog.com${testUtils.API.getApiPath({version: apiVersion})}`);
            });

            it('blog url is https', function () {
                configUtils.set({
                    url: 'https://testblog.com/'
                });

                ghostSdk.init({
                    clientId: '',
                    clientSecret: '',
                    url: urlService.utils.urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                });

                ghostSdk.url.api().should.equal(`https://testblog.com${testUtils.API.getApiPath({version: apiVersion})}`);
            });

            it('admin url is https', function () {
                configUtils.set({
                    url: 'http://testblog.com/',
                    admin: {
                        url: 'https://admin.testblog.com'
                    }
                });

                ghostSdk.init({
                    clientId: '',
                    clientSecret: '',
                    url: urlService.utils.urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                });

                ghostSdk.url.api().should.equal(`https://admin.testblog.com${testUtils.API.getApiPath({version: apiVersion})}`);
            });

            it('strips arguments of forward and trailing slashes correctly', function () {
                ghostSdk.init({
                    clientId: '',
                    clientSecret: '',
                    url: urlService.utils.urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                });

                ghostSdk.url.api('a/', '/b', '/c/').should.equal(`//testblog.com${testUtils.API.getApiPath({version: apiVersion})}a/b/c/`);
            });

            it('appends client_id & client_secret to query string automatically', function () {
                ghostSdk.init({
                    clientId: 'ghost-frontend',
                    clientSecret: 'notasecret',
                    url: urlService.utils.urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                });

                ghostSdk.url.api().should.equal(`//testblog.com${testUtils.API.getApiPath({version: apiVersion})}?client_id=ghost-frontend&client_secret=notasecret`);
            });

            it('generates query parameters correctly', function () {
                ghostSdk.init({
                    clientId: 'ghost-frontend',
                    clientSecret: 'notasecret',
                    url: urlService.utils.urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                });

                var rendered = ghostSdk.url.api({a: 'string', b: 5, c: 'en coded'});
                rendered.should.equal(`//testblog.com${testUtils.API.getApiPath({version: apiVersion, versionType: 'content'})}?a=string&b=5&c=en%20coded&client_id=ghost-frontend&client_secret=notasecret`);
            });

            it('generates complex query correctly', function () {
                ghostSdk.init({
                    clientId: 'ghost-frontend',
                    clientSecret: 'notasecret',
                    url: urlService.utils.urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                });

                var rendered = ghostSdk.url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

                rendered.should.equal(`//testblog.com${testUtils.API.getApiPath({version: apiVersion, versionType: 'content'})}posts/tags/count/?include=tags%2Ctests&page=2&client_id=ghost-frontend&client_secret=notasecret`);
            });

            it('works with an https config', function () {
                configUtils.set({
                    url: 'https://testblog.com/'
                });

                ghostSdk.init({
                    clientId: 'ghost-frontend',
                    clientSecret: 'notasecret',
                    url: urlService.utils.urlFor('api', {version: apiVersion, versionType: 'content'}, true)
                });

                var rendered = ghostSdk.url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

                rendered.should.equal(`https://testblog.com${testUtils.API.getApiPath({version: apiVersion, versionType: 'content'})}posts/tags/count/?include=tags%2Ctests&page=2&client_id=ghost-frontend&client_secret=notasecret`);
            });

            it('works with an https config and subdirectory', function () {
                configUtils.set({
                    url: 'https://testblog.com/blog/'
                });
                ghostSdk.init({
                    clientId: 'ghost-frontend',
                    clientSecret: 'notasecret',
                    url: urlService.utils.urlFor('api', {version: apiVersion, versionType: 'content'}, true)
                });

                var rendered = ghostSdk.url.api('posts/', '/tags/', '/count', {include: 'tags,tests', page: 2});

                rendered.should.equal(`https://testblog.com/blog${testUtils.API.getApiPath({version: apiVersion, versionType: 'content'})}posts/tags/count/?include=tags%2Ctests&page=2&client_id=ghost-frontend&client_secret=notasecret`);
            });
        });
    });

    it('handles null/undefined queryOptions correctly', function () {
        ghostSdk.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: 'test'
        });

        var test = {
                a: null
            },
            rendered = ghostSdk.url.api(test.a), // null value
            rendered2 = ghostSdk.url.api(test.b); // undefined value

        rendered.should.match(/test/);
        rendered.should.match(/client_id=ghost-frontend/);
        rendered.should.match(/client_secret=notasecret/);
        rendered2.should.match(/test/);
        rendered2.should.match(/client_id=ghost-frontend/);
        rendered2.should.match(/client_secret=notasecret/);
    });

    it('should be idempotent', function () {
        configUtils.set({
            url: 'https://testblog.com/blog/'
        });

        ghostSdk.init({
            clientId: 'ghost-frontend',
            clientSecret: 'notasecret',
            url: urlService.utils.urlFor('api', {cors: true, version: 'deprecated', versionType: 'content'}, true)
        });

        var rendered = ghostSdk.url.api('posts', {limit: 3}),
            rendered2 = ghostSdk.url.api('posts', {limit: 3});

        rendered.should.equal(rendered2);
    });
});
