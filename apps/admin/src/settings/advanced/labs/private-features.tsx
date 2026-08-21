import FeatureToggle from './feature-toggle';
import LabItem from './lab-item';
import React, {useEffect, useState} from 'react';
import {ActionList} from '@tryghost/shade/components';
import {HostLimitError, useLimiter} from '@/settings/hooks/use-limiter';

type Feature = {
    title: string;
    description: string;
    flag: string;
    limitName?: string;
};

const features: Feature[] = [{
    title: 'Automations',
    description: 'Toggle the automations beta. Unexpected problems can occur if you turn this off after previously turning it on.',
    flag: 'automations'
}, {
    title: 'Automation run analytics',
    description: 'Track run-level analytics for automations.',
    flag: 'automationRunAnalytics'
}, {
    title: 'Stripe Automatic Tax (private beta)',
    description: 'Use Stripe Automatic Tax at Stripe Checkout. Needs to be enabled in Stripe',
    flag: 'stripeAutomaticTax'
}, {
    title: 'Import Member Tier',
    description: 'Enables tier to be specified when importing members',
    flag: 'importMemberTier'
}, {
    title: 'CSV Content Importer',
    description: 'Enables importing posts from CSV files in the Universal Importer',
    flag: 'csvContentImporter'
}, {
    title: 'Admin UI Refresh',
    description: 'Enable Admin UI refresh (exploration)',
    flag: 'adminUIRefresh'
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
    title: 'Picture Element',
    description: 'Use the HTML picture element to serve modern image formats (AVIF, WebP) with automatic fallbacks',
    flag: 'pictureImageFormats'
}, {
    title: 'Get helper deduplication',
    description: 'Deduplicate identical {{#get}} helper queries within a single request to avoid redundant database calls',
    flag: 'getHelperDeduplication'
}, {
    title: 'Navigation icons & visibility',
    description: 'Add icons and member-visibility controls to navigation menu items. Requires theme support to render icons.',
    flag: 'navigationIcons'
}, {
    title: 'React tag details',
    description: 'Renders the tag detail screen (/tags/:slug) from the React app instead of the Ember screen. Gates the migration behind a runtime toggle so we can compare both implementations.',
    flag: 'tagDetailsReact'
}, {
    title: 'Member custom fields',
    description: 'Let admins create and manage custom field definitions for members',
    flag: 'membersCustomFields'
}, {
    title: 'Paywall improvements',
    description: 'Enables paywall usability, discoverability and email customization improvements',
    flag: 'paywallImprovements'
}, {
    title: 'Gift subscription durations and delivery',
    description: 'Enables 3 and 6-month gift subscriptions with immediate or scheduled email delivery',
    flag: 'giftSubCustomization'
}, {
    title: 'Self-serve archives',
    description: 'Replaces the individual export buttons with a single "Export data" flow for downloading a full site archive',
    flag: 'selfServeArchives'
}, {
    title: 'Machine payments',
    description: 'Let AI agents pay for access to paid-members markdown (.md) URLs via Stripe Machine Payments Protocol',
    flag: 'machinePayments'
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
        void filterFeatures();
    }, [limiter]);

    return (
        <ActionList>
            {allowedFeatures.map(feature => (
                <LabItem
                    key={feature.flag}
                    action={<FeatureToggle flag={feature.flag} label={feature.title} />}
                    detail={feature.description}
                    title={feature.title} />
            ))}
        </ActionList>
    );
};

export default AlphaFeatures;
