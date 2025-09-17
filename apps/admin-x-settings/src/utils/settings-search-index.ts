/**
 * Settings Search Index
 * Centralized configuration for searchable settings sections
 * This should be kept in sync with ghost/core/core/shared/settings-search-index.js
 */

export interface SettingConfig {
    title: string;
    path: string;
    navid: string;
    keywords: string[];
}

export interface SettingsSection {
    [key: string]: SettingConfig;
}

export interface SettingsSearchIndex {
    general: SettingsSection;
    site: SettingsSection;
    membership: SettingsSection;
    growth: SettingsSection;
    email: SettingsSection;
    advanced: SettingsSection;
}

export const SETTINGS_SEARCH_INDEX: SettingsSearchIndex = {
    general: {
        titleAndDescription: {
            title: 'Title & description',
            path: 'general',
            navid: 'general',
            keywords: ['general', 'title and description', 'site title', 'site description', 'title & description']
        },
        timeZone: {
            title: 'Timezone',
            path: 'timezone',
            navid: 'timezone',
            keywords: ['general', 'time', 'date', 'site timezone', 'time zone']
        },
        publicationLanguage: {
            title: 'Publication language',
            path: 'publication-language',
            navid: 'publication-language',
            keywords: ['general', 'publication language', 'locale']
        },
        users: {
            title: 'Staff',
            path: 'staff',
            navid: 'staff',
            keywords: ['general', 'users and permissions', 'roles', 'staff', 'invite people', 'contributors', 'editors', 'authors', 'administrators']
        },
        metadata: {
            title: 'Meta data',
            path: 'metadata',
            navid: 'metadata',
            keywords: ['general', 'metadata', 'title', 'description', 'search', 'engine', 'google', 'meta data', 'twitter card', 'structured data', 'rich cards', 'x card', 'social', 'facebook card']
        },
        socialAccounts: {
            title: 'Social accounts',
            path: 'social-accounts',
            navid: 'social-accounts',
            keywords: ['general', 'social accounts', 'facebook', 'twitter', 'structured data', 'rich cards']
        },
        lockSite: {
            title: 'Make this site private',
            path: 'locksite',
            navid: 'locksite',
            keywords: ['general', 'password protection', 'lock site', 'make this site private']
        },
        analytics: {
            title: 'Analytics',
            path: 'analytics',
            navid: 'analytics',
            keywords: ['membership', 'analytics', 'tracking', 'privacy', 'membership']
        }
    },
    site: {
        design: {
            title: 'Design & branding',
            path: 'design',
            navid: 'design',
            keywords: ['site', 'logo', 'cover', 'colors', 'fonts', 'background', 'themes', 'appearance', 'style', 'design & branding', 'design and branding']
        },
        theme: {
            title: 'Theme',
            path: 'theme',
            navid: 'theme',
            keywords: ['theme', 'template', 'upload']
        },
        navigation: {
            title: 'Navigation',
            path: 'navigation',
            navid: 'navigation',
            keywords: ['site', 'navigation', 'menus', 'primary', 'secondary', 'links']
        },
        announcementBar: {
            title: 'Announcement bar',
            path: 'announcement-bar',
            navid: 'announcement-bar',
            keywords: ['site', 'announcement bar', 'important', 'banner']
        }
    },
    membership: {
        access: {
            title: 'Access',
            path: 'members',
            navid: 'members',
            keywords: ['membership', 'default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting', 'signup', 'sign up', 'spam', 'filters', 'prevention', 'prevent', 'block', 'domains', 'email']
        },
        tiers: {
            title: 'Tiers',
            path: 'tiers',
            navid: 'tiers',
            keywords: ['membership', 'tiers', 'payment', 'paid', 'stripe']
        },
        portal: {
            title: 'Signup portal',
            path: 'portal',
            navid: 'portal',
            keywords: ['membership', 'portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership', 'support', 'email', 'address', 'support email address', 'support address', 'signup portal']
        },
        tips: {
            title: 'Tips & donations',
            path: 'tips-and-donations',
            navid: 'tips-and-donations',
            keywords: ['growth', 'tips', 'donations', 'one time', 'payment', 'tips & donations', 'tips and donations']
        },
        spamFilters: {
            title: 'Spam filters',
            path: 'spam-filters',
            navid: 'spam-filters',
            keywords: ['membership', 'spam', 'filters', 'prevention', 'prevent', 'block', 'domains', 'email']
        }
    },
    growth: {
        network: {
            title: 'Network',
            path: 'network',
            navid: 'network',
            keywords: ['growth', 'network', 'activitypub', 'blog', 'fediverse', 'sharing']
        },
        explore: {
            title: 'Ghost Explore',
            path: 'explore',
            navid: 'explore',
            keywords: ['ghost explore', 'explore', 'growth', 'share', 'list', 'listing']
        },
        recommendations: {
            title: 'Recommendations',
            path: 'recommendations',
            navid: 'recommendations',
            keywords: ['growth', 'recommendations', 'recommend', 'blogroll']
        },
        embedSignupForm: {
            title: 'Signup forms',
            path: 'embed-signup-form',
            navid: 'embed-signup-form',
            keywords: ['growth', 'embeddable signup form', 'embeddable form', 'embeddable sign up form', 'embeddable sign up', 'signup forms', 'sign up forms']
        },
        offers: {
            title: 'Offers',
            path: 'offers',
            navid: 'offers',
            keywords: ['growth', 'offers', 'discounts', 'coupons', 'promotions']
        }
    },
    email: {
        enableNewsletters: {
            title: 'Newsletters',
            path: 'enable-newsletters',
            navid: 'enable-newsletters',
            keywords: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off']
        },
        newsletters: {
            title: 'Newsletters',
            path: 'newsletters',
            navid: 'newsletters',
            keywords: ['newsletters', 'emails', 'design', 'customization']
        },
        defaultRecipients: {
            title: 'Default recipients',
            path: 'default-recipients',
            navid: 'default-recipients',
            keywords: ['newsletters', 'default recipients', 'emails']
        },
        mailgun: {
            title: 'Mailgun',
            path: 'mailgun',
            navid: 'mailgun',
            keywords: ['mailgun', 'emails', 'newsletters']
        }
    },
    advanced: {
        integrations: {
            title: 'Integrations',
            path: 'integrations',
            navid: 'integrations',
            keywords: ['advanced', 'integrations', 'zapier', 'slack', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github', 'webhooks']
        },
        migrationtools: {
            title: 'Import/Export',
            path: 'migration',
            navid: 'migration',
            keywords: ['import', 'export', 'migrate', 'substack', 'substack', 'migration', 'medium', 'wordpress', 'wp', 'squarespace', 'import/export', 'import export']
        },
        codeInjection: {
            title: 'Code injection',
            path: 'code-injection',
            navid: 'code-injection',
            keywords: ['advanced', 'code injection', 'head', 'footer']
        },
        labs: {
            title: 'Labs',
            path: 'labs',
            navid: 'labs',
            keywords: ['advanced', 'labs', 'alpha', 'private', 'beta', 'flag', 'routes', 'redirect', 'translation', 'editor', 'portal']
        },
        history: {
            title: 'History',
            path: 'history',
            navid: 'history',
            keywords: ['advanced', 'history', 'log', 'events', 'user events', 'staff', 'audit', 'action']
        },
        dangerzone: {
            title: 'Danger zone',
            path: 'dangerzone',
            navid: 'dangerzone',
            keywords: ['danger', 'danger zone', 'delete', 'content', 'delete all content', 'delete site']
        }
    }
};

// Helper function to generate section title mappings (navid -> title)
export function getSectionTitles(): Record<string, string> {
    const titles: Record<string, string> = {};

    Object.values(SETTINGS_SEARCH_INDEX).forEach((section) => {
        Object.values(section).forEach((setting) => {
            titles[setting.navid] = setting.title;
        });
    });

    return titles;
}

// Helper function to get keywords for a specific navid
export function getKeywordsByNavId(navid: string): string[] {
    for (const section of Object.values(SETTINGS_SEARCH_INDEX)) {
        for (const setting of Object.values(section)) {
            if (setting.navid === navid) {
                return setting.keywords;
            }
        }
    }
    return [];
}

// Helper function to get settings organized by section
export function getSettingsBySection(): Record<string, Record<string, string[]>> {
    const result: Record<string, Record<string, string[]>> = {};

    Object.entries(SETTINGS_SEARCH_INDEX).forEach(([sectionKey, section]) => {
        result[sectionKey] = {};
        Object.entries(section).forEach(([settingKey, setting]) => {
            result[sectionKey][settingKey] = setting.keywords;
        });
    });

    return result;
}

// Export the keyword mappings for backwards compatibility
export const searchKeywords = getSettingsBySection();