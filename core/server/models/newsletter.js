const ghostBookshelf = require('./base');

const Newsletter = ghostBookshelf.Model.extend({
    tableName: 'newsletters',

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
