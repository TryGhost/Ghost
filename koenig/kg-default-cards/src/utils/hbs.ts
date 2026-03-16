const Handlebars = require('handlebars');

module.exports = function hbs(literals, ...values) {
    // interweave strings with substitutions
    let output = '';
    for (let i = 0; i < values.length; i++) {
        output += literals[i] + values[i];
    }
    output += literals[values.length];

    // return compiled handlebars template
    return Handlebars.compile(output);
};
