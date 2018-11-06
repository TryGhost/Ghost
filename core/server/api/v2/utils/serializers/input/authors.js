const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:authors');

module.exports = {
    all(apiConfig, frame) {
        debug('all');

        // @NOTE: this is a filter notation which does not exist, we only use it internally for now, because GQL does not
        //        support filtering and counting
        if (frame.options.filter) {
            frame.options.filter = `${frame.options.filter}+authors.posts:>0`;
        } else {
            frame.options.filter = 'authors.posts:>0';
        }
    }
};
