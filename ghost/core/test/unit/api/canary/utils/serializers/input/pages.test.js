const should = require('should');
const sinon = require('sinon');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');
const postsSchema = require('../../../../../../../core/server/data/schema').tables.posts;

const mobiledocLib = require('@tryghost/html-to-mobiledoc');

describe('Unit: endpoints/utils/serializers/input/pages', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('browse', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('type:page');
        });

        it('combine status+tag filters', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    filter: 'status:published+tag:eins',
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('(status:published+tag:eins)+type:page');
        });

        it('only tag filters', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    filter: 'tag:eins',
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('(tag:eins)+type:page');
        });

        it('remove mobiledoc and lexical option from formats', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    formats: ['html', 'mobiledoc', 'lexical', 'plaintext'],
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.not.containEql('lexical');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });

        describe('Content API', function () {
            it('selects all columns from the posts schema but mobiledoc and lexical when no columns are specified', function () {
                const apiConfig = {};
                const frame = {
                    apiType: 'content',
                    options: {
                        context: {}
                    }
                };

                serializers.input.pages.browse(apiConfig, frame);
                const columns = Object.keys(postsSchema);
                const parsedSelectRaw = frame.options.selectRaw.split(',').map(column => column.trim());
                parsedSelectRaw.should.eql(columns.filter(column => !['mobiledoc', 'lexical','@@UNIQUE_CONSTRAINTS@@','@@INDEXES@@'].includes(column)));
            });

            it('strips mobiledoc and lexical columns from a specified columns option', function () {
                const apiConfig = {};
                const frame = {
                    apiType: 'content',
                    options: {
                        context: {},
                        columns: ['id', 'mobiledoc', 'lexical', 'visibility']
                    }
                };

                serializers.input.pages.browse(apiConfig, frame);
                frame.options.columns.should.eql(['id', 'visibility']);
            });

            it('forces visibility column if columns are specified', function () {
                const apiConfig = {};
                const frame = {
                    apiType: 'content',
                    options: {
                        context: {},
                        columns: ['id']
                    }
                };
                
                serializers.input.pages.browse(apiConfig, frame);
                frame.options.columns.should.eql(['id', 'visibility']);
            });
                
            it('strips mobiledoc and lexical columns from a specified selectRaw option', function () {
                const apiConfig = {};
                const frame = {
                    apiType: 'content',
                    options: {
                        context: {},
                        selectRaw: 'id, mobiledoc, lexical'
                    }
                };

                serializers.input.posts.browse(apiConfig, frame);
                frame.options.selectRaw.should.eql('id');
            });
        });
    });

    describe('read', function () {
        it('content api default', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    context: {}
                },
                data: {}
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.options.filter.should.eql('type:page');
        });

        it('content api default (with context)', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    context: {
                        user: 0,
                        api_key: {
                            id: 1,
                            type: 'content'
                        }
                    }
                },
                data: {}
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.options.filter.should.eql('type:page');
        });

        it('admin api default', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'admin',
                options: {
                    context: {
                        user: 0,
                        api_key: {
                            id: 1,
                            type: 'admin'
                        }
                    }
                },
                data: {}
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.options.filter.should.eql('(type:page)+status:[draft,published,scheduled]');
        });

        it('custom status filter', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'admin',
                options: {
                    filter: 'status:draft',
                    context: {
                        user: 0,
                        api_key: {
                            id: 1,
                            type: 'admin'
                        }
                    }
                },
                data: {}
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.options.filter.should.eql('(status:draft)+type:page');
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    formats: ['html', 'mobiledoc', 'lexical', 'plaintext'],
                    context: {}
                },
                data: {
                    status: 'all',
                    page: false
                }
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.not.containEql('lexical');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });

    it('tags relation is stripped of unknown properties', function () {
        const apiConfig = {};

        const frame = {
            options: {},
            data: {
                pages: [
                    {
                        id: 'id1',
                        tags: [{slug: 'slug1', name: 'hey', parent: null}, {slug: 'slug2'}]
                    }
                ]
            }
        };

        serializers.input.pages.edit(apiConfig, frame);
        frame.data.pages[0].tags.should.eql([{slug: 'slug1', name: 'hey'}, {slug: 'slug2'}]);
    });

    it('throws error if HTML conversion fails', function () {
        // JSDOM require is sometimes very slow on CI causing random timeouts
        this.timeout(4000);

        const frame = {
            options: {
                source: 'html'
            },
            data: {
                posts: [
                    {
                        id: 'id1',
                        html: '<bananarama>'
                    }
                ]
            }
        };

        sinon.stub(mobiledocLib, 'toMobiledoc').throws(new Error('Some error'));

        try {
            serializers.input.posts.edit({}, frame);
            should.fail('Error expected');
        } catch (err) {
            err.message.should.eql('Failed to convert HTML to Mobiledoc');
        }
    });

    describe('Ensure relations format', function () {
        it('relations is array of objects', function () {
            const apiConfig = {};

            const frame = {
                apiType: 'content',
                options: {},
                data: {
                    pages: [
                        {
                            id: 'id1',
                            authors: [{id: 'id'}],
                            tags: [{slug: 'slug1', name: 'hey'}, {slug: 'slug2'}]
                        }
                    ]
                }
            };

            serializers.input.pages.edit(apiConfig, frame);

            frame.data.pages[0].authors.should.eql([{id: 'id'}]);
            frame.data.pages[0].tags.should.eql([{slug: 'slug1', name: 'hey'}, {slug: 'slug2'}]);
        });

        it('authors is array of strings', function () {
            const apiConfig = {};

            const frame = {
                apiType: 'content',
                options: {},
                data: {
                    pages: [
                        {
                            id: 'id1',
                            authors: ['email1', 'email2'],
                            tags: ['name1', 'name2']
                        }
                    ]
                }
            };

            serializers.input.pages.edit(apiConfig, frame);

            frame.data.pages[0].authors.should.eql([{email: 'email1'}, {email: 'email2'}]);
            frame.data.pages[0].tags.should.eql([{name: 'name1'}, {name: 'name2'}]);
        });
    });

    describe('copy', function () {
        it('adds default formats if no formats are specified', function () {
            const frame = {
                options: {}
            };

            serializers.input.pages.copy({}, frame);

            frame.options.formats.should.eql('mobiledoc,lexical');
        });

        it('adds default relations if no relations are specified', function () {
            const frame = {
                options: {}
            };

            serializers.input.pages.copy({}, frame);

            frame.options.withRelated.should.eql(['tags', 'authors', 'authors.roles', 'tiers', 'count.signups', 'count.paid_conversions']);
        });
    });
});
