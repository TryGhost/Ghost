import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
    name: attr('string'),
    package: attr('raw'),
    active: attr('boolean'),
    warnings: attr('raw'),

    activate() {
        let adapter = this.store.adapterFor(this.constructor.modelName);
        return adapter.activate(this);
    }
});
