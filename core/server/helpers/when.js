// # when Helper
//
// Usage:  `{{when lang 'en'}}`
//
// Mimics the behaviour of a normal

module.exports = function when(v1, v2, options) {
        if(v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
};
