import Model, {attr} from '@ember-data/model';

export default Model.extend({
    key: attr('string'),
    type: attr('string'),
    description: attr('string'),
    options: attr(),
    default: attr('string'),
    value: attr(),
    group: attr('string'),
    visibility: attr('string'),
    visible: attr('boolean', {defaultValue: true})
});
