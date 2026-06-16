const getPluginLoader = require('./loader');

module.exports = {
    init() {
        const loader = getPluginLoader();
        loader.load();
    },
    getAllCards() {
        const loader = getPluginLoader();
        return loader.getAllCards();
    },
    getCard(pluginName, cardName) {
        const loader = getPluginLoader();
        return loader.getCard(pluginName, cardName);
    },
    getPlugin(name) {
        const loader = getPluginLoader();
        return loader.getPlugin(name);
    },
    invalidate() {
        const loader = getPluginLoader();
        loader.invalidate();
    }
};
