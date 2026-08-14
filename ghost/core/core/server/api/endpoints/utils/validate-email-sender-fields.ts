import errors from '@tryghost/errors';
import type {EmailAddressService} from '../../../services/email-address/email-address-service';
import type {ReadonlyDeep} from 'type-fest';

const EMAIL_VALIDATIONS = [
    {
        field: 'sender_email',
        addressType: 'from'
    },
    {
        field: 'sender_reply_to',
        addressType: 'replyTo'
    }
] as const;

export function validateEmailSenderFields(
    emailAddressService: Pick<EmailAddressService, 'validate'>,
    data: ReadonlyDeep<{
        sender_email?: string;
        sender_reply_to?: string;
    }>
): void {
    for (const {field, addressType} of EMAIL_VALIDATIONS) {
        const value = data[field];
        if (!value) {
            continue;
        }

        const validated = emailAddressService.validate(value, addressType);
        if (!validated.allowed) {
            throw new errors.ValidationError({
                message: `You cannot set ${field} to ${value}`
            });
        }

        if (validated.verificationEmailRequired) {
            throw new errors.ValidationError({
                message: `You cannot set ${field} to ${value} without verification`
            });
        }
    }
}
