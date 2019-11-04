import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
    resourceId: attr('string'),
    resourceType: attr('string'),
    actorId: attr('string'),
    actorType: attr('string'),
    event: attr('string'),
    context: attr('json-string'),
    createdAtUTC: attr('moment-utc')
});
