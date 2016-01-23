/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'tag',

    uuid: attr('string'),
    name: attr('string'),
    slug: attr('string'),
    description: attr('string'),
    parent: attr(),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    image: attr('string'),
    hidden: attr('boolean'),
    createdAt: attr('moment-date'),
    updatedAt: attr('moment-date'),
    createdBy: attr(),
    updatedBy: attr(),
    count: attr('raw')
});
