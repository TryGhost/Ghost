/* eslint-disable camelcase */
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'setting',

    title: attr('string'),
    description: attr('string'),
    logo: attr('string'),
    coverImage: attr('string'),
    icon: attr('string'),
    defaultLang: attr('string'),
    forceI18n: attr('boolean'),
    permalinks: attr('string'),
    activeTimezone: attr('string', {defaultValue: 'Etc/UTC'}),
    ghostHead: attr('string'),
    ghostFoot: attr('string'),
    facebook: attr('facebook-url-user'),
    twitter: attr('twitter-url-user'),
    labs: attr('string'),
    navigation: attr('navigation-settings'),
    isPrivate: attr('boolean'),
    password: attr('string'),
    slack: attr('slack-settings'),
    amp: attr('boolean')
});
