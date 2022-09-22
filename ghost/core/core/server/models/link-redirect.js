const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const LinkRedirect = ghostBookshelf.Model.extend({
    tableName: 'link_redirects',

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
            findAll: ['filter', 'columns', 'withRelated']
        };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    countRelations() {
        return {
            clicks(modelOrCollection) {
                modelOrCollection.query('columns', 'link_redirects.*', (qb) => {
                    qb.countDistinct('members_link_click_events.member_id')
                        .from('members_link_click_events')
                        .whereRaw('link_redirects.id = members_link_click_events.link_id')
                        .as('count__clicks');
                });
            }
        };
    }
});

module.exports = {
    LinkRedirect: ghostBookshelf.model('LinkRedirect', LinkRedirect)
};
