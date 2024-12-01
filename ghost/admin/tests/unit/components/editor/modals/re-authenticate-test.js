import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Re-authenticate error handling', function () {
    setupTest();

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
}); 