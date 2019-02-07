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
                        (err instanceof common.errors.BadRequestError).should.be.true();
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
                        (err instanceof common.errors.BadRequestError).should.be.true();
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
            // TODO: add checks for correct format validations
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
                        (err instanceof common.errors.BadRequestError).should.be.true();
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
                        (err instanceof common.errors.BadRequestError).should.be.true();
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
                        (err instanceof common.errors.BadRequestError).should.be.true();
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
                        (err instanceof common.errors.BadRequestError).should.be.true();
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
                        (err instanceof common.errors.BadRequestError).should.be.true();
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
