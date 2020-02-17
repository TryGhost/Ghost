const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:input:members');

function defaultRelations(frame) {
    if (frame.options.withRelated) {
        return;
    }

    if (frame.options.columns && !frame.options.withRelated) {
        return false;
    }

    frame.options.withRelated = ['labels'];
}

function removeSigninLinkRelation(frame) {
    if (!frame.options.withRelated) {
        return;
    }

    frame.options.withRelated = frame.options.withRelated.filter(relation => (relation === 'signin_link'));
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        removeSigninLinkRelation(frame);
        defaultRelations(frame);
    },

    read() {
        debug('read');

        this.browse(...arguments);
    },

    add(apiConfig, frame) {
        debug('add');
        if (frame.data.members[0].labels) {
            frame.data.members[0].labels.forEach((label, index) => {
                if (_.isString(label)) {
                    frame.data.members[0].labels[index] = {
                        name: label
                    };
                }
            });
        }

        removeSigninLinkRelation(frame);
        defaultRelations(frame);
    },

    edit() {
        debug('edit');
        this.add(...arguments);
    }
};
