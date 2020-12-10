import Model, {attr, belongsTo} from '@ember-data/model';

export default Model.extend({
    processedAtUTC: attr('moment-utc'),
    deliveredAtUTC: attr('moment-utc'),
    openedAtUTC: attr('moment-utc'),
    failedAtUTC: attr('moment-utc'),
    memberEmail: attr('string'),
    memberName: attr('string'),

    email: belongsTo('email', {embedded: 'always', async: false})
});
