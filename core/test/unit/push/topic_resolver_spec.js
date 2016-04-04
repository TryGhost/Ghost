/*globals describe, beforeEach, afterEach, it*/
var should            = require('should'),
    sinon             = require('sinon'),
    rewire            = require('rewire'),
    Promise           = require('bluebird'),

    resolveTopicsForPost = rewire('../../../server/push/topic-resolver');

describe.only('PuSH Topic Resolver', function () {
    var config, post, postAuthorModel, postAuthor, postTagsModel, postTags;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        config = {
            urlFor: sinon.sandbox.stub()
        };

        postAuthor = {
            slug: 'foo',
            get: sinon.sandbox.stub().returns('foo')
        };

        postAuthorModel = {
            fetch: sinon.sandbox.stub().returns(Promise.resolve(postAuthor))
        };

        postTags = [
            {
                slug: 'bar',
                get: sinon.sandbox.stub().returns('bar')
            }
        ];

        postTagsModel = {
            fetch: sinon.sandbox.stub().returns(Promise.resolve(postTags))
        };

        post = {
            author: sinon.sandbox.stub().returns(postAuthorModel),
            tags: sinon.sandbox.stub().returns(postTagsModel)
        };

        config.urlFor.withArgs('rss', true)
            .returns('http://www.example.com/rss/');

        config.urlFor.withArgs('author', { author: { slug: postAuthor.slug } }, true)
            .returns('http://www.example.com/author/foo/');

        config.urlFor.withArgs('tag', { tag: { slug: postTags[0].slug } }, true)
            .returns('http://www.example.com/tag/bar/');

        resolveTopicsForPost.__set__({
            config: config
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('resolves the topics from the post', function () {
        resolveTopicsForPost(post).then(function (resolvedTopicUrls) {
            resolvedTopicUrls.should.eql([
                'http://www.example.com/rss/',
                'http://www.example.com/author/foo/rss/',
                'http://www.example.com/tag/bar/rss/'
            ]);
        });
    });
});
