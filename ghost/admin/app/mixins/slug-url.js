import Ember from 'ember';

const {isBlank} = Ember;

export default Ember.Mixin.create({
    buildURL(_modelName, _id, _snapshot, _requestType, query) {
        let url = this._super(...arguments);

        if (query && !isBlank(query.slug)) {
            url += `slug/${query.slug}/`;
            delete query.slug;
        }

        return url;
    }
});
