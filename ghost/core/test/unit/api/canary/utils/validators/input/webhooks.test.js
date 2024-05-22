const _ = require('lodash');
const should = require('should');
const sinon = require('sinon');
const validators = require('../../../../../../../core/server/api/endpoints/utils/validators');

describe('Unit: endpoints/utils/validators/input/webhooks', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('add', function () {
        const apiConfig = {
            docName: 'webhooks',
            method: 'add'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.webhooks.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should fail with no webhooks', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: []
                    }
                };

                return validators.input.webhooks.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should fail with no webhooks in array', function () {
                const frame = {
                    options: {},
                    data: {
                        webhooks: []
                    }
                };

                return validators.input.webhooks.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should fail with more than webhooks', function () {
                const frame = {
                    options: {},
                    data: {
                        webhooks: [],
                        posts: []
                    }
                };

                return validators.input.webhooks.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should fail without required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        webhooks: [{
                            what: 'a fail'
                        }]
                    }
                };

                return validators.input.webhooks.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should pass with required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        webhooks: [{
                            integration_id: '123',
                            event: 'post.edited',
                            target_url: 'https://example.com'
                        }]
                    }
                };

                return validators.input.webhooks.add(apiConfig, frame);
            });

            it('should remove `strip`able fields and leave regular fields', function () {
                const frame = {
                    options: {},
                    data: {
                        webhooks: [{
                            name: 'pass',
                            target_url: 'https://example.com/target/1',
                            event: 'post.published',
                            integration_id: '1234',
                            id: 'strip me',
                            status: 'strip me',
                            last_triggered_at: 'strip me',
                            last_triggered_status: 'strip me',
                            last_triggered_error: 'strip me',
                            created_at: 'strip me',
                            created_by: 'strip me',
                            updated_at: 'strip me',
                            updated_by: 'strip me'
                        }]
                    }
                };

                validators.input.webhooks.add(apiConfig, frame);

                frame.data.webhooks[0].name.should.equal('pass');
                frame.data.webhooks[0].target_url.should.equal('https://example.com/target/1');
                frame.data.webhooks[0].event.should.equal('post.published');
                frame.data.webhooks[0].integration_id.should.equal('1234');
                should.not.exist(frame.data.webhooks[0].status);
                should.not.exist(frame.data.webhooks[0].last_triggered_at);
                should.not.exist(frame.data.webhooks[0].last_triggered_status);
                should.not.exist(frame.data.webhooks[0].last_triggered_error);
                should.not.exist(frame.data.webhooks[0].created_at);
                should.not.exist(frame.data.webhooks[0].created_by);
                should.not.exist(frame.data.webhooks[0].updated_at);
                should.not.exist(frame.data.webhooks[0].updated_by);
            });
        });

        describe('field formats', function () {
            const fieldMap = {
                name: [123, new Date(), '', _.repeat('a', 192), null],
                secret: [123, new Date(), _.repeat('a', 192)],
                api_version: [123, new Date(), _.repeat('a', 51)],
                integration_id: [123, new Date(), 'not uri']
            };

            Object.keys(fieldMap).forEach((key) => {
                it(`should fail for bad ${key}`, function () {
                    const badValues = fieldMap[key];

                    const checks = badValues.map((value) => {
                        const webhook = {};
                        webhook[key] = value;

                        if (key !== 'name') {
                            webhook.name = 'abc';
                        }

                        const frame = {
                            options: {},
                            data: {
                                webhooks: [webhook]
                            }
                        };

                        return validators.input.webhooks.add(apiConfig, frame)
                            .then(Promise.reject)
                            .catch((err) => {
                                err.errorType.should.equal('ValidationError');
                            });
                    });

                    return Promise.all(checks);
                });
            });
        });
    });

    describe('edit', function () {
        const apiConfig = {
            docName: 'webhooks',
            method: 'edit'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.webhooks.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should fail with no webhooks', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: []
                    }
                };

                return validators.input.webhooks.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should fail with more than webhooks', function () {
                const frame = {
                    options: {},
                    data: {
                        webhooks: [],
                        posts: []
                    }
                };

                return validators.input.webhooks.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        err.errorType.should.equal('ValidationError');
                    });
            });

            it('should pass with required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        webhooks: [{
                            target_url: 'https://example.com/target/1',
                            event: 'post.published',
                            integration_id: '1234'
                        }]
                    }
                };

                return validators.input.webhooks.edit(apiConfig, frame);
            });
        });
    });
});
