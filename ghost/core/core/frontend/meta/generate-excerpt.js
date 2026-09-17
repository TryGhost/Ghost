const { once } = require('@tryghost/memoize');

const loadDownsize = once(() => require('downsize-cjs'));

function generateExcerpt(excerpt, truncateOptions) {
  truncateOptions = truncateOptions || {};

  if (!truncateOptions.words && !truncateOptions.characters) {
    truncateOptions.words = 50;
  }

  // Just uses downsize to truncate, not format
  const downsize = loadDownsize();
  return downsize(excerpt, truncateOptions);
}

module.exports = generateExcerpt;
