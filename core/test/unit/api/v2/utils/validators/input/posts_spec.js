const _ = require('lodash');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const common = require('../../../../../../../server/lib/common');
const validators = require('../../../../../../../server/api/v2/utils/validators');

describe('Unit: v2/utils/validators/input/posts', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('add', function () {
        const apiConfig = {
            docName: 'posts'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no posts', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: []
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with more than post', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [],
                        tags: []
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail without required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [{
                            what: 'a fail'
                        }],
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [{
                            title: 'pass',
                            authors: [{id: 'correct'}]
                        }],
                    }
                };

                return validators.input.posts.add(apiConfig, frame);
            });
        });

        describe('field formats', function () {
            const fieldMap = {
                title: [123, new Date(), _.repeat('a', 2001)],
                slug: [123, new Date(), _.repeat('a', 192)],
                mobiledoc: [123, new Date()],
                feature_image: [123, new Date(), 'abc'],
                featured: [123, new Date(), 'abc'],
                page: [123, new Date(), 'abc'],
                status: [123, new Date(), 'abc'],
                locale: [123, new Date(), _.repeat('a', 7)],
                visibility: [123, new Date(), 'abc'],
                meta_title: [123, new Date(), _.repeat('a', 301)],
                meta_description: [123, new Date(), _.repeat('a', 501)],
            };

            Object.keys(fieldMap).forEach(key => {
                it(`should fail for bad ${key}`, function () {
                    const badValues = fieldMap[key];

                    const checks = badValues.map((value) => {
                        const post = {};
                        post[key] = value;

                        if (key !== 'title') {
                            post.title = 'abc';
                        }

                        const frame = {
                            options: {},
                            data: {
                                posts: [post]
                            }
                        };

                        return validators.input.posts.add(apiConfig, frame)
                            .then(Promise.reject)
                            .catch((err) => {
                                (err instanceof common.errors.ValidationError).should.be.true();
                            });
                    });

                    return Promise.all(checks);
                });
            });
        });

        describe('authors structure', function () {
            it('should require properties', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: {}
                            }
                        ]
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should require id', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: [{
                                    name: 'hey'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: [{
                                    id: 'correct',
                                    name: 'ja'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.add(apiConfig, frame);
            });
        });
    });

    describe('edit', function () {
        const apiConfig = {
            docName: 'posts'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no posts', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: []
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with more than post', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [],
                        tags: []
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with some fields', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [{
                            title: 'pass'
                        }],
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });
        });

        describe('authors structure', function () {
            it('should require properties', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: {}
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should require id', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: [{
                                    name: 'hey'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with valid authors', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: [{
                                    id: 'correct',
                                    name: 'ja'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });

            it('should pass without authors', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool'
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });
        });
    });
});
