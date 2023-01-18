const MentionController = require('./MentionController');
const WebmentionMetadata = require('./WebmentionMetadata');
const {
    InMemoryMentionRepository,
    MentionsAPI
} = require('@tryghost/webmentions');

module.exports = {
    controller: new MentionController(),
    async init() {
        const repository = new InMemoryMentionRepository();
        const webmentionMetadata = new WebmentionMetadata();
        const api = new MentionsAPI({
            repository,
            webmentionMetadata,
            resourceService: {
                async getByURL() {
                    return {
                        type: null,
                        id: null
                    };
                }
            },
            routingService: {
                async pageExists() {
                    return true;
                }
            }
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
