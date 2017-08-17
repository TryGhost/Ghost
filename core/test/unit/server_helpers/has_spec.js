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

    describe('number match (1-based index)', function () {
        it('will match on an exact number (pass)', function () {
            handlebarsOptions.data = {number: 6};

            callHasHelper(thisCtx, {number: '6'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('will match on an exact number (fail)', function () {
            handlebarsOptions.data = {number: 5};

            callHasHelper(thisCtx, {number: '6'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('will match on an exact number (loop)', function () {
            for (var number = 1; number < 9; number += 1) {
                handlebarsOptions.data = {number: number};
                // Will match 6
                callHasHelper(thisCtx, {number: '6'});
            }

            fn.calledOnce.should.be.true();
            inverse.called.should.be.true();
            inverse.callCount.should.eql(7);
        });

        it('will match on a number list (pass)', function () {
            handlebarsOptions.data = {number: 6};

            callHasHelper(thisCtx, {number: '1, 3, 6,12'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('will match on a number list (fail)', function () {
            handlebarsOptions.data = {number: 5};

            callHasHelper(thisCtx, {number: '1, 3, 6,12'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('will match on a number list (loop)', function () {
            for (var number = 1; number < 9; number += 1) {
                handlebarsOptions.data = {number: number};
                // Will match 1, 3, 6
                callHasHelper(thisCtx, {number: '1, 3, 6,12'});
            }

            fn.called.should.be.true();
            fn.callCount.should.eql(3);
            inverse.called.should.be.true();
            inverse.callCount.should.eql(5);
        });

        it('will match on a nth pattern (pass)', function () {
            handlebarsOptions.data = {number: 6};

            callHasHelper(thisCtx, {number: 'nth:3'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('will match on a nth pattern (fail)', function () {
            handlebarsOptions.data = {number: 5};

            callHasHelper(thisCtx, {number: 'nth:3'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('will match on a nth pattern (loop)', function () {
            for (var number = 1; number < 9; number += 1) {
                handlebarsOptions.data = {number: number};
                // Will match 3 & 6
                callHasHelper(thisCtx, {number: 'nth:3'});
            }

            fn.called.should.be.true();
            fn.callCount.should.eql(2);
            inverse.called.should.be.true();
            inverse.callCount.should.eql(6);
        });

        it('fails gracefully if there is no number property', function () {
            handlebarsOptions.data = {};

            callHasHelper(thisCtx, {number: 'nth:3'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('fails gracefully if there is no data property', function () {
            handlebarsOptions.data = null;

            callHasHelper(thisCtx, {number: 'nth:3'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });
    });

    describe('index match (0-based index)', function () {
        it('will match on an exact index (pass)', function () {
            handlebarsOptions.data = {index: 6};

            callHasHelper(thisCtx, {index: '6'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('will match on an exact index (fail)', function () {
            handlebarsOptions.data = {index: 5};

            callHasHelper(thisCtx, {index: '6'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('will match on an exact index (loop)', function () {
            for (var index = 0; index < 8; index += 1) {
                handlebarsOptions.data = {index: index};
                // Will match 6
                callHasHelper(thisCtx, {index: '6'});
            }

            fn.calledOnce.should.be.true();
            inverse.called.should.be.true();
            inverse.callCount.should.eql(7);
        });

        it('will match on an index list (pass)', function () {
            handlebarsOptions.data = {index: 6};

            callHasHelper(thisCtx, {index: '1, 3, 6,12'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('will match on an index list (fail)', function () {
            handlebarsOptions.data = {index: 5};

            callHasHelper(thisCtx, {index: '1, 3, 6,12'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('will match on an index list (loop)', function () {
            for (var index = 0; index < 8; index += 1) {
                handlebarsOptions.data = {index: index};
                // Will match 1, 3, 6
                callHasHelper(thisCtx, {index: '1, 3, 6,12'});
            }

            fn.called.should.be.true();
            fn.callCount.should.eql(3);
            inverse.called.should.be.true();
            inverse.callCount.should.eql(5);
        });

        it('will match on a nth pattern (pass)', function () {
            handlebarsOptions.data = {index: 6};

            callHasHelper(thisCtx, {index: 'nth:3'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('will match on a nth pattern (fail)', function () {
            handlebarsOptions.data = {index: 5};

            callHasHelper(thisCtx, {index: 'nth:3'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('will match on a nth pattern (loop)', function () {
            for (var index = 0; index < 8; index += 1) {
                handlebarsOptions.data = {index: index};
                // Will match 0, 3, 6
                callHasHelper(thisCtx, {index: 'nth:3'});
            }

            fn.called.should.be.true();
            fn.callCount.should.eql(3);
            inverse.called.should.be.true();
            inverse.callCount.should.eql(5);
        });

        it('fails gracefully if there is no index property', function () {
            handlebarsOptions.data = {};

            callHasHelper(thisCtx, {index: 'nth:3'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });
    });

    describe('slug match', function () {
        it('matches on an exact slug (pass)', function () {
            thisCtx = {slug: 'welcome'};

            // {{#has slug="welcome"}}
            callHasHelper(thisCtx, {slug: 'welcome'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on an exact slug (fail)', function () {
            thisCtx = {slug: 'welcome'};

            // {{#has slug="welcome-to-ghost"}}
            callHasHelper(thisCtx, {slug: 'welcome-to-ghost'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('fails gracefully if there is no slug (fail)', function () {
            thisCtx = {};

            // {{#has slug="welcome-to-ghost"}}
            callHasHelper(thisCtx, {slug: 'welcome-to-ghost'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });
    });

    describe('id match', function () {
        it('matches on an exact id (pass)', function () {
            thisCtx = {id: '5981fbed98141579627e9a5a'};

            // {{#has id="5981fbed98141579627e9a5a"}}
            callHasHelper(thisCtx, {id: '5981fbed98141579627e9a5a'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on an exact id (fail)', function () {
            thisCtx = {id: '5981fbed98141579627e9a5a'};

            // {{#has id="5981fbed98141579627e9a5a"}}
            callHasHelper(thisCtx, {id: '5981fbed98141579627e9abc'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('fails gracefully if there is no id (fail)', function () {
            thisCtx = {};

            // {{#has id="5981fbed98141579627e9a5a"}}
            callHasHelper(thisCtx, {id: '5981fbed98141579627e9abc'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });
    });

    describe('any match', function () {
        it('matches on a single property (pass)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: '',
                website: null
            };

            // {{#has any="twitter"}}
            callHasHelper(thisCtx, {any: 'twitter'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on a single property (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: '',
                website: null
            };

            // {{#has any="facebook"}}
            callHasHelper(thisCtx, {any: 'facebook'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('matches on multiple properties (pass)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: '',
                website: null
            };

            // {{#has any="twitter, facebook,website"}}
            callHasHelper(thisCtx, {any: 'twitter, facebook,website'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on multiple properties (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: '',
                website: null
            };

            // {{#has any="facebook,website, foo"}}
            callHasHelper(thisCtx, {any: 'facebook,website, foo'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('matches on global properties (pass)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                blog: {
                    twitter: 'foo',
                    facebook: '',
                    website: null
                }
            };

            // {{#has any="@blog.twitter, @blog.facebook,@blog.website"}}
            callHasHelper(thisCtx, {any: '@blog.twitter, @blog.facebook,@blog.website'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on global properties (fail)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                blog: {
                    twitter: 'foo',
                    facebook: '',
                    website: null
                }
            };

            // {{#has any="@blog.facebook,@blog.website, @blog.foo"}}
            callHasHelper(thisCtx, {any: '@blog.facebook,@blog.website, @not.foo'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('matches on path expressions (pass)', function () {
            thisCtx = {
                author: {
                    twitter: 'foo',
                    facebook: '',
                    website: null
                }
            };

            // {{#has any="author.twitter, author.facebook,author.website"}}
            callHasHelper(thisCtx, {any: 'author.twitter, author.facebook,author.website'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on path expressions (fail)', function () {
            thisCtx = {
                author: {
                    twitter: 'foo',
                    facebook: '',
                    website: null
                }
            };

            // {{#has any="author.facebook,author.website, author.foo"}}
            callHasHelper(thisCtx, {any: 'author.facebook,author.website, fred.foo'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });
    });

    describe('all match', function () {
        it('matches on a single property (pass)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: 'bar',
                website: null
            };

            // {{#has all="twitter"}}
            callHasHelper(thisCtx, {all: 'twitter'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on a single property (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: 'bar',
                website: null
            };

            // {{#has all="website"}}
            callHasHelper(thisCtx, {all: 'website'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('matches on multiple properties (pass)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: 'bar',
                website: null
            };

            // {{#has all="twitter, facebook"}}
            callHasHelper(thisCtx, {all: 'twitter, facebook'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on multiple properties (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: 'bar',
                website: null
            };

            // {{#has all="facebook,website, foo"}}
            callHasHelper(thisCtx, {all: 'facebook,website, foo'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('matches on global properties (pass)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                blog: {
                    twitter: 'foo',
                    facebook: 'bar',
                    website: null
                }
            };

            // {{#has all="@blog.twitter, @blog.facebook"}}
            callHasHelper(thisCtx, {all: '@blog.twitter, @blog.facebook'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on global properties (fail)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                blog: {
                    twitter: 'foo',
                    facebook: 'bar',
                    website: null
                }
            };

            // {{#has all="@blog.facebook,@blog.website, @blog.foo"}}
            callHasHelper(thisCtx, {all: '@blog.facebook,@blog.website, @not.foo'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });

        it('matches on path expressions (pass)', function () {
            thisCtx = {
                author: {
                    twitter: 'foo',
                    facebook: 'bar',
                    website: null
                }
            };

            // {{#has all="author.twitter, author.facebook"}}
            callHasHelper(thisCtx, {all: 'author.twitter, author.facebook'});

            fn.called.should.be.true();
            inverse.called.should.be.false();
        });

        it('matches on path expressions (fail)', function () {
            thisCtx = {
                author: {
                    twitter: 'foo',
                    facebook: 'bar',
                    website: null
                }
            };

            // {{#has all="author.facebook,author.website, author.foo"}}
            callHasHelper(thisCtx, {all: 'author.facebook,author.website, fred.foo'});

            fn.called.should.be.false();
            inverse.called.should.be.true();
        });
    });
});
