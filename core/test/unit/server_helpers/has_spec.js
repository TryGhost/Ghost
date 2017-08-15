var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),

// Stuff we are testing
    helpers = require('../../../server/helpers'),

    sandbox = sinon.sandbox.create();

describe('{{#has}} helper', function () {
    var fn, inverse, thisCtx, handlebarsOptions;

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        fn = sandbox.spy();
        inverse = sandbox.spy();

        thisCtx = {};

        // This object mocks out the object that handlebars helpers get passed
        handlebarsOptions = {
            hash: {},
            data: {},
            fn: fn,
            inverse: inverse
        };
    });

    function callHasHelper(thisCtx, hash) {
        // Hash is the options passed in
        handlebarsOptions.hash = hash;
        return helpers.has.call(thisCtx, handlebarsOptions);
    }

    describe('tag match', function () {
        it('should handle tag list that validates true', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            // {{#has tag="invalid, bar, wat"}}
            callHasHelper(thisCtx, {tag: 'invalid, bar, wat'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('should handle tags with case-insensitivity', function () {
            thisCtx = {tags: [{name: 'ghost'}]};

            // {{#has tag="GhoSt"}}
            callHasHelper(thisCtx, {tag: 'GhoSt'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('should match exact tags, not superstrings', function () {
            thisCtx = {tags: [{name: 'magical'}]};

            callHasHelper(thisCtx, {tag: 'magic'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('should match exact tags, not substrings', function () {
            thisCtx = {tags: [{name: 'magic'}]};

            callHasHelper(thisCtx, {tag: 'magical'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('should handle tag list that validates false', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'much, such, wow'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('should not do anything if there are no attributes', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx);

            fn.called.should.be.false();
            inverse.called.should.be.false();
        });

        it('should not do anything when an invalid attribute is given', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {invalid: 'nonsense'});

            fn.called.should.be.false();
            inverse.called.should.be.false();
        });
    });

    describe('author match', function () {
        it('should handle author list that evaluates to true', function () {
            thisCtx = {author: {name: 'sam'}};

            callHasHelper(thisCtx, {author: 'joe, sam, pat'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('should handle author list that evaluates to false', function () {
            thisCtx = {author: {name: 'jamie'}};

            callHasHelper(thisCtx, {author: 'joe, sam, pat'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('should handle authors with case-insensitivity', function () {
            thisCtx = {author: {name: 'Sam'}};

            callHasHelper(thisCtx, {author: 'joe, sAm, pat'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('should handle tags and authors like an OR query (pass)', function () {
            thisCtx = {author: {name: 'sam'}, tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat', tag: 'much, such, wow'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('should handle tags and authors like an OR query (pass)', function () {
            thisCtx = {author: {name: 'sam'}, tags: [{name: 'much'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat', tag: 'much, such, wow'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('should handle tags and authors like an OR query (fail)', function () {
            thisCtx = {author: {name: 'fred'}, tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat', tag: 'much, such, wow'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });
    });
});
