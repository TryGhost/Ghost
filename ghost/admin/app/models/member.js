import DS from 'ember-data';
import attr from 'ember-data/attr';

export default DS.Model.extend({
    name: attr('string'),
    email: attr('string'),
    createdAt: attr('moment-utc'),
    subscriptions: attr('member-subscription')
});
