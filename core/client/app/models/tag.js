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
    meta_title: attr('string'),
    meta_description: attr('string'),
    image: attr('string'),
    hidden: attr('boolean'),
    created_at: attr('moment-date'),
    updated_at: attr('moment-date'),
    created_by: attr(),
    updated_by: attr(),
    count: attr('raw')
});
