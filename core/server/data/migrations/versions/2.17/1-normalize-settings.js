const _ = require('lodash');
const Promise = require('bluebird');
const logging = require('@tryghost/logging');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    return localOptions
        .transacting('settings')
        .then((response) => {
            if (!response) {
                logging.warn('Cannot find settings.');
                return;
            }

            return Promise.each(response, (entry) => {
                // @NOTE: ensure we only transform real boolean fields to ensure we won't modify any customer data
                if (['is_private', 'force_i18n', 'amp'].includes(entry.key)) {
                    // @NOTE: sending false to db for type TEXT will transform to "0"
                    if ((entry.value === '0' || entry.value === '1')) {
                        const value = (!!+entry.value).toString();

                        logging.info(`Setting ${entry.key} to ${value} because it was ${entry.value}`);

                        /**
                         * @NOTE: we have update raw data, because otherwise the `Settings.edit` fn will re-fetch the data
                         *        using Bookshelf and normalize "0" to false. The save won't happen then.
                         */
                        return localOptions
                            .transacting('settings')
                            .where('key', entry.key)
                            .update({
                                value: value
                            });
                    }

                    // @NOTE: null or undefined were obviously intended to be false
                    if (entry.value === null || entry.value === undefined || entry.value === 'null' || entry.value === 'undefined') {
                        const value = 'false';
                        logging.info(`Setting ${entry.key} to ${value} because it was ${entry.value}`);

                        return localOptions
                            .transacting('settings')
                            .where('key', entry.key)
                            .update({
                                value
                            });
                    }

                    // @NOTE: Something other than true/false is stored, set to true, because that's how it would have behaved
                    if (entry.value !== 'false' && entry.value !== 'true') {
                        const value = 'true';
                        logging.info(`Setting ${entry.key} to ${value} because it was ${entry.value}`);

                        return localOptions
                            .transacting('settings')
                            .where('key', entry.key)
                            .update({
                                value
                            });
                    }
                }

                logging.info(`Skip setting ${entry.key}`);
                return Promise.resolve();
            });
        });
};
