const MentionController = require('./MentionController');
const {
    InMemoryMentionRepository,
    MentionsAPI
} = require('@tryghost/webmentions');

module.exports = {
    controller: new MentionController(),
    async init() {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository
        });

        api.processWebmention({
            source: new URL('https://egg.com/post'),
            target: new URL('https://ronald.com/pizza'),
            payload: {
                extra: 'data'
            }
        });

        this.controller.init({api});
    }
};
