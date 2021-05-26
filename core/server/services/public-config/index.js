module.exports = {
    get config() {
        return require('./config')();
    },
    get site() {
        return require('./site')();
    }
};
