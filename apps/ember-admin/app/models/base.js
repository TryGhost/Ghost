import Model from '@ember-data/model';

export default Model.extend({
    // this is a hack that gives us access to meta data in single resource responses
    // allows similar response.get('_meta') as with multi-resource responses but can
    // suffer from race conditions
    // TODO: review once the record links and meta RFC lands
    // https://github.com/emberjs/rfcs/blob/master/text/0332-ember-data-record-links-and-meta.md
    get _meta() {
        return this._internalModel.type.___meta;
    }
});
