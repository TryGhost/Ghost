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

        this.controller.init({api});

        this.controller.receive({
            data: {
                source: 'https://brid.gy/repost/twitter/KiaKamgar/1615735511137624064/1615738476875366401',
                target: 'https://ronald.com/pizza/',
                extra: 'data'
            }
        });

        this.controller.receive({
            data: {
                source: 'https://slrpnk.net/post/222314',
                target: 'https://ronald.com/thing/',
                extra: 'data'
            }
        });

        this.controller.receive({
            data: {
                source: 'https://lobste.rs/s/eq4f9d',
                target: 'https://ronald.com/whatever/',
                extra: 'data'
            }
        });
    }
};
