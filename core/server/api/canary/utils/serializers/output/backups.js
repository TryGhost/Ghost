const debug = require('@tryghost/debug');

module.exports = {
    downloadBackup(data, apiConfig, frame){
        debug('downloadBackup');
        frame.response = data;
    },
    initialize(data, apiConfig, frame){
        debug('initialize');
        frame.response = data;
    }
};
