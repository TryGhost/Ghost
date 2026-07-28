import Model, {attr, belongsTo} from '@ember-data/model';

export default Model.extend({
    type: attr('string'),
    secret: attr('string'),
    lastSeenAtUTC: attr('moment-utc'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),

    integration: belongsTo('integration')
});
