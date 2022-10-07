import Model, {attr} from '@ember-data/model';

export default Model.extend({
    key: attr('string'),
    type: attr('string'),
    options: attr(),
    default: attr('string'),
    value: attr(),
    group: attr('string')
});
