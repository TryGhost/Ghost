// # slice helper
//
// Usage examples, for example in .hbs theme templates:
//
// {{#match (slice label start=0 end=2) "@ " }}
//   <li><a href="{{url}}">{{ slice label start=2 }}</a</li>
// {{/match}}
//
// Or:
//
// {{ slice "Testing [*]" start=-3 }} => Outputs: [*]

const {SafeString} = require('../services/handlebars');

module.exports = function slice(text, options) {
    options = options || {};
    options.hash = options.hash || {};

    let start = options.hash.start;
    let end = options.hash.end;

    if (typeof text !== 'string' || typeof start !== 'number') {
        return '';
    }

    let result = (typeof end === 'number') ?
        text.slice(start, end) : text.slice(start);

    return new SafeString(result);
};
