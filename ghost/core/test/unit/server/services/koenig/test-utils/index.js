const jsdom = require('jsdom');

const dom = new jsdom.JSDOM();

module.exports = {
    assertPrettifiedIncludes: require('./assert-prettified-includes'),
    assertPrettifiesTo: require('./assert-prettifies-to'),
    callRenderer: require('./build-call-renderer')(dom),
    html: require('./html'),
    prettifyHTML: require('./prettify-html'),
    visibility: require('./visibility')
};