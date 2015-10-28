/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import DS from 'ember-data';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Model, attr} = DS;

export default Model.extend(ValidationEngine, {
    validationType: 'setting',

    title: attr('string'),
    description: attr('string'),
    logo: attr('string'),
    cover: attr('string'),
    defaultLang: attr('string'),
    postsPerPage: attr('number'),
    forceI18n: attr('boolean'),
    permalinks: attr('string'),
    activeTheme: attr('string'),
    availableThemes: attr(),
    ghost_head: attr('string'),
    ghost_foot: attr('string'),
    labs: attr('string'),
    navigation: attr('string'),
    isPrivate: attr('boolean'),
    password: attr('string')
});
