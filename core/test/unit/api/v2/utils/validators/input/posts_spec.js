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
        it('authors structure', function () {
            const apiConfig = {
                docName: 'posts'
            };

            const frame = {
                options: {},
                data: {
                    posts: [
                        {
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

        it('authors structure', function () {
            const apiConfig = {
                docName: 'posts'
            };

            const frame = {
                options: {},
                data: {
                    posts: [
                        {
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

        it('authors structure', function () {
            const apiConfig = {
                docName: 'posts'
            };

            const frame = {
                options: {},
                data: {
                    posts: [
                        {
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

    describe('edit', function () {
        it('default', function () {
            sinon.stub(validators.input.posts, 'add');

            const apiConfig = {};
            const frame = {};

            validators.input.posts.edit(apiConfig, frame);
            validators.input.posts.add.calledOnce.should.be.true();
        });
    });
});
