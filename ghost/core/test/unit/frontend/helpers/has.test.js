const sinon = require('sinon');

// Stuff we are testing
const has = require('../../../../core/frontend/helpers/has');

describe('{{#has}} helper', function () {
    let fn;
    let inverse;
    let thisCtx;
    let handlebarsOptions;

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        fn = sinon.spy();
        inverse = sinon.spy();

        thisCtx = {};

        // This object mocks out the object that handlebars helpers get passed
        handlebarsOptions = {
            hash: {},
            data: {},
            fn: fn,
            inverse: inverse
        };
    });

    function callHasHelper(context, hash) {
        // Hash is the options passed in
        handlebarsOptions.hash = hash;
        return has.call(context, handlebarsOptions);
    }

    describe('tag match', function () {
        it('should handle tag list that validates true', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            // {{#has tag="invalid, bar, wat"}}
            callHasHelper(thisCtx, {tag: 'invalid, bar, wat'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('should handle tags with case-insensitivity', function () {
            thisCtx = {tags: [{name: 'ghost'}]};

            // {{#has tag="GhoSt"}}
            callHasHelper(thisCtx, {tag: 'GhoSt'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('should match exact tags, not superstrings', function () {
            thisCtx = {tags: [{name: 'magical'}]};

            callHasHelper(thisCtx, {tag: 'magic'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('should match exact tags, not substrings', function () {
            thisCtx = {tags: [{name: 'magic'}]};

            callHasHelper(thisCtx, {tag: 'magical'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('should handle tag list that validates false', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'much, such, wow'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('should not do anything if there are no attributes', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx);

            sinon.assert.notCalled(fn);
            sinon.assert.notCalled(inverse);
        });

        it('should not do anything when an invalid attribute is given', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {invalid: 'nonsense'});

            sinon.assert.notCalled(fn);
            sinon.assert.notCalled(inverse);
        });

        it('count:0', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'count:0'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:3', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'count:3'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('count:11', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'count:11'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:>3', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'count:>3'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:>2', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'count:>2'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('count:<1', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {tag: 'count:<1'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:<3', function () {
            thisCtx = {tags: [{name: 'foo'}, {name: 'bar'}]};

            callHasHelper(thisCtx, {tag: 'count:<3'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });
    });

    describe('author match', function () {
        it('should handle author list that evaluates to true', function () {
            thisCtx = {authors: [{name: 'sam'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('should handle author list that evaluates to false', function () {
            thisCtx = {authors: [{name: 'jamie'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('should handle authors with case-insensitivity', function () {
            thisCtx = {authors: [{name: 'Sam'}]};

            callHasHelper(thisCtx, {author: 'joe, sAm, pat'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('should handle tags and authors like an OR query (pass)', function () {
            thisCtx = {authors: [{name: 'sam'}], tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat', tag: 'much, such, wow'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('should handle tags and authors like an OR query when match both author and tag (pass)', function () {
            thisCtx = {authors: [{name: 'sam'}], tags: [{name: 'much'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat', tag: 'much, such, wow'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('should handle tags and authors like an OR query (fail)', function () {
            thisCtx = {authors: [{name: 'fred'}], tags: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]};

            callHasHelper(thisCtx, {author: 'joe, sam, pat', tag: 'much, such, wow'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:0', function () {
            thisCtx = {authors: [{name: 'fred'}]};

            callHasHelper(thisCtx, {author: 'count:0'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:1', function () {
            thisCtx = {authors: [{name: 'fred'}]};

            callHasHelper(thisCtx, {author: 'count:1'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('count:>1 (fail)', function () {
            thisCtx = {authors: [{name: 'fred'}]};

            callHasHelper(thisCtx, {author: 'count:>1'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:>1 (pass)', function () {
            thisCtx = {authors: [{name: 'fred'}, {name: 'sam'}]};

            callHasHelper(thisCtx, {author: 'count:>1'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('count:>2', function () {
            thisCtx = {authors: [{name: 'fred'}, {name: 'sam'}]};

            callHasHelper(thisCtx, {author: 'count:>2'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:<1', function () {
            thisCtx = {authors: [{name: 'fred'}, {name: 'sam'}]};

            callHasHelper(thisCtx, {author: 'count:<1'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('count:<3', function () {
            thisCtx = {authors: [{name: 'fred'}, {name: 'sam'}]};

            callHasHelper(thisCtx, {author: 'count:<3'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });
    });

    describe('number match (1-based index)', function () {
        it('will match on an exact number (pass)', function () {
            handlebarsOptions.data = {number: 6};

            callHasHelper(thisCtx, {number: '6'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('will match on an exact number (fail)', function () {
            handlebarsOptions.data = {number: 5};

            callHasHelper(thisCtx, {number: '6'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('will match on an exact number (loop)', function () {
            for (let number = 1; number < 9; number += 1) {
                handlebarsOptions.data = {number: number};
                // Will match 6
                callHasHelper(thisCtx, {number: '6'});
            }

            sinon.assert.calledOnce(fn);
            sinon.assert.called(inverse);
            sinon.assert.callCount(inverse, 7);
        });

        it('will match on a number list (pass)', function () {
            handlebarsOptions.data = {number: 6};

            callHasHelper(thisCtx, {number: '1, 3, 6,12'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('will match on a number list (fail)', function () {
            handlebarsOptions.data = {number: 5};

            callHasHelper(thisCtx, {number: '1, 3, 6,12'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('will match on a number list (loop)', function () {
            for (let number = 1; number < 9; number += 1) {
                handlebarsOptions.data = {number: number};
                // Will match 1, 3, 6
                callHasHelper(thisCtx, {number: '1, 3, 6,12'});
            }

            sinon.assert.called(fn);
            sinon.assert.calledThrice(fn);
            sinon.assert.called(inverse);
            sinon.assert.callCount(inverse, 5);
        });

        it('will match on a nth pattern (pass)', function () {
            handlebarsOptions.data = {number: 6};

            callHasHelper(thisCtx, {number: 'nth:3'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('will match on a nth pattern (fail)', function () {
            handlebarsOptions.data = {number: 5};

            callHasHelper(thisCtx, {number: 'nth:3'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('will match on a nth pattern (loop)', function () {
            for (let number = 1; number < 9; number += 1) {
                handlebarsOptions.data = {number: number};
                // Will match 3 & 6
                callHasHelper(thisCtx, {number: 'nth:3'});
            }

            sinon.assert.called(fn);
            sinon.assert.calledTwice(fn);
            sinon.assert.called(inverse);
            sinon.assert.callCount(inverse, 6);
        });

        it('fails gracefully if there is no number property', function () {
            handlebarsOptions.data = {};

            callHasHelper(thisCtx, {number: 'nth:3'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('fails gracefully if there is no data property', function () {
            handlebarsOptions.data = null;

            callHasHelper(thisCtx, {number: 'nth:3'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });
    });

    describe('index match (0-based index)', function () {
        it('will match on an exact index (pass)', function () {
            handlebarsOptions.data = {index: 6};

            callHasHelper(thisCtx, {index: '6'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('will match on an exact index (fail)', function () {
            handlebarsOptions.data = {index: 5};

            callHasHelper(thisCtx, {index: '6'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('will match on an exact index (loop)', function () {
            for (let index = 0; index < 8; index += 1) {
                handlebarsOptions.data = {index: index};
                // Will match 6
                callHasHelper(thisCtx, {index: '6'});
            }

            sinon.assert.calledOnce(fn);
            sinon.assert.called(inverse);
            sinon.assert.callCount(inverse, 7);
        });

        it('will match on an index list (pass)', function () {
            handlebarsOptions.data = {index: 6};

            callHasHelper(thisCtx, {index: '1, 3, 6,12'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('will match on an index list (fail)', function () {
            handlebarsOptions.data = {index: 5};

            callHasHelper(thisCtx, {index: '1, 3, 6,12'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('will match on an index list (loop)', function () {
            for (let index = 0; index < 8; index += 1) {
                handlebarsOptions.data = {index: index};
                // Will match 1, 3, 6
                callHasHelper(thisCtx, {index: '1, 3, 6,12'});
            }

            sinon.assert.called(fn);
            sinon.assert.calledThrice(fn);
            sinon.assert.called(inverse);
            sinon.assert.callCount(inverse, 5);
        });

        it('will match on a nth pattern (pass)', function () {
            handlebarsOptions.data = {index: 6};

            callHasHelper(thisCtx, {index: 'nth:3'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('will match on a nth pattern (fail)', function () {
            handlebarsOptions.data = {index: 5};

            callHasHelper(thisCtx, {index: 'nth:3'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('will match on a nth pattern (loop)', function () {
            for (let index = 0; index < 8; index += 1) {
                handlebarsOptions.data = {index: index};
                // Will match 0, 3, 6
                callHasHelper(thisCtx, {index: 'nth:3'});
            }

            sinon.assert.called(fn);
            sinon.assert.calledThrice(fn);
            sinon.assert.called(inverse);
            sinon.assert.callCount(inverse, 5);
        });

        it('fails gracefully if there is no index property', function () {
            handlebarsOptions.data = {};

            callHasHelper(thisCtx, {index: 'nth:3'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });
    });

    describe('slug match', function () {
        it('matches on an exact slug (pass)', function () {
            thisCtx = {slug: 'welcome'};

            // {{#has slug="welcome"}}
            callHasHelper(thisCtx, {slug: 'welcome'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on an exact slug (fail)', function () {
            thisCtx = {slug: 'welcome'};

            // {{#has slug="welcome-to-ghost"}}
            callHasHelper(thisCtx, {slug: 'welcome-to-ghost'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('fails gracefully if there is no slug (fail)', function () {
            thisCtx = {};

            // {{#has slug="welcome-to-ghost"}}
            callHasHelper(thisCtx, {slug: 'welcome-to-ghost'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });
    });

    describe('visibility match', function () {
        it('matches on an exact visibility (pass)', function () {
            thisCtx = {visibility: 'paid'};

            // {{#has visibility="paid"}}
            callHasHelper(thisCtx, {visibility: 'paid'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on an exact visibility (fail)', function () {
            thisCtx = {visibility: 'paid'};

            // {{#has visibility="members"}}
            callHasHelper(thisCtx, {visibility: 'members'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('fails gracefully if there is no visibility (fail)', function () {
            thisCtx = {};

            // {{#has visibility="welcome-to-ghost"}}
            callHasHelper(thisCtx, {visibility: 'paid'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });
    });

    describe('id match', function () {
        it('matches on an exact id (pass)', function () {
            thisCtx = {id: '5981fbed98141579627e9a5a'};

            // {{#has id="5981fbed98141579627e9a5a"}}
            callHasHelper(thisCtx, {id: '5981fbed98141579627e9a5a'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on an exact id (fail)', function () {
            thisCtx = {id: '5981fbed98141579627e9a5a'};

            // {{#has id="5981fbed98141579627e9a5a"}}
            callHasHelper(thisCtx, {id: '5981fbed98141579627e9abc'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('fails gracefully if there is no id (fail)', function () {
            thisCtx = {};

            // {{#has id="5981fbed98141579627e9a5a"}}
            callHasHelper(thisCtx, {id: '5981fbed98141579627e9abc'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
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

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on a single property (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: '',
                website: null
            };

            // {{#has any="facebook"}}
            callHasHelper(thisCtx, {any: 'facebook'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('matches on multiple properties (pass)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: '',
                website: null
            };

            // {{#has any="twitter, facebook,website"}}
            callHasHelper(thisCtx, {any: 'twitter, facebook,website'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on multiple properties (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: '',
                website: null
            };

            // {{#has any="facebook,website, foo"}}
            callHasHelper(thisCtx, {any: 'facebook,website, foo'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('matches on global properties (pass)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                site: {
                    twitter: 'foo',
                    facebook: '',
                    website: null
                }
            };

            // {{#has any="@site.twitter, @site.facebook,@site.website"}}
            callHasHelper(thisCtx, {any: '@site.twitter, @site.facebook,@site.website'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on global properties (fail)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                site: {
                    twitter: 'foo',
                    facebook: '',
                    website: null
                }
            };

            // {{#has any="@site.facebook,@site.website, @site.foo"}}
            callHasHelper(thisCtx, {any: '@site.facebook,@site.website, @not.foo'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
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

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
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

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
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

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on a single property (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: 'bar',
                website: null
            };

            // {{#has all="website"}}
            callHasHelper(thisCtx, {all: 'website'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('matches on multiple properties (pass)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: 'bar',
                website: null
            };

            // {{#has all="twitter, facebook"}}
            callHasHelper(thisCtx, {all: 'twitter, facebook'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on multiple properties (fail)', function () {
            thisCtx = {
                twitter: 'foo',
                facebook: 'bar',
                website: null
            };

            // {{#has all="facebook,website, foo"}}
            callHasHelper(thisCtx, {all: 'facebook,website, foo'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });

        it('matches on global properties (pass)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                site: {
                    twitter: 'foo',
                    facebook: 'bar',
                    website: null
                }
            };

            // {{#has all="@site.twitter, @site.facebook"}}
            callHasHelper(thisCtx, {all: '@site.twitter, @site.facebook'});

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
        });

        it('matches on global properties (fail)', function () {
            thisCtx = {};
            handlebarsOptions.data = {
                site: {
                    twitter: 'foo',
                    facebook: 'bar',
                    website: null
                }
            };

            // {{#has all="@site.facebook,@site.website, @site.foo"}}
            callHasHelper(thisCtx, {all: '@site.facebook,@site.website, @not.foo'});

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
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

            sinon.assert.called(fn);
            sinon.assert.notCalled(inverse);
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

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });
    });
});
