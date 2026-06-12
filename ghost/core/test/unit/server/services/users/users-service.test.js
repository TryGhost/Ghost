const assert = require('node:assert/strict');
const sinon = require('sinon');

const DomainEvents = require('@tryghost/domain-events/lib/DomainEvents');
const Users = require('../../../../../core/server/services/users');

describe('Users service', function () {
    describe('lockAll', function () {
        function makeUser({email = 'test_email@example.com', status = 'active'} = {}) {
            const user = {
                status,
                locked: false,
                passwordRotated: false,
                lock() {
                    // Mirror the model: rotate the password on every user,
                    // transition to `locked` unless already inactive.
                    this.passwordRotated = true;
                    if (this.status !== 'inactive') {
                        this.status = 'locked';
                    }
                    this.locked = true;
                    return Promise.resolve();
                },
                get(key) {
                    if (key === 'email') {
                        return email;
                    }
                    if (key === 'status') {
                        return this.status;
                    }
                    return undefined;
                }
            };
            return user;
        }

        function makeService({users} = {users: [makeUser()]}) {
            const findAll = () => Promise.resolve({models: users});

            return new Users({
                dbBackup: {backup: sinon.stub().resolves()},
                models: {
                    Base: {transaction: cb => cb('fake_transaction')},
                    User: {findAll}
                },
                auth: {
                    passwordreset: {
                        generateToken: sinon.stub().resolves('secret_fake_token'),
                        sendResetNotification: sinon.stub().resolves()
                    }
                },
                apiMail: 'fake_api_mail',
                apiSettings: 'fake_api_settings'
            });
        }

        it('locks every user', async function () {
            const a = makeUser({email: 'a@example.com'});
            const b = makeUser({email: 'b@example.com'});
            const usersService = makeService({users: [a, b]});

            const result = await usersService.lockAll({context: {}});

            assert.equal(result.count, 2);
            assert.equal(a.locked, true);
            assert.equal(b.locked, true);
        });

        it('does not proactively send any reset emails', async function () {
            const usersService = makeService({
                users: [makeUser({email: 'a@example.com'}), makeUser({email: 'b@example.com'})]
            });

            await usersService.lockAll({context: {}});

            sinon.assert.notCalled(usersService.auth.passwordreset.generateToken);
            sinon.assert.notCalled(usersService.auth.passwordreset.sendResetNotification);
        });

        it('returns count=0 when no users match', async function () {
            const usersService = makeService({users: []});

            const result = await usersService.lockAll({context: {}});

            assert.equal(result.count, 0);
        });

        it('rotates passwords on suspended users while preserving suspension', async function () {
            const active = makeUser({email: 'active@example.com', status: 'active'});
            const suspended = makeUser({email: 'suspended@example.com', status: 'inactive'});
            const usersService = makeService({users: [active, suspended]});

            const result = await usersService.lockAll({context: {}});

            assert.equal(result.count, 2);
            assert.equal(active.status, 'locked', 'active users transition to locked');
            assert.equal(active.passwordRotated, true);
            assert.equal(suspended.status, 'inactive', 'suspended users stay suspended');
            assert.equal(suspended.passwordRotated, true, 'suspended users still get their password rotated so a compromised credential cannot survive a future unsuspend');
        });

        it('reuses an outer transaction when one is provided', async function () {
            const a = makeUser({email: 'a@example.com'});
            const usersService = makeService({users: [a]});

            let openedOwnTx = false;
            usersService.models.Base.transaction = (cb) => {
                openedOwnTx = true;
                return cb('fake_transaction');
            };

            const result = await usersService.lockAll({context: {}, transacting: 'outer-tx'});

            assert.equal(result.count, 1);
            assert.equal(a.locked, true);
            assert.equal(openedOwnTx, false, 'no inner transaction is opened when one is passed in');
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
