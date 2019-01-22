import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name', 'event', 'targetUrl'],

    name(model) {
        if (isBlank(model.name)) {
            model.errors.add('name', 'Please enter a name');
            model.hasValidated.pushObject('name');
            this.invalidate();
        } else if (!validator.isLength(model.name, 0, 191)) {
            model.errors.add('name', 'Name is too long, max 191 chars');
            model.hasValidated.pushObject('name');
            this.invalidate();
        }
    },

    event(model) {
        if (isBlank(model.event)) {
            model.errors.add('event', 'Please select an event');
            model.hasValidated.pushObject('event');
            this.invalidate();
        }
    },

    targetUrl(model) {
        if (isBlank(model.targetUrl)) {
            model.errors.add('targetUrl', 'Please enter a target URL');
        } else if (!validator.isURL(model.targetUrl || '', {require_protocol: false})) {
            model.errors.add('targetUrl', 'Please enter a valid URL');
        } else if (!validator.isLength(model.targetUrl, 0, 2000)) {
            model.errors.add('targetUrl', 'Target URL is too long, max 2000 chars');
        }

        model.hasValidated.pushObject('targetUrl');

        if (model.errors.has('targetUrl')) {
            this.invalidate();
        }
    }
});
