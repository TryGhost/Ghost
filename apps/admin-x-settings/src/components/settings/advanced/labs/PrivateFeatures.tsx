import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import React, {useEffect, useState} from 'react';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {List} from '@tryghost/admin-x-design-system';

const features = [{
    title: 'Stripe Automatic Tax (private beta)',
    description: 'Use Stripe Automatic Tax at Stripe Checkout. Needs to be enabled in Stripe',
    flag: 'stripeAutomaticTax'
}, {
    title: 'Traffic Analytics (private beta)',
    description: 'Enables traffic analytics',
    flag: 'trafficAnalytics',
    limitName: 'limitAnalytics' // the limit name as set in hostSettings.limits in config.json
}, {
    title: 'Traffic Analytics (alpha)',
    description: 'Enables alpha stage analytics features',
    flag: 'trafficAnalyticsAlpha',
    limitName: 'limitAnalytics' // the limit name as set in hostSettings.limits in config.json
}, {
    title: 'Email customization (internal beta)',
    description: 'Newsletter customization settings that have been released to Ghost\'s own production sites',
    flag: 'emailCustomization'
}, {
    title: 'Import Member Tier',
    description: 'Enables tier to be specified when importing members',
    flag: 'importMemberTier'
}, {
    title: 'UI 6.0 (internal alpha)',
    description: 'General structural changes to the admin UI in 6.0',
    flag: 'ui60'
}, {
    title: 'Explore',
    description: 'Enables keeping in touch with the new Explore API',
    flag: 'explore'
}];

const AlphaFeatures: React.FC = () => {
    const limiter = useLimiter();
    const [allowedFeatures, setAllowedFeatures] = useState<typeof features>([]);

    useEffect(() => {
        const filterFeatures = async () => {
            const filtered = [];
            // Remove all features that are limited according to the subscribed plan
            for (const feature of features) {
                if (feature.limitName && limiter?.isLimited(feature.limitName)) {
                    try {
                        await limiter.errorIfWouldGoOverLimit(feature.limitName);
                        filtered.push(feature);
                    } catch (error) {
                        if (!(error instanceof HostLimitError)) {
                            filtered.push(feature);
                        }
                    }
                } else {
                    filtered.push(feature);
                }
            }
            setAllowedFeatures(filtered);
        };
        filterFeatures();
    }, [limiter]);

    return (
        <List titleSeparator={false}>
            {allowedFeatures.map(feature => (
                <LabItem
                    action={<FeatureToggle flag={feature.flag} label={feature.title} />}
                    detail={feature.description}
                    title={feature.title} />
            ))}
        </List>
    );
};

export default AlphaFeatures;
