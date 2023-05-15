const should = require('should');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/input/posts', function () {
    describe('browse', function () {
        it('default', function () {
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
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('type:post');
        });

        it('should not work for non public context', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'admin',
                options: {
                    context: {
                        user: 1
                    }
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            should.equal(frame.options.filter, '(type:post)+status:[draft,published,scheduled,sent]');
        });

        it('combine filters', function () {
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
                    },
                    filter: 'status:published+tag:eins'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(status:published+tag:eins)+type:post');
        });

        it('combine filters', function () {
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
                    },
                    filter: 'tag:eins'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(tag:eins)+type:post');
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

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });

    describe('read', function () {
        it('with apiType of "content" it forces type filter', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {},
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.options.filter.should.eql('type:post');
        });

        it('with apiType of "content" it forces type:post filter', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    filter: 'type:page'
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.options.filter.should.eql('(type:page)+type:post');
        });

        it('with apiType of "admin" it forces type & status false filter', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'admin',
                options: {
                    context: {
                        api_key: {
                            id: 1,
                            type: 'admin'
                        }
                    }
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.options.filter.should.eql('(type:post)+status:[draft,published,scheduled,sent]');
        });

        it('with apiType of "admin" it forces type:post filter & respects custom status filter', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'admin',
                options: {
                    context: {
                        api_key: {
                            id: 1,
                            type: 'admin'
                        }
                    },
                    filter: 'status:draft'
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.options.filter.should.eql('(status:draft)+type:post');
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    formats: ['html', 'mobiledoc', 'plaintext'],
                    context: {}
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });

    describe('edit', function () {
        describe('Ensure html to mobiledoc conversion', function () {
            it('no transformation when no html source option provided', function () {
                const apiConfig = {};
                const mobiledoc = '{"version":"0.3.1","atoms":[],"cards":[],"sections":[]}';
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                html: '<p>convert me</p>',
                                mobiledoc: mobiledoc
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                let postData = frame.data.posts[0];
                postData.mobiledoc.should.equal(mobiledoc);
            });

            it('no transformation when html data is empty', function () {
                const apiConfig = {};
                const mobiledoc = '{"version":"0.3.1","atoms":[],"cards":[],"sections":[]}';
                const frame = {
                    options: {
                        source: 'html'
                    },
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                html: '',
                                mobiledoc: mobiledoc
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                let postData = frame.data.posts[0];
                postData.mobiledoc.should.equal(mobiledoc);
            });

            it('transforms html when html is present in data and source options', function () {
                const apiConfig = {};
                const mobiledoc = '{"version":"0.3.1","atoms":[],"cards":[],"sections":[]}';
                const frame = {
                    options: {
                        source: 'html'
                    },
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                html: '<p>this is great feature</p>',
                                mobiledoc: mobiledoc
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                let postData = frame.data.posts[0];
                postData.mobiledoc.should.not.equal(mobiledoc);
                postData.mobiledoc.should.equal('{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"this is great feature"]]]]}');
            });

            it('preserves html cards in transformed html', function () {
                const apiConfig = {};
                const frame = {
                    options: {
                        source: 'html'
                    },
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                html: '<p>this is great feature</p>\n<!--kg-card-begin: html--><div class="custom">My Custom HTML</div><!--kg-card-end: html-->\n<p>custom html preserved!</p>'
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                let postData = frame.data.posts[0];
                postData.mobiledoc.should.equal('{"version":"0.3.1","atoms":[],"cards":[["html",{"html":"<div class=\\"custom\\">My Custom HTML</div>"}]],"markups":[],"sections":[[1,"p",[[0,[],0,"this is great feature"]]],[10,0],[1,"p",[[0,[],0,"custom html preserved!"]]]]}');
            });
        });

        it('tags relation is stripped of unknown properties', function () {
            const apiConfig = {};

            const frame = {
                options: {},
                data: {
                    posts: [
                        {
                            id: 'id1',
                            tags: [{slug: 'slug1', name: 'hey', parent: null}, {slug: 'slug2'}]
                        }
                    ]
                }
            };

            serializers.input.posts.edit(apiConfig, frame);
            frame.data.posts[0].tags.should.eql([{slug: 'slug1', name: 'hey'}, {slug: 'slug2'}]);
        });

        describe('Ensure relations format', function () {
            it('relations is array of objects', function () {
                const apiConfig = {};

                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                authors: [{id: 'id'}],
                                tags: [{slug: 'slug1', name: 'hey'}, {slug: 'slug2'}]
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                frame.data.posts[0].authors.should.eql([{id: 'id'}]);
                frame.data.posts[0].tags.should.eql([{slug: 'slug1', name: 'hey'}, {slug: 'slug2'}]);
            });

            it('authors is array of strings', function () {
                const apiConfig = {};

                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                authors: ['email1', 'email2'],
                                tags: ['name1', 'name2']
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                frame.data.posts[0].authors.should.eql([{email: 'email1'}, {email: 'email2'}]);
                frame.data.posts[0].tags.should.eql([{name: 'name1'}, {name: 'name2'}]);
            });
        });
    });

    describe('copy', function () {
        it('adds default formats if no formats are specified', function () {
            const frame = {
                options: {}
            };

            serializers.input.posts.copy({}, frame);

            frame.options.formats.should.eql('mobiledoc');
        });

        it('adds default relations if no relations are specified', function () {
            const frame = {
                options: {}
            };

            serializers.input.posts.copy({}, frame);

            frame.options.withRelated.should.eql(['tags', 'authors', 'authors.roles', 'email', 'tiers', 'newsletter', 'count.clicks', 'post_revisions', 'post_revisions.author']);
        });
    });
});
