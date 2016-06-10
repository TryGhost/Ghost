/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

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
    activeTimezone: attr('string', {defaultValue: 'Etc/UTC'}),
    ghost_head: attr('string'),
    ghost_foot: attr('string'),
    facebook: attr('facebook-url-user'),
    twitter: attr('twitter-url-user'),
    labs: attr('string'),
    navigation: attr('navigation-settings'),
    isPrivate: attr('boolean'),
    password: attr('string'),
    slack: attr('slack-settings')
});
