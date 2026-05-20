const assert = require('node:assert/strict');
const sinon = require('sinon');

const DomainEvents = require('@tryghost/domain-events/lib/DomainEvents');
const Users = require('../../../../../core/server/services/users');

describe('Users service', function () {
    describe('resetAllPasswords', function () {
        it('resets all user passwords', async function () {
            const userToReset = {
                save: sinon.mock().resolves(),
                get: sinon.mock().withArgs('email').returns('test_email@example.com')
            };
            const mockOptions = {
                dbBackup: {
                    backup: sinon.mock().resolves('backup/path/file.json')
                },
                models: {
                    Base: {
                        transaction: (cb) => {
                            return cb('fake_transaction');
                        }
                    },
                    User: {
                        findAll: sinon.mock().resolves([userToReset])
                    }
                },
                auth: {
                    passwordreset: {
                        generateToken: sinon.mock().resolves('secret_fake_token'),
                        sendResetNotification: sinon.mock().resolves('reset_notification_sent')
                    }
                },
                apiMail: 'fake_api_mail',
                apiSettings: 'fake_api_settings'
            };
            const usersService = new Users(mockOptions);

            await usersService.resetAllPasswords({
                context: {}
            });

            sinon.assert.calledOnce(mockOptions.auth.passwordreset.generateToken);
            assert.equal(mockOptions.auth.passwordreset.generateToken.args[0][0], 'test_email@example.com');
            assert.equal(mockOptions.auth.passwordreset.generateToken.args[0][1], 'fake_api_settings');
            assert.equal(mockOptions.auth.passwordreset.generateToken.args[0][2], 'fake_transaction');

            sinon.assert.calledOnce(mockOptions.auth.passwordreset.sendResetNotification);
            assert.equal(mockOptions.auth.passwordreset.sendResetNotification.args[0][0], 'secret_fake_token');
            assert.equal(mockOptions.auth.passwordreset.sendResetNotification.args[0][1], 'fake_api_mail');
        });
    });

    describe('assignTagToUserPosts', function () {
        let dispatchStub;

        beforeEach(function () {
            dispatchStub = sinon.stub(DomainEvents, 'dispatch');
        });

        afterEach(function () {
            dispatchStub.restore();
        });

        function createMockOptions({userPostIds, alreadyTaggedPostIds, insertedRows, addActions}) {
            return {
                dbBackup: {
                    backup: sinon.mock().resolves('backup/path/file.json')
                },
                models: {
                    Base: {
                        knex: (tableName) => {
                            if (tableName === 'posts_authors') {
                                return {
                                    transacting() {
                                        return this;
                                    },
                                    where() {
                                        return this;
                                    },
                                    select() {
                                        return Promise.resolve(
                                            userPostIds.map(post_id => ({post_id}))
                                        );
                                    }
                                };
                            }

                            if (tableName === 'posts_tags') {
                                return {
                                    transacting() {
                                        return this;
                                    },
                                    where() {
                                        return this;
                                    },
                                    select() {
                                        return Promise.resolve(
                                            alreadyTaggedPostIds.map(post_id => ({post_id}))
                                        );
                                    },
                                    insert(rows) {
                                        insertedRows.push(...rows);
                                        return Promise.resolve();
                                    }
                                };
                            }
                        }
                    },
                    User: {
                        findOne: sinon.stub().resolves({
                            get: sinon.stub().withArgs('slug').returns('author-slug')
                        })
                    },
                    Tag: {
                        findOne: sinon.stub().resolves({
                            get: sinon.stub().withArgs('id').returns('tag-id')
                        })
                    },
                    Post: {
                        addActions
                    }
                },
                auth: {
                    setup: {},
                    passwordreset: {}
                },
                apiMail: 'fake_api_mail',
                apiSettings: 'fake_api_settings'
            };
        }

        it('does not reinsert posts that already have the user tag', async function () {
            const insertedRows = [];
            const addActions = sinon.stub().resolves();
            const usersService = new Users(createMockOptions({
                userPostIds: ['post-1', 'post-2'],
                alreadyTaggedPostIds: ['post-2'],
                insertedRows,
                addActions
            }));

            await usersService.assignTagToUserPosts({
                id: 'user-id',
                context: {},
                transacting: {}
            });

            assert.equal(insertedRows.length, 1);
            assert.equal(insertedRows[0].post_id, 'post-1');
            assert.equal(addActions.calledOnce, true);
            assert.deepEqual(addActions.args[0][1], ['post-1']);
            assert.equal(dispatchStub.calledOnce, true);
            assert.deepEqual(dispatchStub.args[0][0].data, ['post-1']);
        });

        it('skips insert, addActions, and dispatch when every post is already tagged', async function () {
            const insertedRows = [];
            const addActions = sinon.stub().resolves();
            const usersService = new Users(createMockOptions({
                userPostIds: ['post-1', 'post-2'],
                alreadyTaggedPostIds: ['post-1', 'post-2'],
                insertedRows,
                addActions
            }));

            await usersService.assignTagToUserPosts({
                id: 'user-id',
                context: {},
                transacting: {}
            });

            assert.equal(insertedRows.length, 0);
            assert.equal(addActions.called, false);
            assert.equal(dispatchStub.called, false);
        });
    });
});
