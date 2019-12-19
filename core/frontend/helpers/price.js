// # Encode Helper
//
// Usage: `{{price 2000}}`
//
// Returns amount equal to the dominant denomintation of the currency.
// For example, if 2000 is passed for USD, it will return 20.

module.exports = function encode(string, options) {
    const amount = string || options;
    return amount / 100;
};
