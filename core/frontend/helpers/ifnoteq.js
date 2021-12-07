// # Ifnoteq Helper
// Usage: `{{#ifnoteq "conditionA","conditionB"}}`

module.exports = function ifnoteq(a, b, options) {
    return (a !== b) ? options.fn(this) : options.inverse(this);
};
