const should = require('should'),
    common = require('../../../../server/lib/common'),
    validate = require('../../../../server/services/settings/validate');

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
            (err instanceof common.errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('throws error when using :\w+ notiation in taxonomies', function () {
        try {
            validate({
                taxonomies: {
                    tags: '/categories/:slug/'
                }
            });
        } catch (err) {
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
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
            (err instanceof common.errors.ValidationError).should.be.true();
            return;
        }

        throw new Error('should fail');
    });

    it('no validation error for {globals.permalinks}', function () {
        const object = validate({
            collections: {
                '/magic/': {
                    permalink: '{globals.permalinks}'
                }
            }
        });

        object.should.eql({
            taxonomies: {},
            routes: {},
            collections: {
                '/magic/': {
                    permalink: '{globals.permalinks}',
                    templates: []
                }
            }
        });
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
                tags: '/tags/{slug}/',
                author: '/authors/{slug}/',
            }
        });

        object.should.eql({
            routes: {},
            taxonomies: {
                tags: '/tags/:slug/',
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
});
