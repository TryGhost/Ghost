const should = require('should');
const sinon = require('sinon');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');
const postsSchema = require('../../../../../../../core/server/data/schema').tables.posts;

const mobiledocLib = require('@tryghost/html-to-mobiledoc');

describe('Unit: endpoints/utils/serializers/input/posts', function () {
    afterEach(function () {
        sinon.restore();
    });

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

        it('combine status+tag filters', function () {
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

        it('only tag filters', function () {
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

        it('remove mobiledoc and lexical options from formats', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    formats: ['html', 'mobiledoc', 'lexical', 'plaintext'],
                    context: {}
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
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

                serializers.input.posts.browse(apiConfig, frame);
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

                serializers.input.posts.browse(apiConfig, frame);
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

                serializers.input.posts.browse(apiConfig, frame);
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

        it('remove mobiledoc and lexical options from formats', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {
                    formats: ['html', 'mobiledoc', 'lexical', 'plaintext'],
                    context: {}
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.not.containEql('lexical');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });

    describe('edit', function () {
        describe('Ensure html to lexical conversion', function () {
            it('no transformation when no html source option provided', function () {
                const apiConfig = {};
                const lexical = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                html: '<p>convert me</p>',
                                mobiledoc: null,
                                lexical: lexical
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                let postData = frame.data.posts[0];
                postData.lexical.should.equal(lexical);
                should.equal(null, postData.mobiledoc);
            });

            it('no transformation when html data is empty', function () {
                const apiConfig = {};
                const lexical = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
                const frame = {
                    options: {
                        source: 'html'
                    },
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                html: '',
                                mobiledoc: null,
                                lexical: lexical
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                let postData = frame.data.posts[0];
                postData.lexical.should.equal(lexical);
                should.equal(null, postData.mobiledoc);
            });

            it('transforms html when html is present in data and source options', function () {
                // JSDOM require is sometimes very slow on CI causing random timeouts
                this.timeout(4000);

                const apiConfig = {};
                const lexical = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
                const frame = {
                    options: {
                        source: 'html'
                    },
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                html: '<p>this is great feature</p>',
                                lexical: lexical
                            }
                        ]
                    }
                };

                serializers.input.posts.edit(apiConfig, frame);

                let postData = frame.data.posts[0];
                postData.lexical.should.not.equal(lexical);
                postData.lexical.should.equal('{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"this is great feature","type":"extended-text","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
                // we convert to both mobiledoc and lexical to avoid changing formats
                // for existing content when updating with `?source=html,
                // the unused data is cleared in the Post model when saving
                postData.mobiledoc.should.equal('{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"this is great feature"]]]]}');
            });

            it('preserves html cards in transformed html', function () {
                // JSDOM require is sometimes very slow on CI causing random timeouts
                this.timeout(4000);

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
                postData.lexical.should.equal('{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"this is great feature","type":"extended-text","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1},{"type":"html","version":1,"html":"<div class=\\"custom\\">My Custom HTML</div>","visibility":{"web":{"nonMember":true,"memberSegment":"status:free,status:-free"},"email":{"memberSegment":"status:free,status:-free"}}},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"custom html preserved!","type":"extended-text","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
            });

            it('throws error when HTML conversion fails', function () {
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

            frame.options.formats.should.eql('mobiledoc,lexical');
        });

        it('adds default relations if no relations are specified', function () {
            const frame = {
                options: {}
            };

            serializers.input.posts.copy({}, frame);

            frame.options.withRelated.should.eql(['tags', 'authors', 'authors.roles', 'email', 'tiers', 'newsletter', 'count.clicks']);
        });
    });
});
