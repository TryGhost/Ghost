import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import React from 'react';
import {List} from '@tryghost/admin-x-design-system';

const features = [{
    title: 'URL cache',
    description: 'Enable URL Caching',
    flag: 'urlCache'
},{
    title: 'Lexical multiplayer',
    description: 'Enables multiplayer editing in the lexical editor.',
    flag: 'lexicalMultiplayer'
},{
    title: 'Webmentions',
    description: 'Allows viewing received mentions on the dashboard.',
    flag: 'webmentions'
},{
    title: 'Websockets',
    description: <>Test out Websockets functionality at <code>/ghost/#/websockets</code>.</>,
    flag: 'websockets'
},{
    title: 'Stripe Automatic Tax',
    description: 'Use Stripe Automatic Tax at Stripe Checkout. Needs to be enabled in Stripe',
    flag: 'stripeAutomaticTax'
},{
    title: 'Email customization',
    description: 'Adding more control over the newsletter template',
    flag: 'emailCustomization'
},{
    title: 'Collections',
    description: 'Enables Collections 2.0',
    flag: 'collections'
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
    title: 'Tips & donations',
    description: 'Enables publishers to collect one-time payments',
    flag: 'tipsAndDonations'
},{
    title: 'AdminX Demo',
    description: 'Adds a navigation link to the AdminX demo app',
    flag: 'adminXDemo'
},{
    title: 'Onboarding checklist',
    description: 'Onboarding checklist that helps new customers get started',
    flag: 'onboardingChecklist'
},{
    title: 'NestJS Playground',
    description: 'Wires up the Ghost NestJS App to the Admin API',
    flag: 'NestPlayground'
},{
    title: 'Additional payment methods',
    description: 'Adds support for additional payment methods in Stripe Checkout',
    flag: 'additionalPaymentMethods'
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
