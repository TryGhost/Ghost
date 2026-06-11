import Handlebars from 'handlebars';

type HelperContext = {
    site: Record<string, unknown>;
    custom: Record<string, unknown>;
    member?: Record<string, unknown> | null;
    context?: string[];
    pagination?: {
        page?: number;
        pages?: number;
        next?: number | null;
        prev?: number | null;
    };
    __get?: (resource: string, options: Record<string, unknown>) => unknown;
};

const toArray = (value: unknown) => {
    if (Array.isArray(value)) {
        return value;
    }
    if (value === undefined || value === null) {
        return [];
    }
    return [value];
};

const getRootContext = (options?: Handlebars.HelperOptions) => {
    return ((options?.data?.root ?? {}) as HelperContext) ?? {};
};

const toString = (value: unknown) => {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
};

const toSafeString = (value: unknown) => {
    return new Handlebars.SafeString(toString(value));
};

const getCollection = (value: unknown) => {
    if (Array.isArray(value)) {
        return value;
    }
    return value ? [value] : [];
};

export const registerHelpers = (instance: typeof Handlebars) => {
    instance.registerHelper('asset', (assetPath: string) => {
        return `/assets/${assetPath}`;
    });

    // Mirrors ghost/core's getAnnouncementBarHelper: the bar script renders
    // either saved announcement settings or, in the settings modal's preview
    // (x-ghost-preview POST), the unsaved values from the header.
    const announcementBarTag = (root: {site?: {url?: string; _preview?: string; announcement_content?: string | null; announcement_visibility?: string[]}}) => {
        const escape = Handlebars.escapeExpression;
        const preview = root.site?._preview;
        const isFilled = Boolean(root.site?.announcement_content) && (root.site?.announcement_visibility ?? []).length > 0;
        if (!isFilled && !preview) {
            return '';
        }
        const siteUrl = toString(root.site?.url);
        const attrs: Record<string, string> = {
            'announcement-bar': siteUrl,
            'api-url': `${siteUrl.replace(/\/$/, '')}/members/api/announcement/`
        };
        if (preview) {
            const params = new URLSearchParams(preview);
            const announcement = params.get('announcement');
            if (!announcement || !params.has('announcement_vis')) {
                return '';
            }
            attrs.announcement = announcement;
            attrs['announcement-background'] = params.get('announcement_bg') ?? '';
            attrs.preview = 'true';
        }
        const dataAttrs = Object.entries(attrs).map(([key, value]) => `data-${key}="${escape(value)}"`).join(' ');
        return `<script defer src="/public/announcement-bar.min.js" ${dataAttrs} crossorigin="anonymous"></script>`;
    };

    instance.registerHelper('ghost_head', (options: Handlebars.HelperOptions) => {
        const root = getRootContext(options);
        const escape = Handlebars.escapeExpression;
        const description = escape(toString((root as {meta_description?: string}).meta_description ?? root.site?.description));
        const title = escape(toString((root as {meta_title?: string}).meta_title ?? root.site?.title ?? ''));
        const canonical = escape(toString((root as {canonical_url?: string}).canonical_url ?? root.site?.url ?? ''));
        const cover = escape(toString(root.site?.cover_image));
        const accent = escape(toString(root.site?.accent_color ?? '#FF1A75'));
        const twitter = escape(toString(root.site?.twitter ?? '@ghost'));
        const facebook = escape(toString(root.site?.facebook ?? 'https://www.facebook.com/ghost'));
        const tags = [
            description ? `<meta name="description" content="${description}">` : '',
            canonical ? `<link rel="canonical" href="${canonical}">` : '',
            `<meta name="referrer" content="no-referrer-when-downgrade">`,
            `<meta property="og:site_name" content="${title}">`,
            `<meta property="og:type" content="website">`,
            `<meta property="og:title" content="${title}">`,
            description ? `<meta property="og:description" content="${description}">` : '',
            canonical ? `<meta property="og:url" content="${canonical}">` : '',
            cover ? `<meta property="og:image" content="${cover}">` : '',
            cover ? `<meta property="og:image:width" content="1200">` : '',
            cover ? `<meta property="og:image:height" content="840">` : '',
            `<meta property="article:publisher" content="${facebook}">`,
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta name="twitter:title" content="${title}">`,
            description ? `<meta name="twitter:description" content="${description}">` : '',
            canonical ? `<meta name="twitter:url" content="${canonical}">` : '',
            cover ? `<meta name="twitter:image" content="${cover}">` : '',
            twitter ? `<meta name="twitter:site" content="${twitter}">` : '',
            cover ? `<script type="application/ld+json">${JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                publisher: {
                    '@type': 'Organization',
                    name: title,
                    url: canonical,
                    logo: {
                        '@type': 'ImageObject',
                        url: `${canonical.replace(/\/$/, '')}/favicon.ico`,
                        width: 48,
                        height: 48
                    }
                },
                url: canonical,
                name: title,
                image: {
                    '@type': 'ImageObject',
                    url: cover,
                    width: 1200,
                    height: 840
                },
                mainEntityOfPage: canonical,
                description
            })}</script>` : '',
            `<meta name="generator" content="Ghost">`,
            `<link rel="alternate" type="application/rss+xml" title="${title}" href="${canonical.replace(/\/$/, '')}/rss/">`,
            `<script defer src="/ghost/assets/portal/portal.min.js" data-i18n="true" data-ghost="${canonical}" data-key="dev" data-api="${canonical.replace(/\/$/, '')}/ghost/api/content/" data-locale="${toString(root.site?.locale ?? 'en')}" crossorigin="anonymous"></script>`,
            `<script defer src="/ghost/assets/sodo-search/sodo-search.min.js" data-key="dev" data-styles="/ghost/assets/sodo-search/main.css" data-sodo-search="${canonical}" data-locale="${toString(root.site?.locale ?? 'en')}" crossorigin="anonymous"></script>`,
            `<link href="${canonical.replace(/\/$/, '')}/webmentions/receive/" rel="webmention">`,
            `<script defer src="/public/cards.min.js"></script>`,
            `<link rel="stylesheet" type="text/css" href="/public/cards.min.css">`,
            `<script defer src="/public/member-attribution.min.js"></script>`,
            `<style>:root {--ghost-accent-color: ${accent};}</style>`,
            announcementBarTag(root)
        ].filter(Boolean);
        return new Handlebars.SafeString(tags.join('\n'));
    });
    instance.registerHelper('ghost_foot', () => new Handlebars.SafeString(''));
    instance.registerHelper('body_class', (options: Handlebars.HelperOptions) => {
        const root = getRootContext(options);
        const context = root.context ?? [];
        return context.map((item) => `${item}-template`).join(' ');
    });
    instance.registerHelper('post_class', () => '');
    instance.registerHelper('comments', () => new Handlebars.SafeString(''));
    instance.registerHelper('reading_time', function readingTimeHelper(this: unknown) {
        const html = (this as {html?: string}).html ?? '';
        const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.round(words / 200));
        return `${minutes} min read`;
    });

    instance.registerHelper('navigation', (options?: Handlebars.HelperOptions) => {
        const root = getRootContext(options);
        const isSecondary = options?.hash?.type === 'secondary';
        const items = toArray(
            isSecondary
                ? (root.site as {secondary_navigation?: unknown})?.secondary_navigation
                : (root.site as {navigation?: unknown})?.navigation
        ) as Array<{label?: string; url?: string}>;
        if (!items.length) {
            return new Handlebars.SafeString('');
        }
        const entries = items.map((item, index) => {
            const label = toString(item.label);
            const url = toString(item.url);
            const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const classes = [`nav-${slug}`, index === 0 ? 'nav-current' : ''].filter(Boolean).join(' ');
            return `<li class="${classes}" role="menuitem"><a href="${Handlebars.escapeExpression(url)}">${Handlebars.escapeExpression(label)}</a></li>`;
        });
        return new Handlebars.SafeString(`<ul class="nav" role="menu">\n${entries.join('\n')}\n</ul>`);
    });

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const formatDate = (date: Date, format: string) => {
        const pad = (value: number) => String(value).padStart(2, '0');
        return format
            .replace(/YYYY/g, String(date.getUTCFullYear()))
            .replace(/MMMM/g, monthsLong[date.getUTCMonth()] ?? '')
            .replace(/MMM/g, monthsShort[date.getUTCMonth()] ?? '')
            .replace(/MM/g, pad(date.getUTCMonth() + 1))
            .replace(/DD/g, pad(date.getUTCDate()))
            .replace(/HH/g, pad(date.getUTCHours()))
            .replace(/mm/g, pad(date.getUTCMinutes()));
    };

    instance.registerHelper('date', function dateHelper(this: unknown, ...args: unknown[]) {
        const options = args.pop() as Handlebars.HelperOptions | undefined;
        const explicit = args[0];
        const contextDate = (this as {published_at?: string | null})?.published_at;
        const raw = explicit ?? contextDate;
        const date = raw ? new Date(raw as string | number) : new Date();
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const format = (options?.hash?.format as string | undefined) ?? 'DD MMM YYYY';
        if (options?.hash?.timeago) {
            return date.toISOString();
        }
        return formatDate(date, format);
    });

    instance.registerHelper('img_url', (value: string) => value ?? '');

    instance.registerHelper('foreach', function foreachHelper(this: unknown, items: unknown, options: Handlebars.HelperOptions) {
        const array = toArray(items);
        if (!array.length) {
            return options.inverse(this);
        }
        const frame = options.data ? Handlebars.createFrame(options.data) : undefined;
        let result = '';
        array.forEach((item, index) => {
            if (frame) {
                frame.key = index;
                frame.index = index;
                frame.number = index + 1;
                frame.first = index === 0;
                frame.last = index === array.length - 1;
                frame.even = index % 2 === 1;
                frame.odd = index % 2 === 0;
                frame.rowStart = false;
                frame.rowEnd = false;
            }
            result += options.fn(item, {data: frame, blockParams: [item, index]});
        });
        return result;
    });

    instance.registerHelper('match', function matchHelper(this: unknown, ...rawArgs: unknown[]) {
        const options = rawArgs.pop() as Handlebars.HelperOptions;
        let [left, operator, right] = rawArgs;
        if (rawArgs.length === 2) {
            right = operator;
            operator = '=';
        } else if (rawArgs.length === 1) {
            right = true;
            operator = '=';
            left = Boolean(left);
        }

        const op = String(operator ?? '=');
        const leftValue = left ?? null;
        const rightValue = right ?? null;
        let isMatch: boolean;
        switch (op) {
        case '!=':
            isMatch = leftValue !== rightValue;
            break;
        case '>':
            isMatch = Number(leftValue) > Number(rightValue);
            break;
        case '<':
            isMatch = Number(leftValue) < Number(rightValue);
            break;
        case '>=':
            isMatch = Number(leftValue) >= Number(rightValue);
            break;
        case '<=':
            isMatch = Number(leftValue) <= Number(rightValue);
            break;
        default:
            isMatch = leftValue === rightValue;
        }

        // Subexpression form `(match a b)` has no block to render.
        if (typeof options?.fn !== 'function') {
            return isMatch;
        }
        return isMatch ? options.fn(this) : options.inverse(this);
    });

    instance.registerHelper('is', function isHelper(this: unknown, value: string, options: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        const context = root.context ?? [];
        const values = value.split(',').map((entry) => entry.trim()).filter(Boolean);
        const matched = values.some((entry) => context.includes(entry));
        return matched ? options.fn(this) : options.inverse(this);
    });

    instance.registerHelper('post', function postHelper(this: unknown, options: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        const post = (root as {post?: unknown}).post;
        if (!post) {
            return options.inverse(this);
        }
        return options.fn(post);
    });

    instance.registerHelper('primary_tag', function primaryTagHelper(this: unknown, options: Handlebars.HelperOptions) {
        const tag = (this as {primary_tag?: unknown}).primary_tag;
        if (!tag) {
            return options.inverse(this);
        }
        return options.fn(tag);
    });

    instance.registerHelper('content', function contentHelper(this: unknown) {
        const html = (this as {html?: string}).html ?? '';
        return new Handlebars.SafeString(html);
    });

    // Minimal NQL subset for the {{#get}} hash: `featured:true`, `featured:false`,
    // `tag:slug`, `author:slug`, and negated ids (`id:-X`), combined with `+`.
    const applyGetFilter = (items: unknown[], filter: string) => {
        const clauses = filter.split('+').map((clause) => clause.trim()).filter(Boolean);
        return items.filter((item) => {
            const record = item as {
                id?: string;
                featured?: boolean;
                tags?: Array<{slug?: string}>;
                authors?: Array<{slug?: string}>;
            };
            return clauses.every((clause) => {
                const [key, rawValue] = clause.split(':');
                const value = (rawValue ?? '').trim();
                switch (key?.trim()) {
                case 'featured':
                    return record.featured === (value === 'true');
                case 'tag':
                    return (record.tags ?? []).some((tag) => tag.slug === value);
                case 'author':
                    return (record.authors ?? []).some((author) => author.slug === value);
                case 'id':
                    return value.startsWith('-') ? record.id !== value.slice(1) : record.id === value;
                default:
                    return true;
                }
            });
        });
    };

    // Ghost resolves {{expr}} placeholders inside {{#get}} filter strings
    // (e.g. filter="id:-{{post.id}}") against the rendering context.
    const resolveFilterPlaceholders = (filter: string, current: unknown, root: Record<string, unknown>) => {
        return filter.replace(/\{\{([^}]+)\}\}/g, (_match, rawPath: string) => {
            const path = rawPath.trim().split('.');
            for (const source of [current, root]) {
                let value: unknown = source;
                for (const segment of path) {
                    value = (value as Record<string, unknown> | null | undefined)?.[segment];
                }
                if (value !== undefined && value !== null) {
                    return String(value);
                }
            }
            return '';
        });
    };

    instance.registerHelper('get', function getHelper(this: unknown, field: string, options: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        if (!field || typeof field !== 'string') {
            return options.inverse(this);
        }
        const getter = root.__get;
        let value = getter ? getter(field, options.hash ?? {}) : (root as Record<string, unknown>)[field];
        if (Array.isArray(value)) {
            const filter = options.hash?.filter;
            if (typeof filter === 'string' && filter.trim()) {
                value = applyGetFilter(value, resolveFilterPlaceholders(filter, this, root as Record<string, unknown>));
            }
            const limit = Number(options.hash?.limit);
            if (Number.isFinite(limit) && limit > 0) {
                value = (value as unknown[]).slice(0, limit);
            }
        }
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return options.inverse(this);
        }
        // Ghost's {{#get}} exposes the resource list as the first block param
        // (`as |posts pages|`) and renders the block with {resource, pagination}.
        const pagination = (root as {pagination?: unknown}).pagination ?? null;
        const context = Array.isArray(value) ? {[field]: value, pagination} : value;
        return options.fn(context, {
            data: options.data,
            blockParams: [value, pagination]
        });
    });

    instance.registerHelper('url', function urlHelper(this: unknown, options: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        const absolute = options.hash?.absolute === true || options.hash?.absolute === 'true';
        const url = (this as {url?: string}).url ?? root.site?.url ?? '';
        if (!absolute) {
            return url;
        }
        return url;
    });

    instance.registerHelper('meta_title', function metaTitleHelper(this: unknown, options: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        return toString((root as {meta_title?: string}).meta_title ?? root.site?.title ?? '');
    });

    instance.registerHelper('meta_description', function metaDescriptionHelper(this: unknown, options: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        return toString((root as {meta_description?: string}).meta_description ?? root.site?.description ?? '');
    });

    instance.registerHelper('title', function titleHelper(this: unknown) {
        return toString((this as {title?: string}).title ?? '');
    });

    instance.registerHelper('excerpt', function excerptHelper(this: unknown, options: Handlebars.HelperOptions) {
        const length = Number(options.hash?.words ?? 30);
        const html = (this as {custom_excerpt?: string | null; html?: string}).custom_excerpt
            ?? (this as {html?: string}).html
            ?? '';
        const text = html.replace(/<[^>]+>/g, ' ').trim();
        const words = text.split(/\s+/).filter(Boolean).slice(0, length);
        return words.join(' ');
    });

    instance.registerHelper('pagination', function paginationHelper(this: unknown, options: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        const pagination = root.pagination;
        if (!pagination) {
            return '';
        }
        const next = pagination.next ? `<a class="older-posts" href="/page/${pagination.next}/">Older Posts</a>` : '';
        const prev = pagination.prev ? `<a class="newer-posts" href="/page/${pagination.prev}/">Newer Posts</a>` : '';
        return new Handlebars.SafeString(`<nav class="pagination">${prev}${next}</nav>`);
    });

    instance.registerHelper('authors', function authorsHelper(this: unknown, options: Handlebars.HelperOptions) {
        const authors = getCollection((this as {authors?: unknown}).authors);
        if (!options?.fn) {
            return authors.map((author) => (author as {name?: string}).name ?? '').filter(Boolean).join(', ');
        }
        if (!authors.length) {
            return options.inverse ? options.inverse(this) : '';
        }
        return authors.map((author) => options.fn(author)).join('');
    });

    instance.registerHelper('tags', function tagsHelper(this: unknown, options: Handlebars.HelperOptions) {
        const tags = getCollection((this as {tags?: unknown}).tags);
        if (!options?.fn) {
            return tags.map((tag) => (tag as {name?: string}).name ?? '').filter(Boolean).join(', ');
        }
        if (!tags.length) {
            return options.inverse ? options.inverse(this) : '';
        }
        return tags.map((tag) => options.fn(tag)).join('');
    });

    instance.registerHelper('tiers', function tiersHelper(this: unknown, options: Handlebars.HelperOptions) {
        const tiers = getCollection((this as {tiers?: unknown}).tiers);
        if (!options?.fn) {
            return tiers.map((tier) => (tier as {name?: string}).name ?? '').filter(Boolean).join(', ');
        }
        if (!tiers.length) {
            return options.inverse ? options.inverse(this) : '';
        }
        return tiers.map((tier) => options.fn(tier)).join('');
    });

    instance.registerHelper('has', function hasHelper(this: unknown, value: string, options?: Handlebars.HelperOptions) {
        const root = getRootContext(options);
        if (options?.hash?.visibility) {
            const visibility = (this as {visibility?: string}).visibility ?? 'public';
            const values = String(options.hash.visibility)
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean);
            const matched = values.includes(visibility);
            return matched ? options.fn(this) : options.inverse ? options.inverse(this) : '';
        }
        const context = root.context ?? [];
        const values = toString(value)
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
        const matched = values.some((entry) => context.includes(entry));
        if (!options?.fn) {
            return '';
        }
        return matched ? options.fn(this) : options.inverse ? options.inverse(this) : '';
    });

    instance.registerHelper('concat', (...args: unknown[]) => {
        const options = args.pop() as Handlebars.HelperOptions;
        return args.map(toString).join('');
    });

    instance.registerHelper('encode', (value: string) => encodeURIComponent(value ?? ''));
    instance.registerHelper('raw', (value: string) => new Handlebars.SafeString(value ?? ''));
    instance.registerHelper('split', (value: string, separator: string) => {
        return toString(value).split(separator ?? ',');
    });
    instance.registerHelper('readable_url', (value: string) => value ?? '');
    instance.registerHelper('link_class', () => '');
    instance.registerHelper('collection', () => '');
    instance.registerHelper('page_url', (value: string) => value ?? '');
    instance.registerHelper('comment_count', () => '');
    instance.registerHelper('recommendations', () => new Handlebars.SafeString(''));
    instance.registerHelper('link', (value: string) => value ?? '');
    instance.registerHelper('cancel_link', () => '');
    instance.registerHelper('search', () => new Handlebars.SafeString(''));
    instance.registerHelper('content_api_url', () => '');
    instance.registerHelper('content_api_key', () => '');
    instance.registerHelper('total_members', () => '');
    instance.registerHelper('total_paid_members', () => '');
    instance.registerHelper('plural', (value: number) => value ?? 0);
    instance.registerHelper('price', (value: string) => value ?? '');
    instance.registerHelper('prev_post', () => '');
    instance.registerHelper('social_url', () => '');
    instance.registerHelper('facebook_url', () => '');
    instance.registerHelper('twitter_url', () => '');
    instance.registerHelper('t', (value: string) => value ?? '');
};
