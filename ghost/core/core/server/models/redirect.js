const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const Redirect = ghostBookshelf.Model.extend({
    tableName: 'redirects',

    post() {
        return this.belongsTo('Post', 'post_id');
    },

    formatOnWrite(attrs) {
        if (attrs.to) {
            attrs.to = urlUtils.absoluteToTransformReady(attrs.to);
        }

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        if (attrs.to) {
            attrs.to = urlUtils.transformReadyToAbsolute(attrs.to);
        }

        return attrs;
    }
}, {
    orderDefaultRaw(options) {
        if (options.withRelated && options.withRelated.includes('count.clicks')) {
            return '`count__clicks` DESC, `to` DESC';
        }
        return '`to` DESC';
    },

    permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);
        const validOptions = {
            findAll: ['filter', 'columns', 'withRelated'],
            edit: ['importing']
        };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    countRelations() {
        return {
            clicks(modelOrCollection) {
                modelOrCollection.query('columns', 'redirects.*', (qb) => {
                    qb.countDistinct('members_click_events.member_id')
                        .from('members_click_events')
                        .whereRaw('redirects.id = members_click_events.redirect_id')
                        .whereRaw('redirects.updated_at <= members_click_events.created_at')
                        .as('count__clicks');
                });
            }
        };
    }
});

module.exports = {
    Redirect: ghostBookshelf.model('Redirect', Redirect)
};
