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

        describe('Combine Filters', function () {
            let combineFilters;

            beforeEach(function () {
                combineFilters = filter.__get__('filterUtils').combineFilters;
            });

            it('should return nothing when no filters are passed in', function () {
                should.equal(combineFilters(undefined, undefined), undefined);
            });

            it('should return unmodified primary filter when secondary is not passed in', function () {
                combineFilters({status:'published'}).should.eql({status:'published'});
            });

            it('should return unmodified secondary filter when primary is not defined in', function () {
                combineFilters(undefined, {status:'published'}).should.eql({status:'published'});
            });

            it('should combine two filters in $and statement', function () {
                combineFilters({page: true}, {status:'published'}).should.eql({
                    $and:[
                        {page: true},
                        {status:'published'},
                    ]
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
                    expansion: `posts_tags.sort_order:0`
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
                    expansion: `posts_tags.sort_order:0`
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
                    expansion: 'posts_tags.sort_order:0'
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
                    expansion: 'posts_tags.sort_order:0'
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
                    expansion: 'posts_tags.sort_order:0'
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
                    expansion: 'posts_tags.sort_order:0'
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
                    expansion: 'posts_tags.sort_order:0'
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
