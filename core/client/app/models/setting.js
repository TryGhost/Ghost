import DS from 'ember-data';
import ValidationEngine from 'ghost/mixins/validation-engine';

var Setting = DS.Model.extend(ValidationEngine, {
    validationType: 'setting',

    title: DS.attr('string'),
    description: DS.attr('string'),
    logo: DS.attr('string'),
    cover: DS.attr('string'),
    defaultLang: DS.attr('string'),
    postsPerPage: DS.attr('number'),
    forceI18n: DS.attr('boolean'),
    permalinks: DS.attr('string'),
    activeTheme: DS.attr('string'),
    availableThemes: DS.attr(),
    ghost_head: DS.attr('string'),
    ghost_foot: DS.attr('string'),
    labs: DS.attr('string'),
    navigation: DS.attr('string'),
    isPrivate: DS.attr('boolean'),
    password: DS.attr('string')
});

export default Setting;
