import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name', 'senderName', 'senderEmail', 'senderReplyTo'],

    name(model) {
        if (isBlank(model.name)) {
            model.errors.add('name', 'Please enter a name.');
            this.invalidate();
        }

        if (!validator.isLength(model.name || '', 0, 191)) {
            model.errors.add('name', 'Cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.hasValidated.addObject('name');
    },

    senderName(model) {
        if (!validator.isLength(model.senderName || '', 0, 191)) {
            model.errors.add('senderName', 'Cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.hasValidated.addObject('senderName');
    },

    senderEmail(model) {
        if (model.senderEmail && !validator.isEmail(model.senderEmail)) {
            model.errors.add('senderEmail', 'Invalid email.');
            this.invalidate();
        }

        if (!validator.isLength(model.senderEmail || '', 0, 191)) {
            model.errors.add('senderEmail', 'Cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.hasValidated.addObject('senderEmail');
    },

    senderReplyTo(model) {
        if (isBlank(model.senderReplyTo)) {
            model.errors.add('senderReplyTo', 'Please enter a reply-to email address.');
            this.invalidate();
        }

        if (!validator.isIn(model.senderReplyTo, ['newsletter', 'support'])) {
            model.errors.add('senderReplyTo', 'Can only be set to "newsletter" or "support".');
            this.invalidate();
        }

        model.hasValidated.addObject('senderReplyTo');
    },

    visibility(model) {
        if (isBlank(model.visibility)) {
            model.errors.add('visibility', 'Please enter visibility.');
            this.invalidate();
        }

        if (!validator.isIn(model.senderReplyTo, ['members', 'paid'])) {
            model.errors.add('visibility', 'Can only be set to "members" or "paid".');
            this.invalidate();
        }

        model.hasValidated.addObject('visibility');
    }
});
