/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import DS from 'ember-data';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Model, attr} = DS;

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
