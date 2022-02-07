const mapper = require('./utils/mapper');
const gating = require('./utils/post-gating');

module.exports = {
    async read(model, apiConfig, frame) {
        const emailPost = await mapper.mapPost(model, frame);
        gating.forPost(emailPost, frame);

        frame.response = {
            email_posts: [emailPost]
        };
    }
};
