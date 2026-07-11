import {adminHref, commentsHref} from './links';

export function getToolbarActions(config) {
    if (config.pageContext === 'home') {
        return getHomepageActions(config);
    }

    if (config.resourceType === 'post' && config.resourceId) {
        return getPostActions(config);
    }

    if (config.resourceType === 'tag' && config.resourceSlug) {
        return [{
            href: adminHref(config.adminUrl, `tags/${encodeURIComponent(config.resourceSlug)}`),
            icon: 'edit',
            label: 'Edit'
        }];
    }

    if (config.resourceType && config.resourceId) {
        return [{
            href: adminHref(config.adminUrl, `editor/${config.resourceType}/${config.resourceId}`),
            icon: 'edit',
            label: 'Edit'
        }];
    }

    return [];
}

function getHomepageActions(config) {
    const actions = [];

    if (config.siteAnalyticsEnabled) {
        actions.push({
            href: adminHref(config.adminUrl, 'analytics'),
            icon: 'siteAnalytics',
            label: 'Analytics'
        });
    }

    if (config.activityPubEnabled) {
        actions.push({
            href: adminHref(config.adminUrl, 'activitypub'),
            icon: 'network',
            label: 'Network'
        });
    }

    actions.push({
        href: adminHref(config.adminUrl, 'posts/'),
        icon: 'posts',
        label: 'Posts'
    });

    if (config.membersEnabled) {
        actions.push({
            href: adminHref(config.adminUrl, 'members'),
            icon: 'members',
            label: 'Members'
        });
    }

    actions.push({
        href: adminHref(config.adminUrl, 'settings'),
        icon: 'settings',
        label: 'Settings'
    });

    return actions;
}

function getPostActions(config) {
    const actions = [
        {
            href: adminHref(config.adminUrl, `posts/analytics/${config.resourceId}`),
            icon: 'analytics',
            label: 'Analytics'
        },
        {
            href: adminHref(config.adminUrl, `editor/${config.resourceType}/${config.resourceId}`),
            icon: 'edit',
            label: 'Edit'
        }
    ];

    if (config.commentsEnabled) {
        actions.push({
            href: commentsHref(config.adminUrl, config.resourceId),
            icon: 'comments',
            label: 'Comments'
        });
    }

    return actions;
}
