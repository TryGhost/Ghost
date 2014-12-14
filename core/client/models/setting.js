import ValidationEngine from 'ghost/mixins/validation-engine';
import NProgressSaveMixin from 'ghost/mixins/nprogress-save';

var Setting = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
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
    availableThemes: DS.attr(),
    ghost_head: DS.attr('string'),
    ghost_foot: DS.attr('string'),
    labs: DS.attr('string')
});

export default Setting;
