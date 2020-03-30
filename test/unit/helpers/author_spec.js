const should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    urlService = require('../../../core/frontend/services/url'),
    helpers = require('../../../core/frontend/helpers');

describe('{{author}} helper', function () {
    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Returns the link to the author from the context', function () {
        const author = testUtils.DataGenerator.forKnex.createUser({slug: 'abc123', name: 'abc 123'});

        urlService.getUrlByResourceId.withArgs(author.id).returns('author url');

        const result = helpers.author.call({author: author}, {hash: {}});
        String(result).should.equal('<a href="author url">abc 123</a>');
    });

    it('Returns the full name of the author from the context if no autolink', function () {
        const author = testUtils.DataGenerator.forKnex.createUser({slug: 'abc123', name: 'abc 123'});
        const result = helpers.author.call({author: author}, {hash: {autolink: 'false'}});
        String(result).should.equal('abc 123');
        urlService.getUrlByResourceId.called.should.be.false();
    });

    it('Returns a blank string where author data is missing', function () {
        const result = helpers.author.call({author: null}, {hash: {}});
        String(result).should.equal('');
    });

    it('Functions as block helper if called with #', function () {
        const author = testUtils.DataGenerator.forKnex.createUser({slug: 'abc123', name: 'abc 123'});

        // including fn emulates the #
        const result = helpers.author.call({author: author}, {
            hash: {}, fn: function () {
                return 'FN';
            }
        });

        // It outputs the result of fn
        String(result).should.equal('FN');
        urlService.getUrlByResourceId.called.should.be.false();
    });
});
