/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({

    model(params) {
        return this.store.queryRecord('tag', {slug: params.tag_slug});
    },

    serialize(model) {
        return {tag_slug: model.get('slug')};
    },

    // reset the model so that mobile screens react to an empty selectedTag
    deactivate() {
        this._super(...arguments);
        this.set('controller.model', null);
    }
});
