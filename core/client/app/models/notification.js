import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
    dismissible: attr('boolean'),
    status: attr('string'),
    type: attr('string'),
    message: attr('string')
});
