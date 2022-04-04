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
            model.errors.add('name', 'Name cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.hasValidated.addObject('name');
    },

    senderName(model) {
        if (isBlank(model.senderName)) {
            model.errors.add('senderName', 'Please enter a sender name.');
            this.invalidate();
        }

        if (!validator.isLength(model.senderName || '', 0, 191)) {
            model.errors.add('senderName', 'Sender name cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.hasValidated.addObject('senderName');
    },

    senderEmail(model) {
        if (isBlank(model.senderEmail)) {
            model.errors.add('senderEmail', 'Please enter a newsletter email address.');
            this.invalidate();
        } else if (!validator.isEmail(model.senderEmail)) {
            model.errors.add('senderEmail', 'Invalid email.');
            this.invalidate();
        }

        if (!validator.isLength(model.senderEmail || '', 0, 191)) {
            model.errors.add('senderEmail', 'Sender email cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.hasValidated.addObject('senderEmail');
    },

    senderReplyTo(model) {
        if (isBlank(model.senderReplyTo)) {
            model.errors.add('senderReplyTo', 'Please enter a reply-to email address.');
            this.invalidate();
        } else if (!validator.isEmail(model.senderReplyTo)) {
            model.errors.add('senderReplyTo', 'Invalid email.');
            this.invalidate();
        }

        if (!validator.isLength(model.senderReplyTo || '', 0, 191)) {
            model.errors.add('senderReplyTo', 'Reply-to email cannot be longer than 191 characters.');
            this.invalidate();
        }

        model.hasValidated.addObject('senderReplyTo');
    }
});
