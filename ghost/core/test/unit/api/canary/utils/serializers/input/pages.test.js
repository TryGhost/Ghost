const should = require('should');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/input/pages', function () {
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

        it('combine filters', function () {
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

        it('combine filters', function () {
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

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    formats: ['html', 'mobiledoc', 'plaintext'],
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
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

        it('content api default', function () {
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
                    formats: ['html', 'mobiledoc', 'plaintext'],
                    context: {}
                },
                data: {
                    status: 'all',
                    page: false
                }
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
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

            frame.options.formats.should.eql('mobiledoc');
        });

        it('adds default relations if no relations are specified', function () {
            const frame = {
                options: {}
            };

            serializers.input.pages.copy({}, frame);

            frame.options.withRelated.should.eql(['tags', 'authors', 'authors.roles', 'tiers', 'count.signups', 'count.paid_conversions', 'post_revisions', 'post_revisions.author']);
        });
    });
});
