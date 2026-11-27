// ### Pagination Helper
// `{{pagination}}`
// Outputs previous and next buttons, along with info about the current page
const { templates, hbs } = require('../services/handlebars');

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const _ = require('lodash');

const messages = {
  invalidData:
    'The {{pagination}} helper was used outside of a paginated context. See https://docs.ghost.org/themes/helpers/pagination/.',
  valuesMustBeDefined: 'All values must be defined for page, pages, limit and total',
  nextPrevValuesMustBeNumeric: 'Invalid value, Next/Prev must be a number',
  valuesMustBeNumeric: 'Invalid value, check page, pages, limit and total are numbers',
};

const createFrame = hbs.handlebars.createFrame;

module.exports = function pagination(options) {
  options = options || {};
  options.hash = options.hash || {};
  options.data = options.data || {};

  if (!_.isObject(this.pagination) || typeof this.pagination === 'function') {
    throw new errors.IncorrectUsageError({
      level: 'normal',
      message: tpl(messages.invalidData),
      help: 'https://docs.ghost.org/themes/helpers/pagination/',
    });
  }

  if (
    this.pagination.page === undefined ||
    this.pagination.pages === undefined ||
    this.pagination.total === undefined ||
    this.pagination.limit === undefined
  ) {
    throw new errors.IncorrectUsageError({
      message: tpl(messages.valuesMustBeDefined),
    });
  }

  if (
    (this.pagination.next !== null && typeof this.pagination.next !== 'number') ||
    (this.pagination.prev !== null && typeof this.pagination.prev !== 'number')
  ) {
    throw new errors.IncorrectUsageError({
      message: tpl(messages.nextPrevValuesMustBeNumeric),
    });
  }

  if (
    typeof this.pagination.page !== 'number' ||
    typeof this.pagination.pages !== 'number' ||
    typeof this.pagination.total !== 'number' ||
    typeof this.pagination.limit !== 'number'
  ) {
    throw new errors.IncorrectUsageError({ message: tpl(messages.valuesMustBeNumeric) });
  }

  // CASE: The pagination helper should have access to the pagination properties at the top level.
  _.merge(this, this.pagination);
  // CASE: The pagination helper will forward attributes passed to it.
  _.merge(this, options.hash);
  const data = createFrame(options.data);

  return templates.execute('pagination', this, { data });
};
