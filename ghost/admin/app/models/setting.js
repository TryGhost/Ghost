/* eslint-disable camelcase */
import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {and} from '@ember/object/computed';

export default Model.extend(ValidationEngine, {
    validationType: 'setting',

    title: attr('string'),
    description: attr('string'),
    logo: attr('string'),
    coverImage: attr('string'),
    icon: attr('string'),
    accentColor: attr('string'),
    locale: attr('string'),
    timezone: attr('string', {defaultValue: 'Etc/UTC'}),
    codeinjectionHead: attr('string'),
    codeinjectionFoot: attr('string'),
    facebook: attr('facebook-url-user'),
    twitter: attr('twitter-url-user'),
    labs: attr('string'),
    navigation: attr('navigation-settings'),
    secondaryNavigation: attr('navigation-settings', {isSecondary: true}),
    isPrivate: attr('boolean'),
    publicHash: attr('string'),
    password: attr('string'),
    slackUrl: attr('string'),
    slackUsername: attr('string'),
    amp: attr('boolean'),
    ampGtagId: attr('string'),
    firstpromoter: attr('boolean'),
    firstpromoterId: attr('string'),
    unsplash: attr('boolean'),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    twitterTitle: attr('string'),
    twitterDescription: attr('string'),
    twitterImage: attr('string'),
    ogTitle: attr('string'),
    ogDescription: attr('string'),
    ogImage: attr('string'),
    mailgunApiKey: attr('string'),
    mailgunDomain: attr('string'),
    mailgunBaseUrl: attr('string'),
    emailTrackOpens: attr('boolean'),
    portalButton: attr('boolean'),
    portalName: attr('boolean'),
    portalPlans: attr('json-string'),
    portalProducts: attr('json-string'),
    portalButtonStyle: attr('string'),
    portalButtonIcon: attr('string'),
    portalButtonSignupText: attr('string'),
    sharedViews: attr('string'),
    /**
     * Members settings
     */
    membersSignupAccess: attr('string'),
    defaultContentVisibility: attr('string'),
    defaultContentVisibilityTiers: attr('json-string'),
    membersSupportAddress: attr('string'),
    membersMonthlyPriceId: attr('string'),
    membersYearlyPriceId: attr('string'),
    stripeSecretKey: attr('string'),
    stripePublishableKey: attr('string'),
    stripePlans: attr('json-string'),
    stripeConnectIntegrationToken: attr('string'),
    stripeConnectPublishableKey: attr('string'),
    stripeConnectSecretKey: attr('string'),
    stripeConnectLivemode: attr('boolean'),
    stripeConnectDisplayName: attr('string'),
    stripeConnectAccountId: attr('string'),

    membersEnabled: attr('boolean'),
    paidMembersEnabled: attr('boolean'),

    /**
     * Editor settings
     */
    editorDefaultEmailRecipients: attr('string'),
    editorDefaultEmailRecipientsFilter: attr('members-segment-string'),
    emailVerificationRequired: attr('boolean'),

    mailgunIsConfigured: and('mailgunApiKey', 'mailgunDomain', 'mailgunBaseUrl')
});
