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
}, {
    title: 'Tags X',
    description: 'Enables the new Tags UI',
    flag: 'tagsX'
}, {
    title: 'UTM tracking',
    description: 'Enables UTM tracking for web traffic and member attribution',
    flag: 'utmTracking'
}, {
    title: 'Email Unique ID',
    description: 'Enables {uniqueid} variable in emails for unique image URLs to bypass ESP image caching',
    flag: 'emailUniqueid'
}, {
    title: 'Welcome Emails',
    description: 'Enables features related to sending welcome emails to new members',
    flag: 'welcomeEmails'
}, {
    title: 'New Admin Experience',
    description: 'Try the new React-based admin interface. Only available on ghost.io',
    flag: 'adminForward'
}, {
    title: 'Domain Warmup',
    description: 'Enable custom sending domain warmup for gradual email volume increases',
    flag: 'domainWarmup'
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
