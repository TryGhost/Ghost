'use strict';

const errors = require('@tryghost/errors');

class EmailProviderBase {
    constructor(config) {
        Object.defineProperty(this, 'requiredFns', {
            value: ['send'],
            writable: false
        });

        this.config = config || {};
    }

    async send() {
        throw new errors.IncorrectUsageError({
            message: 'send() must be implemented by email provider adapter'
        });
    }
}

module.exports = EmailProviderBase;
