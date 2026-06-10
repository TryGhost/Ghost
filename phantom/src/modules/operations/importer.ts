import {inArray, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    authorProfileTable,
    collectionTable,
    postAuthorTable,
    postTable,
    postTagTable,
    tagTable
} from '../content/db.js';
import {roleTable, staffRoleTable, staffTable} from '../identity/db.js';
import {memberTable} from '../members/db.js';
import {issueTable, newsletterMembershipTable, newsletterTable} from '../newsletters/db.js';
import {planTable, priceTable} from '../subscriptions/db.js';
import {settingTable} from '../settings/db.js';
import {commentTable} from '../comments/db.js';

type ExportRecord = Record<string, unknown>;

type ExportData = Record<string, ExportRecord[]>;

export type ImportCounts = {
    posts: number;
    tags: number;
    postTags: number;
    authors: number;
    postAuthors: number;
    staff: number;
    roles: number;
    newsletters: number;
    issues: number;
    memberships: number;
    collections: number;
    plans: number;
    prices: number;
    settings: number;
    members: number;
    comments: number;
};

export type GhostImporter = {
    importExport: (payload: unknown) => Promise<ImportCounts>;
};

// Settings keys from legacy Ghost exports mapped onto phantom's namespaced keys.
const settingKeyMap: Record<string, string> = {
    title: 'site.title',
    description: 'site.description',
    logo: 'site.logo',
    icon: 'site.icon',
    cover_image: 'site.cover_image',
    accent_color: 'site.accent_color',
    locale: 'site.locale',
    timezone: 'site.timezone',
    facebook: 'site.facebook',
    twitter: 'site.twitter',
    navigation: 'site.navigation',
    secondary_navigation: 'site.secondary_navigation',
    codeinjection_head: 'site.codeinjection_head',
    codeinjection_foot: 'site.codeinjection_foot',
    active_theme: 'theme.active',
    members_signup_access: 'members.signup_access',
    default_content_visibility: 'members.default_content_visibility'
};

// Settings whose exported value is itself a JSON string and must not be
// double-encoded.
const jsonValueSettings = new Set(['navigation', 'secondary_navigation']);

const emptyLexical = JSON.stringify({root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}});

export const unwrapExport = (payload: unknown): ExportData => {
    if (typeof payload !== 'object' || payload === null) {
        throw new Error('invalid_export: payload is not an object');
    }
    const record = payload as ExportRecord;
    if (Array.isArray(record.db) && record.db.length > 0) {
        return unwrapExport(record.db[0]);
    }
    if (typeof record.data === 'object' && record.data !== null) {
        return record.data as ExportData;
    }
    throw new Error('invalid_export: missing data section');
};

const table = (data: ExportData, name: string): ExportRecord[] => {
    const rows = data[name];
    return Array.isArray(rows) ? rows : [];
};

const asString = (value: unknown, fallback = '') => {
    return typeof value === 'string' ? value : fallback;
};

const asNullableString = (value: unknown) => {
    return typeof value === 'string' && value !== '' ? value : null;
};

const toTimestamp = (value: unknown, fallback?: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return fallback ?? Date.now();
};

const toNullableTimestamp = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    return toTimestamp(value);
};

const slugify = (value: string) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') || 'untitled';
};

// Posts exported from current-day Ghost may carry mobiledoc-only content with
// rendered html. Phantom is lexical-native, so html is preserved verbatim in a
// lexical html card to keep the content renderable and re-editable as raw html.
const buildLexical = (record: ExportRecord) => {
    const lexical = asNullableString(record.lexical);
    if (lexical) {
        return lexical;
    }
    const html = asNullableString(record.html);
    if (html) {
        return JSON.stringify({
            root: {
                children: [{type: 'html', version: 1, html}],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
    }
    return emptyLexical;
};

const knownStatuses = new Set(['published', 'draft', 'scheduled', 'sent']);

const chunk = <T>(items: T[], size: number) => {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
};

type SqlExecutor = Pick<DbClient, 'insert' | 'delete' | 'select'>;

type AnyTable = Parameters<DbClient['insert']>[0];

const upsertAll = async (
    executor: SqlExecutor,
    target: AnyTable,
    rows: Array<Record<string, unknown>>,
    conflictTarget: unknown,
    updateColumns: string[]
) => {
    for (const batch of chunk(rows, 100)) {
        if (updateColumns.length === 0) {
            await executor.insert(target).values(batch as never).onConflictDoNothing();
        } else {
            const setClause = Object.fromEntries(
                updateColumns.map((column) => [column, sql.raw(`excluded."${column}"`)])
            );
            await executor
                .insert(target)
                .values(batch as never)
                .onConflictDoUpdate({
                    target: conflictTarget as never,
                    set: setClause as never
                });
        }
    }
    return rows.length;
};

export const createGhostImporter = (db: DbClient): GhostImporter => {
    const importExport = async (payload: unknown): Promise<ImportCounts> => {
        const data = unwrapExport(payload);

        const posts = table(data, 'posts').map((post) => {
            const status = asString(post.status, 'draft');
            const createdAt = toTimestamp(post.created_at ?? post.createdAt);
            const updatedAt = toTimestamp(post.updated_at ?? post.updatedAt, createdAt);
            return {
                id: asString(post.id),
                uuid: asNullableString(post.uuid),
                title: asString(post.title, 'Untitled'),
                slug: asString(post.slug) || slugify(asString(post.title, 'untitled')),
                type: asString(post.type) === 'page' ? 'page' : 'post',
                status: knownStatuses.has(status) ? status : 'draft',
                lexical: buildLexical(post),
                html: asNullableString(post.html),
                visibility: asString(post.visibility, 'public'),
                featured: post.featured ? 1 : 0,
                customExcerpt: asNullableString(post.custom_excerpt ?? post.customExcerpt),
                featureImage: asNullableString(post.feature_image ?? post.featureImage),
                featureImageAlt: asNullableString(post.feature_image_alt ?? post.featureImageAlt),
                featureImageCaption: asNullableString(post.feature_image_caption ?? post.featureImageCaption),
                codeinjectionHead: asNullableString(post.codeinjection_head),
                codeinjectionFoot: asNullableString(post.codeinjection_foot),
                canonicalUrl: asNullableString(post.canonical_url ?? post.canonicalUrl),
                customTemplate: asNullableString(post.custom_template ?? post.customTemplate),
                publishedAt: toNullableTimestamp(post.published_at ?? post.publishedAt),
                createdAt,
                updatedAt
            };
        }).filter((post) => post.id);

        const tags = table(data, 'tags').map((tag) => ({
            id: asString(tag.id),
            name: asString(tag.name, 'Tag'),
            slug: asString(tag.slug) || slugify(asString(tag.name, 'tag')),
            description: asNullableString(tag.description),
            featureImage: asNullableString(tag.feature_image),
            visibility: asString(tag.visibility, 'public')
        })).filter((tag) => tag.id);

        const postIds = new Set(posts.map((post) => post.id));
        const tagIds = new Set(tags.map((tag) => tag.id));

        const postTags = table(data, 'posts_tags').map((link) => ({
            postId: asString(link.post_id ?? link.postId),
            tagId: asString(link.tag_id ?? link.tagId),
            sortOrder: typeof link.sort_order === 'number' ? link.sort_order : 0
        })).filter((link) => postIds.has(link.postId) && tagIds.has(link.tagId));

        const users = table(data, 'users');
        const authors = users.map((user) => ({
            id: asString(user.id),
            name: asString(user.name) || asString(user.slug, 'Author'),
            slug: asString(user.slug) || slugify(asString(user.name, 'author')),
            bio: asNullableString(user.bio),
            email: asNullableString(user.email),
            profileImage: asNullableString(user.profile_image),
            coverImage: asNullableString(user.cover_image),
            website: asNullableString(user.website),
            location: asNullableString(user.location)
        })).filter((author) => author.id);

        const authorIds = new Set(authors.map((author) => author.id));
        const postAuthors = table(data, 'posts_authors').map((link) => ({
            postId: asString(link.post_id ?? link.postId),
            authorId: asString(link.author_id ?? link.authorId),
            sortOrder: typeof link.sort_order === 'number' ? link.sort_order : 0
        })).filter((link) => postIds.has(link.postId) && authorIds.has(link.authorId));

        const roles = table(data, 'roles').map((role) => ({
            id: asString(role.id),
            name: asString(role.name)
        })).filter((role) => role.id && role.name);
        const roleIds = new Set(roles.map((role) => role.id));

        const roleUsers = table(data, 'roles_users').map((link) => ({
            staffId: asString(link.user_id ?? link.userId),
            roleId: asString(link.role_id ?? link.roleId)
        })).filter((link) => link.staffId && roleIds.has(link.roleId));

        // Only users holding a role are staff; everyone else is an author profile only.
        const staffIds = new Set(roleUsers.map((link) => link.staffId));
        const staff = users
            .filter((user) => staffIds.has(asString(user.id)))
            .map((user) => {
                const createdAt = toTimestamp(user.created_at ?? user.createdAt);
                return {
                    id: asString(user.id),
                    email: asString(user.email),
                    name: asString(user.name, 'Staff'),
                    status: asString(user.status, 'active'),
                    passwordHash: asString(user.password),
                    twoFactorEnabled: 0,
                    externalSubjectId: null,
                    externallyManaged: 0,
                    createdAt,
                    updatedAt: toTimestamp(user.updated_at ?? user.updatedAt, createdAt)
                };
            })
            .filter((account) => account.email);

        const newsletters = table(data, 'newsletters').map((newsletter) => {
            const createdAt = toTimestamp(newsletter.created_at ?? newsletter.createdAt);
            return {
                id: asString(newsletter.id),
                name: asString(newsletter.name, 'Newsletter'),
                slug: asNullableString(newsletter.slug),
                description: asNullableString(newsletter.description),
                senderName: asNullableString(newsletter.sender_name),
                senderEmail: asNullableString(newsletter.sender_email),
                senderReplyTo: asNullableString(newsletter.sender_reply_to),
                status: asString(newsletter.status, 'active'),
                subscribeOnSignup: newsletter.subscribe_on_signup ? 1 : 0,
                sortOrder: typeof newsletter.sort_order === 'number' ? newsletter.sort_order : 0,
                createdAt,
                updatedAt: toTimestamp(newsletter.updated_at ?? newsletter.updatedAt, createdAt)
            };
        }).filter((newsletter) => newsletter.id);

        const newsletterIds = new Set(newsletters.map((newsletter) => newsletter.id));

        // Legacy `emails` rows become newsletter issues.
        const issues = table(data, 'emails').map((email) => {
            const createdAt = toTimestamp(email.created_at ?? email.createdAt);
            return {
                id: asString(email.id),
                newsletterId: asString(email.newsletter_id ?? email.newsletterId) || (newsletters[0]?.id ?? ''),
                subject: asString(email.subject, 'Email'),
                status: asString(email.status, 'draft'),
                sendAt: toNullableTimestamp(email.send_at ?? email.submitted_at),
                createdAt,
                updatedAt: toTimestamp(email.updated_at ?? email.updatedAt, createdAt)
            };
        }).filter((issue) => issue.id && issue.newsletterId);

        const memberships = table(data, 'members_newsletters').map((entry) => {
            const newsletterId = asString(entry.newsletter_id ?? entry.newsletterId);
            const memberId = asString(entry.member_id ?? entry.memberId);
            const createdAt = toTimestamp(entry.created_at ?? entry.createdAt);
            return {
                id: `${newsletterId}:${memberId}`,
                newsletterId,
                memberId,
                status: asString(entry.status, 'subscribed'),
                createdAt,
                updatedAt: toTimestamp(entry.updated_at ?? entry.updatedAt, createdAt)
            };
        }).filter((entry) => entry.newsletterId && entry.memberId && newsletterIds.has(entry.newsletterId));

        const collections = table(data, 'collections').map((collection) => ({
            id: asString(collection.id),
            name: asString(collection.title ?? collection.name, 'Collection'),
            slug: asString(collection.slug) || slugify(asString(collection.title ?? collection.name, 'collection')),
            filter: asString(collection.filter, '')
        })).filter((collection) => collection.id);

        const products = table(data, 'products');
        const plans = products.map((product) => {
            const createdAt = toTimestamp(product.created_at ?? product.createdAt);
            return {
                id: asString(product.id),
                name: asString(product.name, 'Tier'),
                slug: asNullableString(product.slug),
                description: asNullableString(product.description),
                type: asString(product.type) === 'free' ? 'free' : 'paid',
                active: product.active ? 1 : 0,
                visibility: asString(product.visibility, 'public'),
                trialDays: typeof product.trial_days === 'number' ? product.trial_days : 0,
                welcomePageUrl: asNullableString(product.welcome_page_url),
                createdAt,
                updatedAt: toTimestamp(product.updated_at ?? product.updatedAt, createdAt)
            };
        }).filter((plan) => plan.id);

        const prices = products.flatMap((product) => {
            const planId = asString(product.id);
            const currency = asString(product.currency, 'USD');
            const entries: Array<{id: string; planId: string; cadence: string; amount: number; currency: string}> = [];
            if (typeof product.monthly_price === 'number') {
                entries.push({id: `${planId}:month`, planId, cadence: 'month', amount: product.monthly_price, currency});
            }
            if (typeof product.yearly_price === 'number') {
                entries.push({id: `${planId}:year`, planId, cadence: 'year', amount: product.yearly_price, currency});
            }
            return entries;
        });

        const now = Date.now();
        const settingsRows: Array<{id: string; key: string; group: string; type: string; value: string; createdAt: number; updatedAt: number}> = [];
        let activeTheme: string | null = null;
        for (const setting of table(data, 'settings')) {
            const legacyKey = asString(setting.key);
            if (legacyKey === 'active_theme') {
                activeTheme = asNullableString(setting.value);
            }
            const mappedKey = settingKeyMap[legacyKey];
            if (!mappedKey) {
                continue;
            }
            const rawValue = setting.value;
            const value = jsonValueSettings.has(legacyKey) && typeof rawValue === 'string'
                ? rawValue
                : JSON.stringify(rawValue ?? null);
            const createdAt = toTimestamp(setting.created_at ?? setting.createdAt, now);
            settingsRows.push({
                id: mappedKey,
                key: mappedKey,
                group: mappedKey.split('.')[0] ?? 'site',
                type: asString(setting.type, 'string'),
                value,
                createdAt,
                updatedAt: toTimestamp(setting.updated_at ?? setting.updatedAt, createdAt)
            });
        }

        // Custom theme settings are scoped per theme in the export; only the
        // active theme's values become phantom's theme.custom setting.
        const customThemeSettings = table(data, 'custom_theme_settings')
            .filter((entry) => !activeTheme || asString(entry.theme) === activeTheme);
        if (customThemeSettings.length > 0) {
            const custom = Object.fromEntries(
                customThemeSettings
                    .filter((entry) => asString(entry.key))
                    .map((entry) => [asString(entry.key), entry.value ?? null])
            );
            settingsRows.push({
                id: 'theme.custom',
                key: 'theme.custom',
                group: 'theme',
                type: 'json',
                value: JSON.stringify(custom),
                createdAt: now,
                updatedAt: now
            });
        }

        const members = table(data, 'members').map((member) => {
            const createdAt = toTimestamp(member.created_at ?? member.createdAt);
            return {
                id: asString(member.id),
                email: asString(member.email),
                status: asString(member.status) === 'paid' ? 'paid' : 'free',
                createdAt,
                updatedAt: toTimestamp(member.updated_at ?? member.updatedAt, createdAt)
            };
        }).filter((member) => member.id && member.email);

        const comments = table(data, 'comments').map((comment) => {
            const createdAt = toTimestamp(comment.created_at ?? comment.createdAt);
            return {
                id: asString(comment.id),
                postId: asString(comment.post_id ?? comment.postId),
                memberId: asString(comment.member_id ?? comment.memberId),
                authorName: asString(comment.author_name ?? comment.authorName, 'Member'),
                body: asString(comment.html ?? comment.body ?? comment.markdown, ''),
                status: asString(comment.status, 'published'),
                parentId: asNullableString(comment.parent_id ?? comment.parentId),
                createdAt,
                updatedAt: toTimestamp(comment.updated_at ?? comment.updatedAt, createdAt)
            };
        }).filter((comment) => comment.id && comment.postId && comment.memberId);

        const postUpdateColumns = [
            'uuid', 'title', 'slug', 'type', 'status', 'lexical', 'html', 'visibility',
            'featured', 'custom_excerpt', 'feature_image', 'feature_image_alt',
            'feature_image_caption', 'codeinjection_head', 'codeinjection_foot',
            'canonical_url', 'custom_template', 'published_at', 'updated_at'
        ];

        // Manual BEGIN/COMMIT keeps the whole import atomic on the SAME
        // connection — drizzle's transaction() opens a new libSQL connection,
        // which would see a different database for in-memory clients.
        const tx = db;
        await db.run(sql.raw('BEGIN'));
        try {
            const counts: ImportCounts = {
                posts: await upsertAll(tx, postTable, posts, postTable.id, postUpdateColumns),
                tags: await upsertAll(tx, tagTable, tags, tagTable.id, ['name', 'slug', 'description', 'feature_image', 'visibility']),
                postTags: postTags.length,
                authors: await upsertAll(tx, authorProfileTable, authors, authorProfileTable.id, ['name', 'slug', 'bio', 'email', 'profile_image', 'cover_image', 'website', 'location']),
                postAuthors: postAuthors.length,
                staff: await upsertAll(tx, staffTable, staff, staffTable.id, ['email', 'name', 'status', 'password_hash', 'updated_at']),
                roles: 0,
                newsletters: await upsertAll(tx, newsletterTable, newsletters, newsletterTable.id, ['name', 'slug', 'description', 'sender_name', 'sender_email', 'sender_reply_to', 'status', 'subscribe_on_signup', 'sort_order', 'updated_at']),
                issues: await upsertAll(tx, issueTable, issues, issueTable.id, ['newsletter_id', 'subject', 'status', 'send_at', 'updated_at']),
                memberships: await upsertAll(tx, newsletterMembershipTable, memberships, newsletterMembershipTable.id, ['status', 'updated_at']),
                collections: await upsertAll(tx, collectionTable, collections, collectionTable.id, ['name', 'slug', 'filter']),
                plans: await upsertAll(tx, planTable, plans, planTable.id, ['name', 'slug', 'description', 'type', 'active', 'visibility', 'trial_days', 'welcome_page_url', 'updated_at']),
                prices: await upsertAll(tx, priceTable, prices, priceTable.id, ['plan_id', 'cadence', 'amount', 'currency']),
                settings: await upsertAll(tx, settingTable, settingsRows, settingTable.id, ['value', 'type', 'updated_at']),
                members: await upsertAll(tx, memberTable, members, memberTable.id, ['email', 'status', 'updated_at']),
                comments: await upsertAll(tx, commentTable, comments, commentTable.id, ['body', 'status', 'author_name', 'parent_id', 'updated_at'])
            };

            // Roles are matched by name: phantom may already have seeded roles
            // and legacy ids must not duplicate them.
            const existingRoles = await tx.select().from(roleTable);
            const existingRoleNames = new Set(existingRoles.map((role) => role.name));
            const newRoles = roles.filter((role) => !existingRoleNames.has(role.name));
            for (const batch of chunk(newRoles, 100)) {
                await tx.insert(roleTable).values(batch);
            }
            counts.roles = newRoles.length;

            const roleRows = await tx.select().from(roleTable);
            const legacyRoleNameById = new Map(roles.map((role) => [role.id, role.name]));
            const roleIdByName = new Map(roleRows.map((role) => [role.name, role.id]));

            // Link tables have no usable primary key in phantom; replace the
            // rows for imported entities so repeated imports stay idempotent.
            const importedPostIds = [...postIds];
            for (const batch of chunk(importedPostIds, 200)) {
                await tx.delete(postTagTable).where(inArray(postTagTable.postId, batch));
                await tx.delete(postAuthorTable).where(inArray(postAuthorTable.postId, batch));
            }
            for (const batch of chunk(postTags, 100)) {
                await tx.insert(postTagTable).values(batch);
            }
            for (const batch of chunk(postAuthors, 100)) {
                await tx.insert(postAuthorTable).values(batch);
            }

            const staffRoleLinks = roleUsers.flatMap((link) => {
                const roleName = legacyRoleNameById.get(link.roleId);
                const roleId = roleName ? roleIdByName.get(roleName) : undefined;
                return roleId ? [{staffId: link.staffId, roleId}] : [];
            });
            const linkedStaffIds = [...new Set(staffRoleLinks.map((link) => link.staffId))];
            for (const batch of chunk(linkedStaffIds, 200)) {
                await tx.delete(staffRoleTable).where(inArray(staffRoleTable.staffId, batch));
            }
            for (const batch of chunk(staffRoleLinks, 100)) {
                await tx.insert(staffRoleTable).values(batch);
            }

            await db.run(sql.raw('COMMIT'));
            return counts;
        } catch (error) {
            await db.run(sql.raw('ROLLBACK'));
            throw error;
        }
    };

    return {importExport};
};
