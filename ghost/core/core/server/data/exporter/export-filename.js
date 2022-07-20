const _ = require('lodash');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const models = require('../../models');

const modelOptions = {context: {internal: true}};

const exportFileName = async function exportFileName(options) {
    const datetime = require('moment')().format('YYYY-MM-DD-HH-mm-ss');
    let title = '';

    options = options || {};

    // custom filename
    if (options.filename) {
        return options.filename + '.json';
    }

    try {
        const settingsTitle = await models.Settings.findOne({key: 'title'}, _.merge({}, modelOptions, _.pick(options, 'transacting')));

        if (settingsTitle) {
            title = security.string.safe(settingsTitle.get('value')) + '.';
        }

        return title + 'ghost.' + datetime + '.json';
    } catch (err) {
        logging.error(new errors.InternalServerError({err: err}));
        return 'ghost.' + datetime + '.json';
    }
};

module.exports = exportFileName;
