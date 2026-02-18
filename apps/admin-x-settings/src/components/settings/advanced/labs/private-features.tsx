import FeatureToggle from './feature-toggle';
import LabItem from './lab-item';
import React, {useEffect, useState} from 'react';
import {HostLimitError, useLimiter} from '../../../../hooks/use-limiter';
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
    title: 'Email Unique ID',
    description: 'Enables {uniqueid} variable in emails for unique image URLs to bypass ESP image caching',
    flag: 'emailUniqueid'
}, {
    title: 'Updated theme translation (beta)',
    description: 'Enable theme translation using i18next instead of the old translation package.',
    flag: 'themeTranslation'
}, {
    title: 'IndexNow',
    description: 'Automatically notify search engines when content is published or updated for faster indexing.',
    flag: 'indexnow'
}, {
    title: 'Featurebase Feedback',
    description: 'Display a Feedback menu item in the admin sidebar. Requires the new admin experience.',
    flag: 'featurebaseFeedback'
}, {
    title: 'Transistor',
    description: 'Enable Transistor podcast integration',
    flag: 'transistor'
}, {
    title: 'Inbox Links',
    description: 'Enable mail app links on signup/signin',
    flag: 'inboxlinks'
}, {
    title: 'Retention Offers',
    description: 'Enable retention offers for canceling members',
    flag: 'retentionOffers'
}, {
    title: 'Welcome Email Editor',
    description: 'Enable the new welcome email editor experience',
    flag: 'welcomeEmailEditor'
}, {
    title: 'Members Forward',
    description: 'Use the new React-based members list instead of the Ember implementation',
    flag: 'membersForward'
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
                    key={feature.flag}
                    action={<FeatureToggle flag={feature.flag} label={feature.title} />}
                    detail={feature.description}
                    title={feature.title} />
            ))}
        </List>
    );
};

export default AlphaFeatures;
