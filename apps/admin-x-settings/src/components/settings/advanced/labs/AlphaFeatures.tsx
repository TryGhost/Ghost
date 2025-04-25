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
    title: 'Content Visibility (Beta)',
    description: 'Enables content visibility in Emails - Changes already released to beta testers',
    flag: 'contentVisibility'
},{
    title: 'Content Visibility (Alpha)',
    description: 'Enables content visibility in Emails - Additional changes for internal testing. NOTE: requires `contentVisibility` to also be enabled',
    flag: 'contentVisibilityAlpha'
},
{
    title: 'Traffic Analytics',
    description: 'Enables traffic analytics',
    flag: 'trafficAnalytics'
},{
    title: 'Stats redesign',
    description: 'Enables redesigned Stats page',
    flag: 'trafficAnalyticsAlpha'
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
