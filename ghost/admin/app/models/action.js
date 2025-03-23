import Model, {attr} from '@ember-data/model';

export default Model.extend({
    resourceId: attr('string'),
    resourceType: attr('string'),
    actorId: attr('string'),
    actorType: attr('string'),
    event: attr('string'),
    context: attr('json-string'),
    createdAtUTC: attr('moment-utc')
});
