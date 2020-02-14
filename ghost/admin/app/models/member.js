import Model, {attr, hasMany} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'member',

    name: attr('string'),
    email: attr('string'),
    note: attr('string'),
    createdAtUTC: attr('moment-utc'),
    stripe: attr('member-subscription'),
    subscribed: attr('boolean', {defaultValue: true}),
    labels: hasMany('label', {embedded: 'always', async: false}),
    comped: attr('boolean', {defaultValue: false}),
    // remove client-generated labels, which have `id: null`.
    // Ember Data won't recognize/update them automatically
    // when returned from the server with ids.
    // https://github.com/emberjs/data/issues/1829
    updateLabels() {
        let labels = this.labels;
        let oldLabels = labels.filterBy('id', null);

        labels.removeObjects(oldLabels);
        oldLabels.invoke('deleteRecord');
    }
});
