import ValidationEngine from 'ghost/mixins/validation-engine';

var Setting = DS.Model.extend(ValidationEngine, {
    validationType: 'setting',

    title: DS.attr('string'),
    description: DS.attr('string'),
    email: DS.attr('string'),
    logo: DS.attr('string'),
    cover: DS.attr('string'),
    defaultLang: DS.attr('string'),
    postsPerPage: DS.attr('number'),
    forceI18n: DS.attr('boolean'),
    permalinks: DS.attr('string'),
    activeTheme: DS.attr('string'),
    availableThemes: DS.attr()
});

export default Setting;
