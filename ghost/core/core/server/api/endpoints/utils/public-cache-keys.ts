/**
 * Cache-key data helpers shared by the public posts/pages endpoints. Every
 * dimension that changes what a read returns (requested options, the
 * requester's access level, gift-link access) must contribute to the key, or
 * a cached variant leaks across requests that should see different content.
 */

interface CacheKeyFrame {
    options?: {
        [key: string]: unknown;
        context?: {
            member?: {
                status?: string;
                products?: Array<{slug: string}>;
            };
        };
    };
}

export function generateOptionsData(frame: CacheKeyFrame, options: string[]): Record<string, unknown> {
    return options.reduce((memo, option) => {
        let value = frame.options?.[option];

        if (['include', 'fields', 'formats'].includes(option) && typeof value === 'string') {
            value = value.split(',').sort();
        }

        if (option === 'page') {
            value = value || 1;
        }

        return {
            ...memo,
            [option]: value
        };
    }, {});
}

export function generateAuthData(frame: CacheKeyFrame): {free: boolean; tiers: string[] | undefined} | undefined {
    const member = frame.options?.context?.member;
    if (member) {
        return {
            free: member.status === 'free',
            tiers: member.products?.map(product => product.slug).sort()
        };
    }
}
