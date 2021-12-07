// # Ifeq Helper
// Usage: `{{#ifeq "conditionA","conditionB"}}`

module.exports = function ifeq(a, b, options) {
    return (a === b) ? options.fn(this) : options.inverse(this);
};
