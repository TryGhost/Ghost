const CommentsService = require('./service');
const models = require('../models');

class CommentsServiceWrapper {
    init() {
        this.api = new CommentsService({
            models
        });
    }
}

module.exports = new CommentsServiceWrapper();
