import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import React from 'react';
import {List} from '@tryghost/admin-x-design-system';

const features = [{
    title: 'Stripe Automatic Tax (private beta)',
    description: 'Use Stripe Automatic Tax at Stripe Checkout. Needs to be enabled in Stripe',
    flag: 'stripeAutomaticTax'
}, {
    title: 'Traffic Analytics (private beta)',
    description: 'Enables traffic analytics',
    flag: 'trafficAnalytics'
}, {
    title: 'Email customization',
    description: 'Adding more control over the newsletter template',
    flag: 'emailCustomization'
}, {
    title: 'Email customization (internal alpha)',
    description: 'Wired up settings and updated email content',
    flag: 'emailCustomizationAlpha'
}, {
    title: 'Import Member Tier',
    description: 'Enables tier to be specified when importing members',
    flag: 'importMemberTier'
}, {
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
