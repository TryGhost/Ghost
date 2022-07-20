const should = require('should');
const errors = require('@tryghost/errors');
const validate = require('../../../../../core/server/services/route-settings/validate');

should.equal(true, true);

describe('UNIT: services/settings/validate', function () {
    it('no type definitions / empty yaml file', function () {
        const object = validate({});

        object.should.eql({collections: {}, routes: {}, taxonomies: {}});
    });

    it('throws error when using :\w+ notiation in collection', function () {
        try {
            validate({
                collections: {
                    '/magic/': {
                        permalink: '/magic/{slug}/'
                    },
                    '/': {
                        permalink: '/:slug/'
                    }
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error when using :\w+ notiation in taxonomies', function () {
        try {
            validate({
                taxonomies: {
                    tag: '/categories/:slug/'
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error when using an undefined taxonomy', function () {
        try {
            validate({
                taxonomies: {
                    sweet_baked_good: '/patisserie/{slug}'
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error when permalink is missing (collection)', function () {
        try {
            validate({
                collections: {
                    permalink: '/{slug}/'
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                routes: {
                    about: 'about'
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                routes: {
                    '/about': 'about'
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                routes: {
                    'about/': 'about'
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                collections: {
                    'magic/': {
                        permalink: '/{slug}/'
                    }
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                collections: {
                    magic: {
                        permalink: '/{slug}/'
                    }
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                collections: {
                    '/magic': {
                        permalink: '/{slug}/'
                    }
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                collections: {
                    '/magic/': {
                        permalink: '/{slug}'
                    }
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error without leading or trailing slashes', function () {
        try {
            validate({
                collections: {
                    '/magic/': {
                        permalink: '{slug}'
                    }
                }
            });
        } catch (err) {
            (err instanceof errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('no validation error for routes', function () {
        validate({
            routes: {
                '/': 'home'
            }
        });
    });

    it('no validation error for / collection', function () {
        validate({
            collections: {
                '/': {
                    permalink: '/{primary_tag}/{slug}/'
                }
            }
        });
    });

    it('transforms {.*} notation into :\w+', function () {
        const object = validate({
            collections: {
                '/magic/': {
                    permalink: '/magic/{year}/{slug}/'
                },
                '/': {
                    permalink: '/{slug}/'
                }
            },
            taxonomies: {
                tag: '/tags/{slug}/',
                author: '/authors/{slug}/'
            }
        });

        object.should.eql({
            routes: {},
            taxonomies: {
                tag: '/tags/:slug/',
                author: '/authors/:slug/'
            },
            collections: {
                '/magic/': {
                    permalink: '/magic/:year/:slug/',
                    templates: []
                },
                '/': {
                    permalink: '/:slug/',
                    templates: []
                }
            }
        });
    });

    describe('template definitions', function () {
        it('single value', function () {
            const object = validate({
                routes: {
                    '/about/': 'about',
                    '/me/': {
                        template: 'me'
                    }
                },
                collections: {
                    '/': {
                        permalink: '/{slug}/',
                        template: 'test'
                    }
                }
            });

            object.should.eql({
                taxonomies: {},
                routes: {
                    '/about/': {
                        templates: ['about']
                    },
                    '/me/': {
                        templates: ['me']
                    }
                },
                collections: {
                    '/': {
                        permalink: '/:slug/',
                        templates: ['test']
                    }
                }
            });
        });

        it('array', function () {
            const object = validate({
                routes: {
                    '/about/': 'about',
                    '/me/': {
                        template: ['me']
                    }
                },
                collections: {
                    '/': {
                        permalink: '/{slug}/',
                        template: ['test']
                    }
                }
            });

            object.should.eql({
                taxonomies: {},
                routes: {
                    '/about/': {
                        templates: ['about']
                    },
                    '/me/': {
                        templates: ['me']
                    }
                },
                collections: {
                    '/': {
                        permalink: '/:slug/',
                        templates: ['test']
                    }
                }
            });
        });
    });

    describe('data definitions', function () {
        it('shortform', function () {
            const object = validate({
                routes: {
                    '/food/': {
                        data: 'tag.food'
                    },
                    '/music/': {
                        data: 'tag.music'
                    },
                    '/ghost/': {
                        data: 'author.ghost'
                    },
                    '/sleep/': {
                        data: {
                            bed: 'tag.bed',
                            dream: 'tag.dream'
                        }
                    },
                    '/lala/': {
                        data: 'author.carsten'
                    }
                },
                collections: {
                    '/more/': {
                        permalink: '/{slug}/',
                        data: {
                            home: 'page.home'
                        }
                    },
                    '/podcast/': {
                        permalink: '/podcast/{slug}/',
                        data: {
                            something: 'tag.something'
                        }
                    },
                    '/': {
                        permalink: '/{slug}/',
                        data: 'tag.sport'
                    }
                }
            });

            object.should.eql({
                taxonomies: {},
                routes: {
                    '/food/': {
                        data: {
                            query: {
                                tag: {
                                    controller: 'tagsPublic',
                                    resource: 'tags',
                                    type: 'read',
                                    options: {
                                        slug: 'food',
                                        visibility: 'public'
                                    }
                                }
                            },
                            router: {
                                tags: [{redirect: true, slug: 'food'}]
                            }
                        },
                        templates: []
                    },
                    '/ghost/': {
                        data: {
                            query: {
                                author: {
                                    controller: 'authorsPublic',
                                    resource: 'authors',
                                    type: 'read',
                                    options: {
                                        slug: 'ghost'
                                    }
                                }
                            },
                            router: {
                                authors: [{redirect: true, slug: 'ghost'}]
                            }
                        },
                        templates: []
                    },
                    '/music/': {
                        data: {
                            query: {
                                tag: {
                                    controller: 'tagsPublic',
                                    resource: 'tags',
                                    type: 'read',
                                    options: {
                                        slug: 'music',
                                        visibility: 'public'
                                    }
                                }
                            },
                            router: {
                                tags: [{redirect: true, slug: 'music'}]
                            }
                        },
                        templates: []
                    },
                    '/sleep/': {
                        data: {
                            query: {
                                bed: {
                                    controller: 'tagsPublic',
                                    resource: 'tags',
                                    type: 'read',
                                    options: {
                                        slug: 'bed',
                                        visibility: 'public'
                                    }
                                },
                                dream: {
                                    controller: 'tagsPublic',
                                    resource: 'tags',
                                    type: 'read',
                                    options: {
                                        slug: 'dream',
                                        visibility: 'public'
                                    }
                                }
                            },
                            router: {
                                tags: [{redirect: true, slug: 'bed'}, {redirect: true, slug: 'dream'}]
                            }
                        },
                        templates: []
                    },
                    '/lala/': {
                        data: {
                            query: {
                                author: {
                                    controller: 'authorsPublic',
                                    resource: 'authors',
                                    type: 'read',
                                    options: {
                                        slug: 'carsten'
                                    }
                                }
                            },
                            router: {
                                authors: [{redirect: true, slug: 'carsten'}]
                            }
                        },
                        templates: []
                    }
                },
                collections: {
                    '/more/': {
                        permalink: '/:slug/',
                        data: {
                            query: {
                                home: {
                                    controller: 'pagesPublic',
                                    resource: 'pages',
                                    type: 'read',
                                    options: {
                                        slug: 'home'
                                    }
                                }
                            },
                            router: {
                                pages: [{redirect: true, slug: 'home'}]
                            }
                        },
                        templates: []
                    },
                    '/podcast/': {
                        permalink: '/podcast/:slug/',
                        data: {
                            query: {
                                something: {
                                    controller: 'tagsPublic',
                                    resource: 'tags',
                                    type: 'read',
                                    options: {
                                        slug: 'something',
                                        visibility: 'public'
                                    }
                                }
                            },
                            router: {
                                tags: [{redirect: true, slug: 'something'}]
                            }
                        },
                        templates: []
                    },
                    '/': {
                        permalink: '/:slug/',
                        data: {
                            query: {
                                tag: {
                                    controller: 'tagsPublic',
                                    resource: 'tags',
                                    type: 'read',
                                    options: {
                                        slug: 'sport',
                                        visibility: 'public'
                                    }
                                }
                            },
                            router: {
                                tags: [{redirect: true, slug: 'sport'}]
                            }
                        },
                        templates: []
                    }
                }
            });
        });

        it('longform', function () {
            const object = validate({
                routes: {
                    '/food/': {
                        data: {
                            food: {
                                resource: 'posts',
                                type: 'browse'
                            }
                        }
                    },
                    '/wellness/': {
                        data: {
                            posts: {
                                resource: 'posts',
                                type: 'read',
                                redirect: false
                            }
                        }
                    },
                    '/partyparty/': {
                        data: {
                            people: {
                                resource: 'authors',
                                type: 'read',
                                slug: 'djgutelaune',
                                redirect: true
                            }
                        }
                    }
                },
                collections: {
                    '/yoga/': {
                        permalink: '/{slug}/',
                        data: {
                            gym: {
                                resource: 'posts',
                                type: 'read',
                                slug: 'ups',
                                status: 'draft'
                            }
                        }
                    }
                }
            });

            object.should.eql({
                taxonomies: {},
                routes: {
                    '/food/': {
                        data: {
                            query: {
                                food: {
                                    controller: 'postsPublic',
                                    resource: 'posts',
                                    type: 'browse',
                                    options: {}
                                }
                            },
                            router: {
                                posts: [{redirect: true}]
                            }
                        },
                        templates: []
                    },
                    '/wellness/': {
                        data: {
                            query: {
                                posts: {
                                    controller: 'postsPublic',
                                    resource: 'posts',
                                    type: 'read',
                                    options: {
                                        slug: '%s'
                                    }
                                }
                            },
                            router: {
                                posts: [{redirect: false}]
                            }
                        },
                        templates: []
                    },
                    '/partyparty/': {
                        data: {
                            query: {
                                people: {
                                    controller: 'authorsPublic',
                                    resource: 'authors',
                                    type: 'read',
                                    options: {
                                        slug: 'djgutelaune'
                                    }
                                }
                            },
                            router: {
                                authors: [{redirect: true, slug: 'djgutelaune'}]
                            }
                        },
                        templates: []
                    }
                },
                collections: {
                    '/yoga/': {
                        permalink: '/:slug/',
                        data: {
                            query: {
                                gym: {
                                    controller: 'postsPublic',
                                    resource: 'posts',
                                    type: 'read',
                                    options: {
                                        slug: 'ups',
                                        status: 'draft'
                                    }
                                }
                            },
                            router: {
                                posts: [{redirect: true, slug: 'ups'}]
                            }
                        },
                        templates: []
                    }
                }
            });
        });

        it('errors: data shortform incorrect', function () {
            try {
                validate({
                    collections: {
                        '/magic/': {
                            permalink: '/{slug}/',
                            data: 'tag:test'
                        }
                    }
                });
            } catch (err) {
                (err instanceof errors.ValidationError).should.be.true();
                return;
            }

            throw new Error('should fail');
        });

        it('errors: data longform resource is missing', function () {
            try {
                validate({
                    collections: {
                        '/magic/': {
                            permalink: '/{slug}/',
                            data: {
                                type: 'edit'
                            }
                        }
                    }
                });
            } catch (err) {
                (err instanceof errors.ValidationError).should.be.true();
                return;
            }

            throw new Error('should fail');
        });

        it('errors: data longform type is missing', function () {
            try {
                validate({
                    collections: {
                        '/magic/': {
                            permalink: '/{slug}/',
                            data: {
                                resource: 'subscribers'
                            }
                        }
                    }
                });
            } catch (err) {
                (err instanceof errors.ValidationError).should.be.true();
                return;
            }

            throw new Error('should fail');
        });

        it('errors: data longform name is author', function () {
            try {
                validate({
                    collections: {
                        '/magic/': {
                            permalink: '/{slug}/',
                            data: {
                                author: {
                                    resource: 'users'
                                }
                            }
                        }
                    }
                });
            } catch (err) {
                (err instanceof errors.ValidationError).should.be.true();
                return;
            }

            throw new Error('should fail');
        });

        it('errors: data longform does not use a custom name at all', function () {
            try {
                validate({
                    collections: {
                        '/magic/': {
                            permalink: '/{slug}/',
                            data: {
                                resource: 'users'
                            }
                        }
                    }
                });
            } catch (err) {
                (err instanceof errors.ValidationError).should.be.true();
                return;
            }

            throw new Error('should fail');
        });
    });
});
