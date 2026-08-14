import assert from 'node:assert/strict';
import sinon from 'sinon';
import type {EmailAddressService} from '../../../../../core/server/services/email-address/email-address-service';
import {validateEmailSenderFields} from '../../../../../core/server/api/endpoints/utils/validate-email-sender-fields';

type ValidationResult = ReturnType<EmailAddressService['validate']>;

function buildEmailAddressService(result: ValidationResult = {
    allowed: true,
    verificationEmailRequired: false
}) {
    const validate = sinon.stub().returns(result);
    const emailAddressService: Pick<EmailAddressService, 'validate'> = {
        validate
    };

    return {
        validate,
        emailAddressService
    };
}

describe('validateEmailSenderFields', function () {
    it('does not validate when sender fields are missing', function () {
        const {validate, emailAddressService} = buildEmailAddressService();

        validateEmailSenderFields(emailAddressService, {});

        sinon.assert.notCalled(validate);
    });

    it('does not validate empty sender fields', function () {
        const {validate, emailAddressService} = buildEmailAddressService();

        validateEmailSenderFields(emailAddressService, {
            sender_email: '',
            sender_reply_to: ''
        });

        sinon.assert.notCalled(validate);
    });

    it('validates sender email and reply-to with correct address types', function () {
        const {validate, emailAddressService} = buildEmailAddressService();

        validateEmailSenderFields(emailAddressService, {
            sender_email: 'sender@example.com',
            sender_reply_to: 'reply@example.com'
        });

        sinon.assert.calledTwice(validate);
        sinon.assert.calledWithExactly(validate.firstCall, 'sender@example.com', 'from');
        sinon.assert.calledWithExactly(validate.secondCall, 'reply@example.com', 'replyTo');
    });

    it('throws when sender email is not allowed', function () {
        const {emailAddressService} = buildEmailAddressService({
            allowed: false,
            verificationEmailRequired: false
        });

        assert.throws(() => {
            validateEmailSenderFields(emailAddressService, {
                sender_email: 'sender@example.com'
            });
        }, {
            name: 'ValidationError',
            message: 'You cannot set sender_email to sender@example.com'
        });
    });

    it('throws when sender reply-to requires verification', function () {
        const {emailAddressService} = buildEmailAddressService({
            allowed: true,
            verificationEmailRequired: true
        });

        assert.throws(() => {
            validateEmailSenderFields(emailAddressService, {
                sender_reply_to: 'reply@example.com'
            });
        }, {
            name: 'ValidationError',
            message: 'You cannot set sender_reply_to to reply@example.com without verification'
        });
    });
});
