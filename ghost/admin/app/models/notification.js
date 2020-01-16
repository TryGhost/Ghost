import Model, {attr} from '@ember-data/model';

export default Model.extend({
    custom: attr('boolean'),
    dismissible: attr('boolean'),
    key: attr('string'),
    message: attr('string'),
    status: attr('string'),
    type: attr('string')
});
