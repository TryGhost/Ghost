import DS from 'ember-data';
var Notification = DS.Model.extend({
    dismissible: DS.attr('boolean'),
    location: DS.attr('string'),
    status: DS.attr('string'),
    type: DS.attr('string'),
    message: DS.attr('string')
});

export default Notification;
