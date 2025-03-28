import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import React from 'react';
import {List} from '@tryghost/admin-x-design-system';

const features = [{
    title: 'Webmentions',
    description: 'Allows viewing received mentions on the dashboard.',
    flag: 'webmentions'
},{
    title: 'Stripe Automatic Tax (private beta)',
    description: 'Use Stripe Automatic Tax at Stripe Checkout. Needs to be enabled in Stripe',
    flag: 'stripeAutomaticTax'
},{
    title: 'Email customization',
    description: 'Adding more control over the newsletter template',
    flag: 'emailCustomization'
},{
    title: 'Collections Card',
    description: 'Enables the Collections Card for pages - requires Collections and the beta Editor to be enabled',
    flag: 'collectionsCard'
},{
    title: 'Mail Events',
    description: 'Enables processing of mail events',
    flag: 'mailEvents'
},{
    title: 'Import Member Tier',
    description: 'Enables tier to be specified when importing members',
    flag: 'importMemberTier'
},{
    title: 'AdminX Demo',
    description: 'Adds a navigation link to the AdminX demo app',
    flag: 'adminXDemo'
},{
    title: 'NestJS Playground',
    description: 'Wires up the Ghost NestJS App to the Admin API (also needs GHOST_ENABLE_NEST_FRAMEWORK=1 env var)',
    flag: 'NestPlayground'
},{
    title: 'Content Visibility (Beta)',
    description: 'Enables content visibility in Emails - Changes already released to beta testers',
    flag: 'contentVisibility'
},{
    title: 'Content Visibility (Alpha)',
    description: 'Enables content visibility in Emails - Additional changes for internal testing. NOTE: requires `contentVisibility` to also be enabled',
    flag: 'contentVisibilityAlpha'
},{
    title: 'Post analytics redesign',
    description: 'Enables redesigned Post analytics page',
    flag: 'postsX'
},{
    title: 'Stats redesign',
    description: 'Enables redesigned Stats page',
    flag: 'statsX'
}, {
    title: 'Sign-up CAPTCHA',
    description: 'Enable CAPTCHA for member sign-up and sign-in',
    flag: 'captcha'
}, {
    title: 'Explore',
    description: 'Enables keeping in touch with the new Explore API',
    flag: 'explore'
}];

const AlphaFeatures: React.FC = () => {
    return (
        <List titleSeparator={false}>
            {features.map(feature => (
                <LabItem
                    action={<FeatureToggle flag={feature.flag} label={feature.title} />}
                    detail={feature.description}
                    title={feature.title} />
            ))}
        </List>
    );
};

export default AlphaFeatures;
