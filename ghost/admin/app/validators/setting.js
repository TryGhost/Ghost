import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['title', 'description', 'password', 'slackUrl'],
    title(model) {
        let title = model.title;

        if (!validator.isLength(title || '', 0, 150)) {
            model.errors.add('title', 'Title is too long');
            this.invalidate();
        }
    },

    description(model) {
        let desc = model.description;

        if (!validator.isLength(desc || '', 0, 200)) {
            model.errors.add('description', 'Description is too long');
            this.invalidate();
        }
    },

    password(model) {
        let isPrivate = model.isPrivate;
        let password = model.password;

        if (isPrivate && password === '') {
            model.errors.add('password', 'Password must be supplied');
            this.invalidate();
        }
    },

    slackUrl(model) {
        let slackUrl = model.slackUrl;

        if (!isBlank(slackUrl) && !validator.isURL(slackUrl, {require_protocol: true})) {
            model.errors.add(
                'slackUrl',
                'The URL must be in a format like https://hooks.slack.com/services/<your personal key>'
            );

            this.invalidate();
        }
    }
});
