const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../lib/common');

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
                common.logging.warn('Cannot find settings.');
                return;
            }

            return Promise.each(response, (entry) => {
                // @NOTE: ensure we only transform real boolean fields to ensure we won't modify any customer data
                if (['is_private', 'force_i18n', 'amp'].includes(entry.key)) {
                    // @NOTE: sending false to db for type TEXT will transform to "0"
                    if ((entry.value === '0' || entry.value === '1')) {
                        common.logging.info(`Normalize setting ${entry.key}`);

                        /**
                         * @NOTE: we have update raw data, because otherwise the `Settings.edit` fn will re-fetch the data
                         *        using Bookshelf and normalize "0" to false. The save won't happen then.
                         */
                        return localOptions
                            .transacting('settings')
                            .where('key', entry.key)
                            .update({
                                value: (!!+entry.value).toString()
                            });
                    }

                    // @NOTE: Something else is stored (any other value, set to false), normalize boolean fields
                    if (entry.value !== 'false' && entry.value !== 'value') {
                        common.logging.info(`Normalize setting ${entry.key}`);

                        return localOptions
                            .transacting('settings')
                            .where('key', entry.key)
                            .update({
                                value: 'false'
                            });
                    }
                }

                common.logging.info(`Skip setting ${entry.key}`);
                return Promise.resolve();
            });
        });
};
