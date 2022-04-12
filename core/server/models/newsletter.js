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
        show_header_title: true
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

});

module.exports = {
    Newsletter: ghostBookshelf.model('Newsletter', Newsletter)
};
