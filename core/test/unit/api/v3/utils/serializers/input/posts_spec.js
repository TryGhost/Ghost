const should = require('should');
const sinon = require('sinon');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');
const urlUtils = require('../../../../../../utils/urlUtils');

describe('Unit: v2/utils/serializers/input/posts', function () {
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
            should.equal(frame.options.filter, '(type:post)+status:[draft,published,scheduled]');
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
                    filter: 'page:true+tag:eins'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(page:true+tag:eins)+type:post');
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
                    filter: 'page:true'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(page:true)+type:post');
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
                    filter: '(page:true,page:false)'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('((page:true,page:false))+type:post');
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
            frame.options.filter.should.eql('(type:post)+status:[draft,published,scheduled]');
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
        describe('Ensure relative urls are returned for standard image urls', function () {
            describe('no subdir', function () {
                let sandbox;

                after(function () {
                    sandbox.restore();
                });

                before(function () {
                    sandbox = sinon.createSandbox();
                    urlUtils.stubUrlUtils({url: 'https://mysite.com'}, sandbox);
                });

                it('when mobiledoc contains an absolute URL to image', function () {
                    const apiConfig = {};
                    const frame = {
                        options: {
                            context: {
                                user: 0,
                                api_key: {
                                    id: 1,
                                    type: 'content'
                                }
                            }
                        },
                        data: {
                            posts: [
                                {
                                    id: 'id1',
                                    mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"https://mysite.com/content/images/2019/02/image.jpg"}]]}'
                                }
                            ]
                        }
                    };

                    serializers.input.posts.edit(apiConfig, frame);

                    let postData = frame.data.posts[0];
                    postData.mobiledoc.should.equal('{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"/content/images/2019/02/image.jpg"}]]}');
                });

                it('when mobiledoc contains multiple absolute URLs to images with different protocols', function () {
                    const apiConfig = {};
                    const frame = {
                        options: {
                            context: {
                                user: 0,
                                api_key: {
                                    id: 1,
                                    type: 'content'
                                }
                            }
                        },
                        data: {
                            posts: [
                                {
                                    id: 'id1',
                                    mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"https://mysite.com/content/images/2019/02/image.jpg"}],["image",{"src":"http://mysite.com/content/images/2019/02/image.png"}]]'
                                }
                            ]
                        }
                    };

                    serializers.input.posts.edit(apiConfig, frame);

                    let postData = frame.data.posts[0];
                    postData.mobiledoc.should.equal('{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"/content/images/2019/02/image.jpg"}],["image",{"src":"/content/images/2019/02/image.png"}]]');
                });

                it('when blog url is without subdir', function () {
                    const apiConfig = {};
                    const frame = {
                        options: {
                            context: {
                                user: 0,
                                api_key: {
                                    id: 1,
                                    type: 'content'
                                }
                            },
                            withRelated: ['tags', 'authors']
                        },
                        data: {
                            posts: [
                                {
                                    id: 'id1',
                                    feature_image: 'https://mysite.com/content/images/image.jpg',
                                    og_image: 'https://mysite.com/mycustomstorage/images/image.jpg',
                                    twitter_image: 'https://mysite.com/blog/content/images/image.jpg',
                                    tags: [{
                                        id: 'id3',
                                        feature_image: 'http://mysite.com/content/images/image.jpg'
                                    }],
                                    authors: [{
                                        id: 'id4',
                                        name: 'Ghosty',
                                        profile_image: 'https://somestorage.com/blog/images/image.jpg'
                                    }]
                                }
                            ]
                        }
                    };
                    serializers.input.posts.edit(apiConfig, frame);
                    let postData = frame.data.posts[0];
                    postData.feature_image.should.eql('/content/images/image.jpg');
                    postData.og_image.should.eql('https://mysite.com/mycustomstorage/images/image.jpg');
                    postData.twitter_image.should.eql('https://mysite.com/blog/content/images/image.jpg');
                    postData.tags[0].feature_image.should.eql('/content/images/image.jpg');
                    postData.authors[0].profile_image.should.eql('https://somestorage.com/blog/images/image.jpg');
                });
            });

            describe('with subdir', function () {
                let sandbox;

                after(function () {
                    sandbox.restore();
                });

                before(function () {
                    sandbox = sinon.createSandbox();
                    urlUtils.stubUrlUtils({url: 'https://mysite.com/blog'}, sandbox);
                });

                it('when blog url is with subdir', function () {
                    const apiConfig = {};
                    const frame = {
                        options: {
                            context: {
                                user: 0,
                                api_key: {
                                    id: 1,
                                    type: 'content'
                                }
                            },
                            withRelated: ['tags', 'authors']
                        },
                        data: {
                            posts: [
                                {
                                    id: 'id1',
                                    feature_image: 'https://mysite.com/blog/content/images/image.jpg',
                                    og_image: 'https://mysite.com/content/images/image.jpg',
                                    twitter_image: 'https://mysite.com/mycustomstorage/images/image.jpg',
                                    tags: [{
                                        id: 'id3',
                                        feature_image: 'http://mysite.com/blog/mycustomstorage/content/images/image.jpg'
                                    }],
                                    authors: [{
                                        id: 'id4',
                                        name: 'Ghosty',
                                        profile_image: 'https://somestorage.com/blog/content/images/image.jpg'
                                    }]
                                }
                            ]
                        }
                    };
                    serializers.input.posts.edit(apiConfig, frame);
                    let postData = frame.data.posts[0];
                    postData.feature_image.should.eql('/blog/content/images/image.jpg');
                    postData.og_image.should.eql('https://mysite.com/content/images/image.jpg');
                    postData.twitter_image.should.eql('https://mysite.com/mycustomstorage/images/image.jpg');
                    postData.tags[0].feature_image.should.eql('http://mysite.com/blog/mycustomstorage/content/images/image.jpg');
                    postData.authors[0].profile_image.should.eql('https://somestorage.com/blog/content/images/image.jpg');
                });
            });
        });

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
});
