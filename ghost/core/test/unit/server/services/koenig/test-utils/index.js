const jsdom = require('jsdom');

const dom = new jsdom.JSDOM();

module.exports = {
    assertPrettifiesTo: require('./assert-prettifies-to'),
    callRenderer: require('./build-call-renderer')(dom),
    html: require('./html'),
    visibility: require('./visibility')
};