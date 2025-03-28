const active = require('./active');

module.exports = {
    getActive: active.get,
    setActive: active.set,
    middleware: require('./middleware')
};
