import logging from '@tryghost/logging';
import {EmailAddress, EmailAddressParser} from './EmailAddressParser';

export type EmailAddresses = {
    from: EmailAddress,
    replyTo?: EmailAddress
}

export type EmailAddressesValidation = {
    allowed: boolean,
    verificationEmailRequired: boolean,
    reason?: string
}

export type EmailAddressType = 'from' | 'replyTo';

type LabsService = {
    isSet: (flag: string) => boolean
}

export class EmailAddressService {
    #getManagedEmailEnabled: () => boolean;
    #getSendingDomain: () => string | null;
    #getDefaultEmail: () => EmailAddress;
    #isValidEmailAddress: (email: string) => boolean;
    #labs: LabsService;

    constructor(dependencies: {
        getManagedEmailEnabled: () => boolean,
        getSendingDomain: () => string | null,
        getDefaultEmail: () => EmailAddress,
        isValidEmailAddress: (email: string) => boolean,
        labs: LabsService

    }) {
        this.#getManagedEmailEnabled = dependencies.getManagedEmailEnabled;
        this.#getSendingDomain = dependencies.getSendingDomain;
        this.#getDefaultEmail = dependencies.getDefaultEmail;
        this.#isValidEmailAddress = dependencies.isValidEmailAddress;
        this.#labs = dependencies.labs;
    }

    get sendingDomain(): string | null {
        return this.#getSendingDomain();
    }

    get managedEmailEnabled(): boolean {
        return this.#getManagedEmailEnabled();
    }

    get defaultFromEmail(): EmailAddress {
        return this.#getDefaultEmail();
    }

    getAddressFromString(from: string, replyTo?: string): EmailAddresses {
        const parsedFrom = EmailAddressParser.parse(from);
        const parsedReplyTo = replyTo ? EmailAddressParser.parse(replyTo) : undefined;

        return this.getAddress({
            from: parsedFrom ?? this.defaultFromEmail,
            replyTo: parsedReplyTo ?? undefined
        });
    }

    /**
     * When sending an email, we should always ensure DMARC alignment.
     * Because of that, we restrict which email addresses we send from. All emails should be either
     * send from a configured domain (hostSettings.managedEmail.sendingDomains), or from the configured email address (mail.from).
     *
     * If we send an email from an email address that doesn't pass, we'll just default to the default email address,
     * and instead add a replyTo email address from the requested from address.
     */
    getAddress(preferred: EmailAddresses): EmailAddresses {
        if (preferred.replyTo && !this.#isValidEmailAddress(preferred.replyTo.address)) {
            // Remove invalid replyTo addresses
            logging.error(`[EmailAddresses] Invalid replyTo address: ${preferred.replyTo.address}`);
            preferred.replyTo = undefined;
        }

        // Validate the from address
        if (!this.#isValidEmailAddress(preferred.from.address)) {
            // Never allow an invalid email address
            return {
                from: this.defaultFromEmail,
                replyTo: preferred.replyTo || undefined
            };
        }

        if (!this.managedEmailEnabled) {
            // Self hoster or legacy Ghost Pro
            return preferred;
        }

        // Case: always allow the default from address
        if (preferred.from.address === this.defaultFromEmail.address) {
            if (!preferred.from.name) {
                // Use the default sender name if it is missing
                preferred.from.name = this.defaultFromEmail.name;
            }

            return preferred;
        }

        if (this.sendingDomain) {
            // Check if FROM address is from the sending domain
            if (preferred.from.address.endsWith(`@${this.sendingDomain}`)) {
                return preferred;
            }

            // Invalid configuration: don't allow to send from this sending domain
            logging.error(`[EmailAddresses] Invalid configuration: cannot send emails from ${preferred.from.address} when sending domain is ${this.sendingDomain}`);
        }

        // Only allow to send from the configured from address
        const address = {
            from: this.defaultFromEmail,
            replyTo: preferred.replyTo || preferred.from
        };

        // Do allow to change the sender name if requested
        if (preferred.from.name) {
            address.from.name = preferred.from.name;
        }

        if (address.replyTo.address === address.from.address) {
            return {
                from: address.from
            };
        }

        return address;
    }

    /**
     * When changing any from or reply to addresses in the system, we need to validate them
     */
    validate(email: string, type: EmailAddressType): EmailAddressesValidation {
        if (!this.#isValidEmailAddress(email)) {
            // Never allow an invalid email address
            return {
                allowed: email === this.defaultFromEmail.address, // Localhost email noreply@127.0.0.1 is marked as invalid, but we should allow it
                verificationEmailRequired: false,
                reason: 'invalid'
            };
        }

        if (!this.managedEmailEnabled) {
            // Self hoster or legacy Ghost Pro
            return {
                allowed: true,
                verificationEmailRequired: false // Self hosters don't need to verify email addresses
            };
        }

        if (this.sendingDomain) {
            // Only allow it if it ends with the sending domain
            if (email.endsWith(`@${this.sendingDomain}`)) {
                return {
                    allowed: true,
                    verificationEmailRequired: false
                };
            }

            // Use same restrictions as one without a sending domain for other addresses
        }

        // Only allow to edit the replyTo address, with verification
        if (type === 'replyTo') {
            return {
                allowed: true,
                verificationEmailRequired: email !== this.defaultFromEmail.address
            };
        }

        // Not allowed to change from
        return {
            allowed: email === this.defaultFromEmail.address,
            verificationEmailRequired: false,
            reason: 'not allowed'
        };
    }
}
