const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');
const configUtils = require('../../../../../../utils/configUtils');

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
                        },
                    }
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('page:false');
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
            should.equal(frame.options.filter, undefined);
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
                        },
                    },
                    filter: 'status:published+tag:eins'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(status:published+tag:eins)+page:false');
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
                        },
                    },
                    filter: 'page:true+tag:eins'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(page:true+tag:eins)+page:false');
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
                        },
                    },
                    filter: 'page:true'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(page:true)+page:false');
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
                        },
                    },
                    filter: '(page:true,page:false)'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('((page:true,page:false))+page:false');
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
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
        it('with apiType of "content" it sets data.page to false', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {},
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.data.page.should.eql(false);
        });

        it('with apiType of "content" it overrides data.page to be false', function () {
            const apiConfig = {};
            const frame = {
                apiType: 'content',
                options: {},
                data: {
                    status: 'all',
                    page: true
                }
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.data.page.should.eql(false);
        });

        it('with apiType of "admin" it does not set data.page', function () {
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
            should.not.exist(frame.data.page);
        });

        it('with non public request it does not override data.page', function () {
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
                data: {
                    page: true
                }
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.data.page.should.eql(true);
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
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
            after(function () {
                configUtils.restore();
            });

            it('when mobiledoc contains an absolute URL to image', function () {
                configUtils.set({url: 'https://mysite.com'});
                const apiConfig = {};
                const frame = {
                    options: {
                        context: {
                            user: 0,
                            api_key: {
                                id: 1,
                                type: 'content'
                            },
                        },
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
                configUtils.set({url: 'https://mysite.com'});
                const apiConfig = {};
                const frame = {
                    options: {
                        context: {
                            user: 0,
                            api_key: {
                                id: 1,
                                type: 'content'
                            },
                        },
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
                configUtils.set({url: 'https://mysite.com'});
                const apiConfig = {};
                const frame = {
                    options: {
                        context: {
                            user: 0,
                            api_key: {
                                id: 1,
                                type: 'content'
                            },
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

            it('when blog url is with subdir', function () {
                configUtils.set({url: 'https://mysite.com/blog'});
                const apiConfig = {};
                const frame = {
                    options: {
                        context: {
                            user: 0,
                            api_key: {
                                id: 1,
                                type: 'content'
                            },
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

        describe('Ensure html to mobiledoc conversion', function () {
            before(function () {
                // NOTE: only supported in node v8 and higher
                if (process.version.startsWith('v6.')) {
                    this.skip();
                }
            });

            it('no transformation when no html source option provided', function () {
                const apiConfig = {};
                const mobiledoc = '{"version":"0.3.1","atoms":[],"cards":[],"sections":[]}';
                const frame = {
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
        });
    });
});
