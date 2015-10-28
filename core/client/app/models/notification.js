import DS from 'ember-data';

const {Model, attr} = DS;

export default Model.extend({
    dismissible: attr('boolean'),
    status: attr('string'),
    type: attr('string'),
    message: attr('string')
});
