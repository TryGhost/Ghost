// # Tiers Helper
// Usage: `{{tiers}}`, `{{tiers separator=' - ' prefix=' : ' suffix=''}}`
//
// Returns a string of the tiers with access to the post.
// By default, tiers are separated by commas.
const { SafeString, escapeExpression } = require('../services/handlebars');

module.exports = function tiers(options = {}) {
  options = options || {};
  options.hash = options.hash || {};

  const separator = typeof options.hash.separator === 'string' ? options.hash.separator : ', ';
  const lastSeparator =
    typeof options.hash.lastSeparator === 'string' ? options.hash.lastSeparator : ' and ';
  const prefix = typeof options.hash.prefix === 'string' ? options.hash.prefix : '';
  let suffix = typeof options.hash.suffix === 'string' ? options.hash.suffix : '';

  let output = '';

  const accessProductsList = this.tiers;

  if (accessProductsList && accessProductsList.length > 0) {
    const tierNames = accessProductsList.map((tier) => {
      return escapeExpression(tier.name);
    });

    if (tierNames.length === 1) {
      output = tierNames[0];
      suffix = typeof options.hash.suffix === 'string' ? options.hash.suffix : ' tier';
    } else {
      suffix = typeof options.hash.suffix === 'string' ? options.hash.suffix : ' tiers';
      const firsts = tierNames.slice(0, tierNames.length - 1);
      const last = tierNames[tierNames.length - 1];
      output = firsts.join(separator) + lastSeparator + last;
    }
  }

  if (output) {
    output = prefix + output + suffix;
  }

  return new SafeString(output);
};
