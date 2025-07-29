import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import React, {useEffect, useState} from 'react';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {List} from '@tryghost/admin-x-design-system';

type Feature = {
    title: string;
    description: string;
    flag: string;
    limitName?: string;
};

const features: Feature[] = [{
    title: 'Stripe Automatic Tax (private beta)',
    description: 'Use Stripe Automatic Tax at Stripe Checkout. Needs to be enabled in Stripe',
    flag: 'stripeAutomaticTax'
}, {
    title: 'Email customization (internal beta)',
    description: 'Newsletter customization settings that have been released to Ghost\'s own production sites',
    flag: 'emailCustomization'
}, {
    title: 'Import Member Tier',
    description: 'Enables tier to be specified when importing members',
    flag: 'importMemberTier'
}, {
    title: 'Explore',
    description: 'Enables keeping in touch with the new Explore API',
    flag: 'explore'
}];

const AlphaFeatures: React.FC = () => {
    const limiter = useLimiter();
    const [allowedFeatures, setAllowedFeatures] = useState<Feature[]>([]);

    useEffect(() => {
        const filterFeatures = async () => {
            const filtered = [];
            // Remove all features that are limited according to the subscribed plan (given these are beta, is optional to use)
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
