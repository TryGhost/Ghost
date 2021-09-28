// ### Pagination Helper
// `{{pagination}}`
// Outputs previous and next buttons, along with info about the current page
const {templates, hbs} = require('../services/rendering');

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const _ = require('lodash');

const messages = {
    invalidData: 'The {{pagination}} helper was used outside of a paginated context. See https://ghost.org/docs/themes/helpers/pagination/.',
    valuesMustBeDefined: 'All values must be defined for page, pages, limit and total',
    nextPrevValuesMustBeNumeric: 'Invalid value, Next/Prev must be a number',
    valuesMustBeNumeric: 'Invalid value, check page, pages, limit and total are numbers'
};

const createFrame = hbs.handlebars.createFrame;

module.exports = function pagination(options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    if (!_.isObject(this.pagination) || _.isFunction(this.pagination)) {
        throw new errors.IncorrectUsageError({
            level: 'normal',
            message: tpl(messages.invalidData),
            help: 'https://ghost.org/docs/themes/helpers/pagination/'
        });
    }

    if (_.isUndefined(this.pagination.page) || _.isUndefined(this.pagination.pages) ||
        _.isUndefined(this.pagination.total) || _.isUndefined(this.pagination.limit)) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.valuesMustBeDefined)
        });
    }

    if ((!_.isNull(this.pagination.next) && !_.isNumber(this.pagination.next)) ||
        (!_.isNull(this.pagination.prev) && !_.isNumber(this.pagination.prev))) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.nextPrevValuesMustBeNumeric)
        });
    }

    if (!_.isNumber(this.pagination.page) || !_.isNumber(this.pagination.pages) ||
        !_.isNumber(this.pagination.total) || !_.isNumber(this.pagination.limit)) {
        throw new errors.IncorrectUsageError({message: tpl(messages.valuesMustBeNumeric)});
    }

    // CASE: The pagination helper should have access to the pagination properties at the top level.
    _.merge(this, this.pagination);
    // CASE: The pagination helper will forward attributes passed to it.
    _.merge(this, options.hash);
    const data = createFrame(options.data);

    return templates.execute('pagination', this, {data});
};
