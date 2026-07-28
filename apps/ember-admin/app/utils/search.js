export const GHOST_PRO_GROUP_NAME = 'Ghost(Pro)';

// Static list of Ghost(Pro) billing pages/actions, indexed client-side rather
// than fetched from the search-index API. Every entry shares the ghost/pro
// keywords appended below so searching the product name lists the whole group.
export const GHOST_PRO_SEARCH_ITEMS = [
    {
        id: 'start-subscription',
        title: 'Start subscription',
        path: '/pro/plans',
        keywords: 'billing subscription plan upgrade payment pricing price cost trial'
    },
    {
        id: 'change-plan',
        title: 'Change plan',
        path: '/pro/plans',
        keywords: 'billing subscription plan upgrade downgrade payment pricing price cost annual yearly monthly discount limit limits renew renewal'
    },
    {
        id: 'cancel-subscription',
        title: 'Cancel subscription',
        path: '/pro/plans',
        keywords: 'billing subscription plan cancel close delete account'
    },
    {
        id: 'view-invoices',
        title: 'View invoices',
        path: '/pro/billing',
        keywords: 'billing invoice invoices receipt tax vat billing contact'
    },
    {
        id: 'update-payment-method',
        title: 'Update payment method',
        path: '/pro/billing',
        keywords: 'billing payment method credit card expired declined failed'
    },
    {
        id: 'setup-custom-domain',
        title: 'Set up a custom domain',
        path: '/pro/domain',
        keywords: 'domain custom dns cname ssl url address'
    },
    {
        id: 'change-ghost-io-domain',
        title: 'Change ghost.io domain',
        path: '/pro/domain',
        keywords: 'domain subdomain ghost.io url address'
    },
    {
        id: 'buy-new-domain',
        title: 'Buy a new domain',
        path: '/pro/domain',
        keywords: 'domain buy purchase register new'
    },
    // note: 'export' is deliberately not a keyword for backups to avoid
    // colliding with content export (Settings → Import/Export)
    {
        id: 'request-backup',
        title: 'Request backup',
        path: '/pro/backups',
        keywords: 'backup request restore data'
    },
    {
        id: 'contact-support',
        title: 'Contact support',
        path: '/pro/support',
        keywords: 'support help contact email refund'
    }
].map(item => ({
    ...item,
    keywords: `ghost(pro) ghost pro ${item.keywords}`
}));

export const SEARCHABLES = [
    {
        name: 'Staff',
        model: 'user',
        pathField: 'slug',
        idField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        name: 'Tags',
        model: 'tag',
        pathField: 'slug',
        idField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        name: GHOST_PRO_GROUP_NAME,
        model: 'pro-page',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title', 'keywords'],
        staticItems: GHOST_PRO_SEARCH_ITEMS,
        requiresBillingAccess: true
    },
    {
        name: 'Posts',
        model: 'post',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title']
    },
    {
        name: 'Pages',
        model: 'page',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title']
    }
];

const STATUS_PRIORITY = {
    scheduled: 1,
    draft: 2,
    published: 3,
    sent: 4
};

export function sortSearchResultsByStatus(results, model) {
    if (model === 'post' || model === 'page') {
        results.sort((a, b) => {
            const aPriority = STATUS_PRIORITY[a.status] || 5;
            const bPriority = STATUS_PRIORITY[b.status] || 5;
            return aPriority - bPriority;
        });
    }
    return results;
}

export function createSearchResult(searchable, item) {
    const idField = searchable.idField || searchable.pathField;

    return {
        id: `${searchable.model}.${item[idField]}`,
        url: item.url,
        path: item.path,
        title: item[searchable.titleField],
        keywords: item.keywords,
        groupName: searchable.name,
        status: item.status,
        visibility: item.visibility,
        publishedAt: item.published_at
    };
}

// Searchables that require billing access (Ghost(Pro) pages) are only shown
// when the billing app is enabled for the site and the current user is allowed
// to open it (mirrors the access rules in the `pro` route)
export function isSearchableAvailable(searchable, {config, session}) {
    if (!searchable.requiresBillingAccess) {
        return true;
    }

    const billingEnabled = Boolean(config?.hostSettings?.billing?.enabled);
    const userCanAccessBilling = Boolean(session?.user?.isOwnerOnly) || Boolean(config?.hostSettings?.forceUpgrade);

    return billingEnabled && userCanAccessBilling;
}