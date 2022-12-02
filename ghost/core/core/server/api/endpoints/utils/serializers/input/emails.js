module.exports = {
    browseFailures(apiConfig, frame) {
        if (!frame.options.withRelated) {
            return;
        }

        // Fix snake case API <-> internal camelCase
        frame.options.withRelated = frame.options.withRelated.map((r) => {
            if (r === 'email_recipient') {
                return 'emailRecipient';
            }
            return r;
        });
    }
};
