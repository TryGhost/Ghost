import FeatureToggle from './feature-toggle';
import LabItem from './lab-item';
import React, { useEffect, useState } from 'react';
import { ActionList } from '@tryghost/shade/components';
import { HostLimitError } from '@tryghost/admin-x-framework/errors';
import { useLimiter } from '@tryghost/admin-x-framework/hooks';

type Feature = {
  title: string;
  description: string;
  flag: string;
  limitName?: string;
};

const features: Feature[] = [
  {
    title: 'Automations',
    description:
      'Toggle the automations beta. Unexpected problems can occur if you turn this off after previously turning it on.',
    flag: 'automations',
  },
  {
    title: 'Archive automations',
    description: 'Let members archive and restore automations.',
    flag: 'automationsArchive',
  },
  {
    title: 'Automations per tier',
    description: 'Allow automations to be configured for individual tiers.',
    flag: 'automationsPerTier',
  },
  {
    title: 'Automation run analytics',
    description: 'Track run-level analytics for automations.',
    flag: 'automationRunAnalytics',
  },
  {
    title: 'Stripe Automatic Tax (private beta)',
    description: 'Use Stripe Automatic Tax at Stripe Checkout. Needs to be enabled in Stripe',
    flag: 'stripeAutomaticTax',
  },
  {
    title: 'Import Member Tier',
    description: 'Enables tier to be specified when importing members',
    flag: 'importMemberTier',
  },
  {
    title: 'CSV Content Importer',
    description: 'Enables importing posts from CSV files in the Universal Importer',
    flag: 'csvContentImporter',
  },
  {
    title: 'Email Unique ID',
    description:
      'Enables {uniqueid} variable in emails for unique image URLs to bypass ESP image caching',
    flag: 'emailUniqueid',
  },
  {
    title: 'Updated theme translation (beta)',
    description: 'Enable theme translation using i18next instead of the old translation package.',
    flag: 'themeTranslation',
  },
  {
    title: 'Picture Element',
    description:
      'Use the HTML picture element to serve modern image formats (AVIF, WebP) with automatic fallbacks',
    flag: 'pictureImageFormats',
  },
  {
    title: 'Get helper deduplication',
    description:
      'Deduplicate identical {{#get}} helper queries within a single request to avoid redundant database calls',
    flag: 'getHelperDeduplication',
  },
  {
    title: 'Member custom fields',
    description:
      'Let admins create and manage custom field definitions for members, and choose which field each Stripe checkout answer is stored in',
    flag: 'membersCustomFields',
  },
  {
    title: 'Stripe checkout collection',
    description:
      'Let admins turn on shipping address, phone number and tax number collection for a tier, asked by Stripe checkout and stored against the member',
    flag: 'stripeCheckoutCollection',
  },
  {
    title: 'Stripe checkout design',
    description:
      'Let admins style the Stripe checkout page with their own button color, background color, corners and font',
    flag: 'stripeCheckoutDesign',
  },
  {
    title: 'Paywall improvements',
    description: 'Enables paywall usability, discoverability and email customization improvements',
    flag: 'paywallImprovements',
  },
  {
    title: 'React editor',
    description:
      'Serves the editor (/editor) from the React app instead of the Ember editor. Gates the migration behind a runtime toggle; the React side is an early placeholder.',
    flag: 'editorReact',
  },
  {
    title: 'Machine payments',
    description:
      'Let AI agents pay for access to paid-members markdown (.md) URLs via Stripe Machine Payments Protocol',
    flag: 'machinePayments',
  },
  {
    title: 'Navigation URL suggestions',
    description:
      'Suggest pages, posts, offers and Portal links when editing navigation URLs in settings',
    flag: 'navigationUrlSuggestions',
  },
  {
    title: 'React Ghost(Pro) billing',
    description:
      'Serves the Ghost(Pro) billing screen (/pro) and its background billing app connection from the React app instead of Ember.',
    flag: 'billingReact',
  },
  {
    title: 'Apps',
    description:
      'Install and manage third-party apps that run on their own servers. Early and incomplete.',
    flag: 'apps',
  },
];

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
      {allowedFeatures.map((feature) => (
        <LabItem
          key={feature.flag}
          action={<FeatureToggle flag={feature.flag} label={feature.title} />}
          detail={feature.description}
          title={feature.title}
        />
      ))}
    </ActionList>
  );
};

export default AlphaFeatures;
