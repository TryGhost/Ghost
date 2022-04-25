const ghostBookshelf = require('./base');

const Newsletter = ghostBookshelf.Model.extend({
    tableName: 'newsletters',

    defaults: {
        sender_reply_to: 'newsletter',
        status: 'active',
        visibility: 'members',
        subscribe_on_signup: true,
        sort_order: 0,
        title_font_category: 'sans_serif',
        title_alignment: 'center',
        show_feature_image: true,
        body_font_category: 'sans_serif',
        show_badge: true,
        show_header_icon: true,
        show_header_title: true,
        show_header_name: true
    },

    async onSaving(model, _attr, options) {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (model.get('name')) {
            model.set('name', model.get('name').trim());
        }

        if (model.hasChanged('slug') || !model.get('slug')) {
            const slug = model.get('slug') || model.get('name');

            if (slug) {
                const cleanSlug = await ghostBookshelf.Model.generateSlug(Newsletter, slug, {
                    transacting: options.transacting
                });

                model.set({slug: cleanSlug});
            }
        }
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            sort_order: 'ASC',
            created_at: 'ASC',
            id: 'ASC'
        };
    },

    getNextAvailableSortOrder: async function getNextAvailableSortOrder(unfilteredOptions = {}) {
        const options = {};
        if (unfilteredOptions.transacting) {
            options.transacting = unfilteredOptions.transacting;
        }

        const lastNewsletter = await this.findPage({
            filter: 'status:active',
            order: 'sort_order DESC', // there's no NQL syntax available here
            limit: 1,
            columns: ['sort_order']
        }, options);

        if (lastNewsletter.data.length > 0) {
            return lastNewsletter.data[0].get('sort_order') + 1;
        }
        return 0;
    }
});

module.exports = {
    Newsletter: ghostBookshelf.model('Newsletter', Newsletter)
};
