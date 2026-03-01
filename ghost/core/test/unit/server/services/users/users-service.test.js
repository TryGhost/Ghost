const assert = require('node:assert/strict');
const sinon = require('sinon');

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
});
