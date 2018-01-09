import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
    custom: attr('boolean'),
    dismissible: attr('boolean'),
    key: attr('string'),
    message: attr('string'),
    status: attr('string'),
    type: attr('string')
});
