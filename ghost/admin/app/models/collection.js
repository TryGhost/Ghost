import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {inject as service} from '@ember/service';

export default Model.extend(ValidationEngine, {
    validationType: 'collection',

    title: attr('string'),
    slug: attr('string'),
    description: attr('string'),
    type: attr('string', {defaultValue: 'manual'}),
    filter: attr('string'),
    featureImage: attr('string'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedBy: attr('number'),
    count: attr('raw'),

    feature: service()
});
