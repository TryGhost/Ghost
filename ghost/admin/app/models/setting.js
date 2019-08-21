/* eslint-disable camelcase */
import Model from 'ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import attr from 'ember-data/attr';

export default Model.extend(ValidationEngine, {
    validationType: 'setting',

    title: attr('string'),
    description: attr('string'),
    logo: attr('string'),
    coverImage: attr('string'),
    icon: attr('string'),
    defaultLocale: attr('string'),
    activeTimezone: attr('string', {defaultValue: 'Etc/UTC'}),
    codeinjectionHead: attr('string'),
    codeinjectionFoot: attr('string'),
    facebook: attr('facebook-url-user'),
    twitter: attr('twitter-url-user'),
    labs: attr('string'),
    navigation: attr('navigation-settings'),
    isPrivate: attr('boolean'),
    publicHash: attr('string'),
    password: attr('string'),
    slack: attr('slack-settings'),
    amp: attr('boolean'),
    unsplash: attr('unsplash-settings', {
        defaultValue() {
            return {isActive: true};
        }
    }),
    membersSubscriptionSettings: attr('string'),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    twitterTitle: attr('string'),
    twitterDescription: attr('string'),
    twitterImage: attr('string'),
    ogTitle: attr('string'),
    ogDescription: attr('string'),
    ogImage: attr('string')
});
