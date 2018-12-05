var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    filter = rewire('../../../../server/models/plugins/filter'),
    models = require('../../../../server/models'),
    ghostBookshelf,

    sandbox = sinon.sandbox.create();

describe('Filter', function () {
    before(function () {
        models.init();
        ghostBookshelf = _.cloneDeep(models.Base);
    });

    beforeEach(function () {
        // re-initialise the plugin with the rewired version
        filter(ghostBookshelf);
    });

    afterEach(function () {
        sandbox.restore();
        filter = rewire('../../../../server/models/plugins/filter');
    });

    describe('Base Model', function () {
        describe('Enforced & Default Filters', function () {
            it('should add filter functions to prototype', function () {
                ghostBookshelf.Model.prototype.enforcedFilters.should.be.a.Function();
                ghostBookshelf.Model.prototype.defaultFilters.should.be.a.Function();
            });

            it('filter functions should return undefined', function () {
                should(ghostBookshelf.Model.prototype.enforcedFilters()).be.undefined();
                should(ghostBookshelf.Model.prototype.defaultFilters()).be.undefined();
            });
        });

        describe('Fetch And Combine Filters', function () {
            var filterUtils;

            beforeEach(function () {
                filterUtils = filter.__get__('filterUtils');
                filterUtils.combineFilters = sandbox.stub();
            });

            it('should add function to prototype', function () {
                ghostBookshelf.Model.prototype.fetchAndCombineFilters.should.be.a.Function();
            });

            it('should set _filters to be the result of combineFilters', function () {
                filterUtils.combineFilters.returns({
                    statements: [
                        {prop: 'page', op: '=', value: true}
                    ]
                });
                var result = ghostBookshelf.Model.prototype.fetchAndCombineFilters();

                result._filters.should.eql({
                    statements: [
                        {prop: 'page', op: '=', value: true}
                    ]
                });
            });

            it('should call combineFilters with undefined x4 if passed no options', function () {
                var result = ghostBookshelf.Model.prototype.fetchAndCombineFilters();

                filterUtils.combineFilters.calledOnce.should.be.true();
                filterUtils.combineFilters.firstCall.args.should.eql([undefined, undefined, undefined, undefined]);
                should(result._filters).be.undefined();
            });

            it('should call combineFilters with enforced filters if set', function () {
                var filterSpy = sandbox.stub(ghostBookshelf.Model.prototype, 'enforcedFilters')
                        .returns('status:published'),
                    result;

                result = ghostBookshelf.Model.prototype.fetchAndCombineFilters();

                filterSpy.calledOnce.should.be.true();
                filterUtils.combineFilters.calledOnce.should.be.true();
                filterUtils.combineFilters.firstCall.args.should.eql(['status:published', undefined, undefined, undefined]);
                should(result._filters).be.undefined();
            });

            it('should call combineFilters with default filters if set', function () {
                var filterSpy = sandbox.stub(ghostBookshelf.Model.prototype, 'defaultFilters')
                        .returns('page:false'),
                    result;

                result = ghostBookshelf.Model.prototype.fetchAndCombineFilters();

                filterSpy.calledOnce.should.be.true();
                filterUtils.combineFilters.calledOnce.should.be.true();
                filterUtils.combineFilters.firstCall.args.should.eql([undefined, 'page:false', undefined, undefined]);
                should(result._filters).be.undefined();
            });

            it('should call combineFilters with custom filters if set', function () {
                var result = ghostBookshelf.Model.prototype.fetchAndCombineFilters({
                    filter: 'tag:photo'
                });

                filterUtils.combineFilters.calledOnce.should.be.true();
                filterUtils.combineFilters.firstCall.args.should.eql([undefined, undefined, 'tag:photo', undefined]);
                should(result._filters).be.undefined();
            });

            it('should call combineFilters with old-style custom filters if set', function () {
                sandbox.stub(ghostBookshelf.Model.prototype, 'extraFilters').returns('author:cameron');

                const result = ghostBookshelf.Model.prototype.fetchAndCombineFilters({});

                filterUtils.combineFilters.calledOnce.should.be.true();
                filterUtils.combineFilters.firstCall.args.should.eql([undefined, undefined, undefined, 'author:cameron']);
                should(result._filters).be.undefined();
            });

            it('should call combineFilters with enforced and defaults if set', function () {
                var filterSpy = sandbox.stub(ghostBookshelf.Model.prototype, 'enforcedFilters')
                        .returns('status:published'),
                    filterSpy2 = sandbox.stub(ghostBookshelf.Model.prototype, 'defaultFilters')
                        .returns('page:false'),
                    result;

                result = ghostBookshelf.Model.prototype.fetchAndCombineFilters();

                filterSpy.calledOnce.should.be.true();
                filterSpy2.calledOnce.should.be.true();
                filterUtils.combineFilters.calledOnce.should.be.true();
                filterUtils.combineFilters.firstCall.args.should.eql(['status:published', 'page:false', undefined, undefined]);
                should(result._filters).be.undefined();
            });

            it('should call combineFilters with all values if set', function () {
                sandbox.stub(ghostBookshelf.Model.prototype, 'defaultFilters').returns('page:false');
                sandbox.stub(ghostBookshelf.Model.prototype, 'enforcedFilters').returns('status:published');
                sandbox.stub(ghostBookshelf.Model.prototype, 'extraFilters').returns('author:cameron');

                const result = ghostBookshelf.Model.prototype.fetchAndCombineFilters({
                    filter: 'tag:photo'
                });

                ghostBookshelf.Model.prototype.enforcedFilters.calledOnce.should.be.true();
                ghostBookshelf.Model.prototype.defaultFilters.calledOnce.should.be.true();

                filterUtils.combineFilters.calledOnce.should.be.true();
                filterUtils.combineFilters.firstCall.args
                    .should.eql(['status:published', 'page:false', 'tag:photo', 'author:cameron']);
                should(result._filters).be.undefined();
            });
        });

        describe('Apply Default and Custom Filters', function () {
            var fetchSpy,
                restoreGQL,
                filterGQL;

            beforeEach(function () {
                filterGQL = {};
                fetchSpy = sandbox.stub(ghostBookshelf.Model.prototype, 'fetchAndCombineFilters');
                filterGQL.knexify = sandbox.stub();
                filterGQL.json = {
                    printStatements: sandbox.stub(),
                    replaceStatements: sandbox.stub().returnsArg(0)
                };

                restoreGQL = filter.__set__('gql', filterGQL);
            });

            afterEach(function () {
                restoreGQL();
            });

            it('should call fetchAndCombineFilters if _filters not set', function () {
                var result = ghostBookshelf.Model.prototype.applyDefaultAndCustomFilters();

                fetchSpy.calledOnce.should.be.true();
                should(result._filters).be.null();
            });

            it('should NOT call fetchAndCombineFilters if _filters IS set', function () {
                ghostBookshelf.Model.prototype._filters = 'test';

                var result = ghostBookshelf.Model.prototype.applyDefaultAndCustomFilters();

                fetchSpy.called.should.be.false();
                result._filters.should.eql('test');
            });

            it('should call knexify with the filters that are set', function () {
                ghostBookshelf.Model.prototype._filters = {
                    statements: [
                        {prop: 'title', op: '=', value: 'Hello Word'}
                    ]
                };
                ghostBookshelf.Model.prototype.applyDefaultAndCustomFilters();

                fetchSpy.called.should.be.false();
                filterGQL.knexify.called.should.be.true();
                filterGQL.knexify.firstCall.args[1].should.eql({
                    statements: [
                        {prop: 'title', op: '=', value: 'Hello Word'}
                    ]
                });
            });

            it('should print statements in debug mode', function () {
                ghostBookshelf.Model.prototype.debug = true;
                ghostBookshelf.Model.prototype._filters = {
                    statements: [
                        {prop: 'tags', op: 'IN', value: ['photo', 'video']}
                    ]
                };

                ghostBookshelf.Model.prototype.applyDefaultAndCustomFilters();
                filterGQL.json.printStatements.calledOnce.should.be.true();
                filterGQL.json.printStatements.firstCall.args[0].should.eql([
                    {prop: 'tags', op: 'IN', value: ['photo', 'video']}
                ]);
            });
        });

        describe('Pre Process Filters', function () {
            it('should not have tests yet, as this needs to be removed');
        });

        describe('Post Process Filters', function () {
            it('should not have tests yet, as this needs to be removed');
        });
    });

    describe('Utils', function () {
        describe('Merge filters', () => {
            let mergeFilters;

            beforeEach(function () {
                mergeFilters = filter.__get__('filterUtils').mergeFilters;
            });

            it('should return empty statement object when there are no filters', function () {
                mergeFilters().should.eql({});
            });

            describe('single filters', () => {
                it('should return only enforced filter when it is passed', () => {
                    const input = {
                        enforced: {status: 'published'}
                    };

                    const output = {
                        status: 'published'
                    };

                    mergeFilters(input).should.eql(output);
                });

                it('should return only default filter when it is passed', () => {
                    const input = {
                        defaults: {status: 'published'}
                    };

                    const output = {
                        status: 'published'
                    };

                    mergeFilters(input).should.eql(output);
                });

                it('should return only custom filter when it is passed', () => {
                    const input = {
                        custom: {status: 'published'}
                    };

                    const output = {
                        status: 'published'
                    };

                    mergeFilters(input).should.eql(output);
                });

                it('should return only extra filter when it is passed', () => {
                    const input = {
                        extra: {status: 'published'}
                    };

                    const output = {
                        status: 'published'
                    };

                    mergeFilters(input).should.eql(output);
                });
            });

            describe('combination of filters', () => {
                it('should merge enforced and default filters if both are provided', () => {
                    const input = {
                        enforced: {status:'published'},
                        defaults: {page:false}
                    };
                    const output = {$and: [
                        {status:'published'},
                        {page:false}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should merge extra filter if provided', () => {
                    const input = {
                        custom: {tag:'photo'},
                        extra: {featured:true},
                    };
                    const output = {$and: [
                        {tag:'photo'},
                        {featured:true}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should combine custom and enforced filters', () => {
                    const input = {
                        enforced: {status:'published'},
                        custom: {tag:'photo'},
                    };
                    const output = {$and: [
                        {status:'published'},
                        {tag:'photo'}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should remove custom filters if matches enforced', () => {
                    const input = {
                        enforced: {status:'published'},
                        custom: {status:'draft'},
                    };
                    const output = {status:'published'};

                    mergeFilters(input).should.eql(output);
                });

                it('should reduce custom filters if any matches enforced', () => {
                    const input = {
                        enforced: {status:'published'},
                        custom: {$or: [
                            {tag:'photo'},
                            {status:'draft'}
                        ]},
                    };
                    const output = {$and:[
                        {status:'published'},
                        {$or: [
                            {tag:'photo'}
                        ]}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should combine default filters if default and custom are provided', () => {
                    const input = {
                        defaults: {page:false},
                        custom: {tag:'photo'},
                    };
                    const output = {$and:[
                        {tag:'photo'},
                        {page:false}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should reduce default filters if default and custom are same', () => {
                    const input = {
                        defaults: {page:false},
                        custom: {page:true},
                    };
                    const output = {page:true};

                    mergeFilters(input).should.eql(output);
                });

                it('should match nested $and with a key inside primary filter', function () {
                    const input = {
                        defaults: {
                            $and:[
                                {page:false},
                                {status: 'published'}
                            ]
                        },
                        custom: {
                            page: {
                                $in:[false,true]
                            }
                        }
                    };
                    const output = {$and: [
                        {page: {
                            $in:[false,true]
                        }},
                        {$and:[
                            {status: 'published'},
                        ]}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should reduce default filters if default and custom overlap', () => {
                    const input = {
                        defaults: {$or:[
                            {page:false},
                            {author:'cameron'}
                        ]},
                        custom: {$and: [
                            {tag: 'photo'},
                            {page: true}
                        ]}
                    };
                    const output = {$and:[
                        {$and: [
                            {tag:'photo'},
                            {page:true},
                        ]},
                        {$or: [
                            {author:"cameron"}
                        ]}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should return a merger of enforced and defaults plus custom filters if provided', () => {
                    const input = {
                        enforced: {status:'published'},
                        defaults: {page:false},
                        custom: {tag:'photo'},
                    };
                    const output = {$and: [
                        {$and: [
                            {status:'published'},
                            {tag:'photo'}
                        ]},
                        {page:false}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('should handle getting enforced, default and multiple custom filters', () => {
                    const input = {
                        enforced: {status:'published'},
                        defaults: {page:true},
                        custom: {$or:[
                            {tag: {
                                $in:['photo','video']
                            }},
                            {author:'cameron'}
                        ]},
                        extra: {$or: [
                            {status: 'draft'},
                            {page: false}
                        ]}
                    };

                    const output = {$and: [
                        {status: 'published'},
                        {$and: [
                            {$or: [
                                {tag: {$in: ['photo','video']}},
                                {author:'cameron'}
                            ]},
                            {$or: [
                                {page: false}
                            ]}
                        ]}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('combination of all filters', () => {
                    const input = {
                        enforced: {featured:true},
                        defaults: {page:false},
                        custom: {status:{$in:['draft','published']}},
                    };
                    const output = {$and: [
                        {$and: [
                            {featured: true},
                            {
                                status: {
                                    $in: ['draft', 'published']
                                }
                            }
                        ]},
                        {page: false},
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                it('does not match incorrect custom filters', () => {
                    const input = {
                        enforced: {status:'published'},
                        defaults: {page:false},
                        custom: {$or:[
                            {page:true},
                            {statusstatus:':5Bdraft%2Cpublished%5D'}
                        ]}
                    };
                    const output = {$and: [
                        {status: 'published'},
                        {$or: [
                            {page:true},
                            {statusstatus:':5Bdraft%2Cpublished%5D'}
                        ]}
                    ]};

                    mergeFilters(input).should.eql(output);
                });

                // TODO: this should be moved into applyDefaultAndCustomFilters test suite
                it.skip('should throw when custom filter is invalid NQL', () => {
                    const input = {
                        enforced: 'status:published',
                        defaults: 'page:false',
                        custom: 'statusstatus::[draft,published]'
                    };

                    should.throws(() => (mergeFilters(input)));
                });
            });
        });

        describe('Find statement', () => {
            let findStatement;

            beforeEach(function () {
                findStatement = filter.__get__('filterUtils').findStatement;
            });

            it('should match with object statement by key', function () {
                const statements = {status: 'published'};

                findStatement(statements, 'page').should.eql(false);
                findStatement(statements, 'status').should.eql(true);
                findStatement(statements, 'tags').should.eql(false);
                findStatement(statements, 'published').should.eql(false);
            });

            it('should match in object statement array by key', function () {
                const statements = [
                    {page: false},
                    {status: 'published'}
                ];

                findStatement(statements, 'page').should.eql(true);
                findStatement(statements, 'status').should.eql(true);
                findStatement(statements, 'tags').should.eql(false);
                findStatement(statements, 'published').should.eql(false);
            });

            it('should match in object statement array by key', function () {
                const statements = [
                    {page: false},
                    {status: 'published'}
                ];

                findStatement(statements, 'page').should.eql(true);
                findStatement(statements, 'status').should.eql(true);
                findStatement(statements, 'tags').should.eql(false);
                findStatement(statements, 'published').should.eql(false);
            });

            describe('nested $and/$or groups', function () {
                it('should match inside nested $and group', function () {
                    const statements = {$and:[
                        {page: false},
                        {status: 'published'}
                    ]};

                    findStatement(statements, 'page').should.eql(true);
                    findStatement(statements, 'status').should.eql(true);
                    findStatement(statements, 'tags').should.eql(false);
                    findStatement(statements, 'published').should.eql(false);
                });

                it('should match inside nested $or group', function () {
                    const statements = {$or:[
                        {page: false},
                        {status: 'published'}
                    ]};

                    findStatement(statements, 'page').should.eql(true);
                    findStatement(statements, 'status').should.eql(true);
                    findStatement(statements, 'tags').should.eql(false);
                    findStatement(statements, 'published').should.eql(false);
                });
            });
        });

        describe('Reject statements', () => {
            let rejectStatements;
            let testFunction;

            beforeEach(function () {
                rejectStatements = filter.__get__('filterUtils').rejectStatements;
                const findStatement = filter.__get__('filterUtils').findStatement;

                testFunction = (statements) => {
                    return (match) => {
                        return findStatement(statements, match);
                    };
                };
            });

            it('should reject from a simple object', () => {
                const statements = {featured: true};
                const filter = {featured: false};

                rejectStatements(statements, testFunction(filter))
                    .should.eql({});
            });

            it('should NOT reject from a simple object when not matching', () => {
                const statements = {featured: true};
                const filter = {status: 'published'};

                rejectStatements(statements, testFunction(filter))
                    .should.eql({featured: true});
            });

            it('returns filter intact if it is empty', () => {
                const statements = null;
                const filter = {featured: true};

                const output = rejectStatements(statements, testFunction(filter));

                should.equal(output, null);
            });

            it('rejects statements that match in filter in $or group', () => {
                const statements = {$or: [{
                        featured: false
                    }, {
                        status: 'published'
                    }
                ]};

                const filter = {
                    featured:true
                };

                const output = {$or: [{
                    status: 'published'
                }]};

                rejectStatements(statements, testFunction(filter)).should.eql(output);
            });

            it('should remove group if all statements are removed', () => {
                const statements = {$or: [{
                        featured: false
                    }
                ]};

                const filter = {
                    featured:true
                };

                const output = {};

                rejectStatements(statements, testFunction(filter)).should.eql(output);
            });

            it('reduces statements if key matches with any keys in $and group', () => {
                const statements = {$or:[
                    {page:false},
                    {author:'cameron'}
                ]};

                const filter = {$and: [
                    {tag: 'photo'},
                    {page: true}
                ]};

                const output = {$or: [
                    {author:"cameron"}
                ]};

                rejectStatements(statements, testFunction(filter)).should.eql(output);
            });

            it('should reject statements that are nested multiple levels', function () {
                const statements = {$and:[
                    {$or:[
                        {tag: {
                            $in:['photo','video']
                        }},
                        {author:'cameron'},
                        {status: 'draft'}
                    ]},
                    {$and: [
                        {status: 'draft'},
                        {page: true}
                    ]},
                ]};

                const filter = {status:'published'};

                const output = {$and:[
                    {$or:[
                        {tag: {
                            $in:['photo','video']
                        }},
                        {author:'cameron'}
                    ]},
                    {$and: [
                        {page: true}
                    ]},
                ]};

                rejectStatements(statements, testFunction(filter)).should.eql(output);
            });
        });

        xdescribe('Combine Filters', function () {
            var gql, combineFilters, parseSpy, mergeSpy, findSpy, rejectSpy;

            beforeEach(function () {
                combineFilters = filter.__get__('filterUtils').combineFilters;
                gql = filter.__get__('gql');
                parseSpy = sandbox.spy(gql, 'parse');
                mergeSpy = sandbox.spy(gql.json, 'mergeStatements');
                findSpy = sandbox.spy(gql.json, 'findStatement');
                rejectSpy = sandbox.spy(gql.json, 'rejectStatements');
            });

            it('should return empty statement object when there are no filters', function () {
                combineFilters().should.eql({statements: []});
                parseSpy.called.should.be.false();
                mergeSpy.calledOnce.should.be.true();
                findSpy.called.should.be.false();
                rejectSpy.called.should.be.false();
            });

            describe('Single filter rules', function () {
                it('should return enforced filters if only those are set', function () {
                    combineFilters('status:published').should.eql({
                        statements: [
                            {prop: 'status', op: '=', value: 'published'}
                        ]
                    });
                    parseSpy.calledOnce.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('should return default filters if only those are set (undefined)', function () {
                    combineFilters(undefined, 'page:false').should.eql({
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    });
                    parseSpy.calledOnce.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('should return default filters if only those are set (null)', function () {
                    combineFilters(null, 'page:false').should.eql({
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    });
                    parseSpy.calledOnce.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('should return custom filters if only those are set', function () {
                    combineFilters(null, null, 'tags:[photo,video]').should.eql({
                        statements: [
                            {prop: 'tags', op: 'IN', value: ['photo', 'video']}
                        ]
                    });
                    parseSpy.calledOnce.should.be.true();
                    mergeSpy.calledOnce.should.be.true();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('does NOT call parse on enforced filter if it is NOT a string', function () {
                    var statement = {
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    };
                    combineFilters(statement, null, null).should.eql({
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    });
                    parseSpy.calledOnce.should.be.false();
                    mergeSpy.calledOnce.should.be.false();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('does NOT call parse on default filter if it is NOT a string', function () {
                    var statement = {
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    };
                    combineFilters(null, statement, null).should.eql({
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    });
                    parseSpy.calledOnce.should.be.false();
                    mergeSpy.calledOnce.should.be.false();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('does NOT call parse on custom filter if it is NOT a string', function () {
                    var statement = {
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    };
                    combineFilters(null, null, statement).should.eql({
                        statements: [
                            {prop: 'page', op: '=', value: false}
                        ]
                    });
                    parseSpy.calledOnce.should.be.false();
                    mergeSpy.calledOnce.should.be.true();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });
            });

            describe('Combo filter rules', function () {
                it('should merge enforced and default filters if both are provided', function () {
                    combineFilters('status:published', 'page:false').should.eql({
                        statements: [
                            {prop: 'status', op: '=', value: 'published'},
                            {prop: 'page', op: '=', value: false, func: 'and'}
                        ]
                    });
                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('should merge custom filters if more than one is provided', function () {
                    combineFilters(null, null, 'tag:photo', 'featured:true').should.eql({
                        statements: [
                            {prop: 'tag', op: '=', value: 'photo'},
                            {prop: 'featured', op: '=', value: true, func: 'and'}
                        ]
                    });
                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledOnce.should.be.true();
                    findSpy.called.should.be.false();
                    rejectSpy.called.should.be.false();
                });

                it('should try to reduce custom filters if custom and enforced are provided', function () {
                    combineFilters('status:published', null, 'tag:photo').should.eql({
                        statements: [
                            {
                                group: [
                                    {prop: 'status', op: '=', value: 'published'}
                                ]
                            },
                            {
                                group: [
                                    {prop: 'tag', op: '=', value: 'photo'}
                                ], func: 'and'
                            }
                        ]
                    });
                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.calledOnce.should.be.true();
                    rejectSpy.firstCall.args[0].should.eql([{op: '=', value: 'photo', prop: 'tag'}]);

                    findSpy.calledOnce.should.be.true();
                    findSpy.getCall(0).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {op: '=', value: 'photo', prop: 'tag'},
                        'prop'
                    ]);
                });

                it('should actually reduce custom filters if one matches enforced', function () {
                    combineFilters('status:published', null, 'tag:photo,status:draft').should.eql({
                        statements: [
                            {
                                group: [
                                    {prop: 'status', op: '=', value: 'published'}
                                ]
                            },
                            {
                                group: [
                                    {prop: 'tag', op: '=', value: 'photo'}
                                ], func: 'and'
                            }
                        ]
                    });

                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.calledOnce.should.be.true();
                    rejectSpy.firstCall.args[0].should.eql([{op: '=', value: 'photo', prop: 'tag'},
                        {op: '=', value: 'draft', prop: 'status', func: 'or'}]);

                    findSpy.calledTwice.should.be.true();
                    findSpy.getCall(0).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {op: '=', value: 'photo', prop: 'tag'},
                        'prop'
                    ]);
                    findSpy.getCall(1).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {op: '=', value: 'draft', prop: 'status', func: 'or'},
                        'prop'
                    ]);
                });

                it('should return only enforced if custom filters are reduced to nothing', function () {
                    combineFilters('status:published', null, 'status:draft').should.eql({
                        statements: [
                            {prop: 'status', op: '=', value: 'published'}
                        ]
                    });

                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.calledOnce.should.be.true();
                    rejectSpy.firstCall.args[0].should.eql([{op: '=', value: 'draft', prop: 'status'}]);

                    findSpy.calledOnce.should.be.true();
                    findSpy.getCall(0).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {op: '=', value: 'draft', prop: 'status'},
                        'prop'
                    ]);
                });

                it('should try to reduce default filters if default and custom are provided', function () {
                    combineFilters(null, 'page:false', 'tag:photo').should.eql({
                        statements: [
                            {
                                group: [
                                    {prop: 'page', op: '=', value: false}
                                ]
                            },
                            {
                                group: [
                                    {prop: 'tag', op: '=', value: 'photo'}
                                ], func: 'and'
                            }
                        ]
                    });

                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.calledOnce.should.be.true();
                    rejectSpy.firstCall.args[0].should.eql([{op: '=', value: false, prop: 'page'}]);

                    findSpy.calledOnce.should.be.true();
                    findSpy.firstCall.args.should.eql([
                        [{op: '=', prop: 'tag', value: 'photo'}],
                        {op: '=', prop: 'page', value: false},
                        'prop'
                    ]);
                });

                it('should actually reduce default filters if one matches custom', function () {
                    combineFilters(null, 'page:false,author:cameron', 'tag:photo+page:true').should.eql({
                        statements: [
                            {
                                group: [
                                    // currently has func: or needs fixing
                                    {prop: 'author', op: '=', value: 'cameron'}
                                ]
                            },
                            {
                                group: [
                                    {prop: 'tag', op: '=', value: 'photo'},
                                    {prop: 'page', op: '=', value: true, func: 'and'}
                                ], func: 'and'
                            }
                        ]
                    });

                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.calledOnce.should.be.true();

                    rejectSpy.firstCall.args[0].should.eql([
                        {op: '=', value: false, prop: 'page'},
                        {op: '=', value: 'cameron', prop: 'author'}
                    ]);

                    findSpy.calledTwice.should.be.true();
                    findSpy.firstCall.args.should.eql([
                        [
                            {op: '=', prop: 'tag', value: 'photo'},
                            {func: 'and', op: '=', prop: 'page', value: true}
                        ],
                        {op: '=', prop: 'page', value: false},
                        'prop'
                    ]);
                    findSpy.secondCall.args.should.eql([
                        [
                            {op: '=', prop: 'tag', value: 'photo'},
                            {func: 'and', op: '=', prop: 'page', value: true}
                        ],
                        {op: '=', prop: 'author', value: 'cameron'},
                        'prop'
                    ]);
                });

                it('should return only custom if default filters are reduced to nothing', function () {
                    combineFilters(null, 'page:false', 'tag:photo,page:true').should.eql({
                        statements: [
                            {prop: 'tag', op: '=', value: 'photo'},
                            {prop: 'page', op: '=', value: true, func: 'or'}
                        ]
                    });

                    parseSpy.calledTwice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.calledOnce.should.be.true();
                    rejectSpy.firstCall.args[0].should.eql([{op: '=', value: false, prop: 'page'}]);

                    findSpy.calledOnce.should.be.true();
                    findSpy.firstCall.args.should.eql([
                        [
                            {op: '=', prop: 'tag', value: 'photo'},
                            {func: 'or', op: '=', prop: 'page', value: true}
                        ],
                        {op: '=', prop: 'page', value: false},
                        'prop'
                    ]);
                });

                it('should return a merger of enforced and defaults plus custom filters if provided', function () {
                    combineFilters('status:published', 'page:false', 'tag:photo').should.eql({
                        statements: [
                            {
                                group: [
                                    {prop: 'status', op: '=', value: 'published'},
                                    {prop: 'page', op: '=', value: false, func: 'and'}
                                ]
                            },
                            {
                                group: [
                                    {prop: 'tag', op: '=', value: 'photo'}
                                ], func: 'and'
                            }
                        ]
                    });

                    parseSpy.calledThrice.should.be.true();
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.calledTwice.should.be.true();
                    rejectSpy.firstCall.args[0].should.eql([{op: '=', value: 'photo', prop: 'tag'}]);
                    rejectSpy.secondCall.args[0].should.eql([{op: '=', value: false, prop: 'page', func: 'and'}]);

                    findSpy.calledTwice.should.be.true();
                    findSpy.firstCall.args.should.eql([
                        [{op: '=', prop: 'status', value: 'published'}],
                        {op: '=', prop: 'tag', value: 'photo'},
                        'prop'
                    ]);
                    findSpy.secondCall.args.should.eql([
                        [{op: '=', prop: 'tag', value: 'photo'}],
                        {func: 'and', op: '=', prop: 'page', value: false},
                        'prop'
                    ]);
                });

                it('should handle getting enforced, default and multiple custom filters', function () {
                    combineFilters('status:published', 'page:false', 'tag:[photo,video],author:cameron', 'status:draft,page:false').should.eql({
                        statements: [
                            {
                                group: [
                                    {prop: 'status', op: '=', value: 'published'}
                                ]
                            },
                            {
                                group: [
                                    {prop: 'tag', op: 'IN', value: ['photo', 'video']},
                                    {prop: 'author', op: '=', value: 'cameron', func: 'or'},
                                    {prop: 'page', op: '=', value: false, func: 'or'}
                                ], func: 'and'
                            }
                        ]
                    });

                    parseSpy.callCount.should.eql(4);
                    mergeSpy.calledTwice.should.be.true();
                    rejectSpy.callCount.should.eql(2);
                    rejectSpy.getCall(0).args[0].should.eql([{op: 'IN', value: ['photo', 'video'], prop: 'tag'},
                        {op: '=', value: 'cameron', prop: 'author', func: 'or'},
                        {op: '=', value: 'draft', prop: 'status', func: 'and'},
                        {op: '=', value: false, prop: 'page', func: 'or'}]);
                    rejectSpy.getCall(1).args[0].should.eql([{op: '=', value: false, prop: 'page'}]);

                    findSpy.callCount.should.eql(5);
                    findSpy.getCall(0).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {op: 'IN', prop: 'tag', value: ['photo', 'video']},
                        'prop'
                    ]);
                    findSpy.getCall(1).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {prop: 'author', op: '=', value: 'cameron', func: 'or'},
                        'prop'
                    ]);
                    findSpy.getCall(2).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {op: '=', value: 'draft', prop: 'status', func: 'and'},
                        'prop'
                    ]);
                    findSpy.getCall(3).args.should.eql([
                        [{op: '=', value: 'published', prop: 'status'}],
                        {prop: 'page', op: '=', value: false, func: 'or'},
                        'prop'
                    ]);
                    findSpy.getCall(4).args.should.eql([
                        [
                            {op: 'IN', value: ['photo', 'video'], prop: 'tag'},
                            {op: '=', value: 'cameron', prop: 'author', func: 'or'},
                            {op: '=', value: false, prop: 'page', func: 'or'}
                        ],
                        {op: '=', value: false, prop: 'page'},
                        'prop'
                    ]);
                });
            });
        });

        describe('Expand filters', () => {
            let expandFilters;

            beforeEach(function () {
                expandFilters = filter.__get__('filterUtils').expandFilters;
            });

            it('should return unchanged filter when no expansions match', function () {
                expandFilters({status: 'published'}, []).should.eql({status: 'published'});
            });

            it('should substitute single alias without expansion', function () {
                const filter = {primary_tag: 'en'};
                const expansions = [{
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                }];

                const processed = {'tags.slug': 'en'};

                expandFilters(filter, expansions).should.eql(processed);
            });

            it('should substitute single alias', function () {
                const filter = {primary_tag: 'en'};
                const expansions = [{
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                    expand: (original) => {
                        return {$and: [
                            original,
                            {'posts_tags.sort_order': 0}
                        ]};
                    }
                }];

                const processed = {$and: [
                    {'tags.slug': 'en'},
                    {'posts_tags.sort_order': 0}
                ]};

                expandFilters(filter, expansions).should.eql(processed);
            });

            it('should substitute filter with negation and - sign', function () {
                const filter = {
                    primary_tag: {
                        $ne: 'great-movies'
                    }
                };
                const expansions = [{
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                    expand: (original) => {
                        return {$and: [
                            original,
                            {'posts_tags.sort_order': 0}
                        ]};
                    }
                }];

                const processed = {$and: [
                    {'tags.slug': {
                        $ne: 'great-movies'
                    }},
                    {'posts_tags.sort_order': 0}
                ]};

                expandFilters(filter, expansions).should.eql(processed);
            });

            it('should NOT match similarly named filter keys', function () {
                const filter = {tags:'hello'};
                const expansions = [{
                    key: 'tag',
                    replacement: 'tags.slug',
                    expand: (original) => {
                        return {$and: [
                            original,
                            {'posts_tags.sort_order': 0}
                        ]};
                    }
                }];

                const processed = {tags:'hello'};

                expandFilters(filter, expansions).should.eql(processed);
            });

            it('should substitute IN notation single alias', function () {
                const filter = {primary_tag: {
                    $in: ['en', 'es']
                }};
                const expansions = [{
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                    expand: (original) => {
                        return {$and: [
                            original,
                            {'posts_tags.sort_order': 0}
                        ]};
                    }
                }];

                const processed = {$and: [
                    {'tags.slug': {$in: ['en', 'es']}},
                    {'posts_tags.sort_order': 0}
                ]};

                expandFilters(filter, expansions).should.eql(processed);
            });

            it('should substitute single alias nested in $and statement', function () {
                const filter = {$and: [
                    {status: 'published'},
                    {featured: true},
                    {primary_tag: {$in: ['en', 'es']}}
                ]};
                const expansions = [{
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                    expand: (original) => {
                        return {$and: [
                            original,
                            {'posts_tags.sort_order': 0}
                        ]};
                    }
                }];

                const processed = {$and: [
                    {status: 'published'},
                    {featured: true},
                    {$and: [
                        {'tags.slug': {$in: [ 'en', 'es' ]}},
                        {'posts_tags.sort_order': 0}]}
                ]};

                expandFilters(filter, expansions).should.eql(processed);
            });

            it('should substitute multiple occurrences of the filter with expansions', function () {
                const filter = {$and: [
                    {status: 'published'},
                    {primary_tag: 'de'},
                    {featured: true},
                    {primary_tag: 'en'}
                ]};
                const expansions = [{
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                    expand: (original) => {
                        return {$and: [
                            original,
                            {'posts_tags.sort_order': 0}
                        ]};
                    }
                }];

                const processed = {$and: [
                    {status: 'published'},
                    {$and: [
                        {'tags.slug': 'de'},
                        {'posts_tags.sort_order': 0}
                    ]},
                    {featured: true},
                    {$and: [
                        {'tags.slug': 'en'},
                        {'posts_tags.sort_order': 0}
                    ]}
                ]};

                expandFilters(filter, expansions).should.eql(processed);
            });

            it('should substitute multiple nested on different levels occurrences', function () {
                const filter = {$and: [
                    {status: 'published'},
                    {primary_tag: 'de'},
                    {featured: true},
                    {$or: [
                        {primary_tag: 'us'},
                        {primary_tag: 'es'}
                    ]}
                ], $or: [
                    {primary_tag: 'pl'}
                ]};
                const expansions = [{
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                    expand: (original) => {
                        return {$and: [
                            original,
                            {'posts_tags.sort_order': 0}
                        ]};
                    }
                }];

                const processed = {$and: [
                    {status: 'published'},
                    {$and: [
                        {'tags.slug': 'de'},
                        {'posts_tags.sort_order': 0}
                    ]},
                    {featured: true},
                    {$or: [
                        {$and: [
                            {'tags.slug': 'us'},
                            {'posts_tags.sort_order': 0}
                        ]},
                        {$and: [
                            {'tags.slug': 'es'},
                            {'posts_tags.sort_order': 0}
                        ]}
                    ]}
                ], $or: [
                    {$and: [
                        {'tags.slug': 'pl'},
                        {'posts_tags.sort_order': 0}
                    ]}
                ]};

                expandFilters(filter, expansions).should.eql(processed);
            });
        });
    });
});
