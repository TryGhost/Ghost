const MentionController = require('./MentionController');

module.exports = {
    controller: new MentionController(),
    async init() {
        this.controller.init();
    }
};
