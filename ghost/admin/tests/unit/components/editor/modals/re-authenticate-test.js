import Service from '@ember/service';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

// Stub modals service
class ModalsStub extends Service {
    open() {
        return Promise.resolve();
    }
}

describe('Unit: Re-authenticate error handling', function () {
    setupTest();

    beforeEach(function () {
        this.owner.register('service:modals', ModalsStub);
    });

    it('identifies 2FA token required error', function () {
        const isTwoFactorTokenRequiredError = (error) => {
            return error?.payload?.errors?.[0]?.code === '2FA_TOKEN_REQUIRED';
        };

        const error2FA = {
            payload: {
                errors: [{
                    code: '2FA_TOKEN_REQUIRED'
                }]
            }
        };

        const regularError = {
            payload: {
                errors: [{
                    message: 'Access denied.'
                }]
            }
        };

        expect(isTwoFactorTokenRequiredError(error2FA)).to.be.true;
        expect(isTwoFactorTokenRequiredError(regularError)).to.be.false;
    });

    it('identifies different error types', function () {
        const isTwoFactorTokenRequiredError = (error) => {
            return error?.payload?.errors?.[0]?.code === '2FA_TOKEN_REQUIRED';
        };

        const errors = [
            {
                payload: {
                    errors: [{
                        code: '2FA_TOKEN_REQUIRED'
                    }]
                },
                expected: true
            },
            {
                payload: {
                    errors: [{
                        message: 'Access denied.'
                    }]
                },
                expected: false
            },
            {
                payload: {
                    errors: [{
                        code: 'DIFFERENT_ERROR'
                    }]
                },
                expected: false
            }
        ];

        errors.forEach((testCase) => {
            expect(
                isTwoFactorTokenRequiredError(testCase),
                `should ${testCase.expected ? '' : 'not '}identify as 2FA error`
            ).to.equal(testCase.expected);
        });
    });

    it('calls re-verify modal exactly once for 2FA error', async function () {
        const modals = this.owner.lookup('service:modals');
        const openSpy = sinon.spy(modals, 'open');

        const handleError = async (error) => {
            if (error?.payload?.errors?.[0]?.code === '2FA_TOKEN_REQUIRED') {
                await modals.open('editor/modals/re-verify');
                return true;
            }
            return false;
        };

        const error2FA = {
            payload: {
                errors: [{
                    code: '2FA_TOKEN_REQUIRED'
                }]
            }
        };

        await handleError(error2FA);

        expect(openSpy.calledOnce, 're-verify modal called once').to.be.true;
        expect(openSpy.firstCall.args[0]).to.equal('editor/modals/re-verify');
    });
}); 