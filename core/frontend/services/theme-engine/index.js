const active = require('./active');

module.exports = {
    getActive: active.get,
    setActive: active.set,
    loadCoreHelpers: require('./handlebars/helpers').loadCoreHelpers,
    middleware: require('./middleware')
};
