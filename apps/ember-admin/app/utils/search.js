// Stable identifier for the billing search group — the display name is
// host-configurable (see getSearchables), so consumers must dispatch on this
// key rather than on the group name
export const BILLING_SEARCH_GROUP_KEY = 'billing';

export const DEFAULT_BILLING_GROUP_NAME = 'Ghost(Pro)';

// Default list of Ghost(Pro) billing pages/actions, indexed client-side rather
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
        keywords: 'billing subscription plan upgrade downgrade payment pricing price cost annual yearly monthly discount limit renew renewal'
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
        keywords: 'billing invoice receipt tax vat contact'
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
        name: DEFAULT_BILLING_GROUP_NAME,
        key: BILLING_SEARCH_GROUP_KEY,
        model: 'pro-page',
        pathField: 'id',
        idField: 'id',
        titleField: 'title',
        index: ['title', 'keywords'],
        staticItems: GHOST_PRO_SEARCH_ITEMS
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

// The billing group's entries are host-specific, so the group is opt-in: it
// only appears when hostSettings.billing.search is configured. Hosts can
// rename the group via groupName and replace its actions via items —
// Ghost(Pro)'s defaults fill anything left unset, so Ghost(Pro) opts in with
// an empty object. Custom entries need an id, a title, and a path
// deep-linking into the billing app (/pro/...); anything else is dropped
export function getSearchables(hostSettings) {
    const searchConfig = hostSettings?.billing?.search;

    if (!searchConfig) {
        return SEARCHABLES.filter(searchable => searchable.key !== BILLING_SEARCH_GROUP_KEY);
    }

    return SEARCHABLES.map((searchable) => {
        if (searchable.key !== BILLING_SEARCH_GROUP_KEY) {
            return searchable;
        }

        const customized = {...searchable};

        if (typeof searchConfig.groupName === 'string' && searchConfig.groupName.trim()) {
            customized.name = searchConfig.groupName.trim();
        }

        if (Array.isArray(searchConfig.items)) {
            customized.staticItems = searchConfig.items
                .filter(item => (
                    typeof item?.id === 'string' && item.id
                    && typeof item.title === 'string' && item.title
                    && typeof item.path === 'string' && /^\/pro(?:\/|$)/.test(item.path)
                ))
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    path: item.path,
                    keywords: typeof item.keywords === 'string' ? item.keywords : ''
                }));
        }

        return customized;
    });
}

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
        groupKey: searchable.key,
        status: item.status,
        visibility: item.visibility,
        publishedAt: item.published_at
    };
}
