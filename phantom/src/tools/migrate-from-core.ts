import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sql} from 'drizzle-orm';
import {createDb} from '../db/client.js';
import {loadConfig} from '../platform/config/config.js';
import {postTable, postRevisionTable, postTagTable, tagTable, collectionTable, authorProfileTable} from '../modules/content/db.js';
import {settingTable} from '../modules/settings/db.js';
import {memberTable} from '../modules/members/db.js';
import {newsletterTable, issueTable, newsletterMembershipTable} from '../modules/newsletters/db.js';
import {commentTable} from '../modules/comments/db.js';

type GhostExport = {
    meta?: Record<string, unknown>;
    data: Record<string, Array<Record<string, unknown>>>;
};

const defaultLexical = JSON.stringify({root: {children: [], type: 'root', version: 1}});

const getTable = (exportData: GhostExport, name: string) => {
    const table = exportData.data?.[name];
    return Array.isArray(table) ? table : [];
};

const toTimestamp = (value: unknown, fallback = Date.now()) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
};

const slugify = (value: string) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

const chunk = <T>(items: T[], size: number) => {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
};

const insertChunks = async <T>(db: ReturnType<typeof createDb>, table: T, rows: Array<Record<string, unknown>>) => {
    if (rows.length === 0) {
        return 0;
    }
    for (const batch of chunk(rows, 200)) {
        await db.insert(table as never).values(batch as never).onConflictDoNothing();
    }
    return rows.length;
};

const upsertSettings = async (db: ReturnType<typeof createDb>, rows: Array<Record<string, unknown>>) => {
    if (rows.length === 0) {
        return 0;
    }
    for (const batch of chunk(rows, 200)) {
        await db
            .insert(settingTable)
            .values(batch as never)
            .onConflictDoUpdate({
                target: settingTable.id,
                set: {
                    value: sql.raw('excluded.value'),
                    updatedAt: sql.raw('excluded.updated_at')
                }
            });
    }
    return rows.length;
};

const upsertPosts = async (db: ReturnType<typeof createDb>, rows: Array<Record<string, unknown>>) => {
    if (rows.length === 0) {
        return 0;
    }
    for (const batch of chunk(rows, 200)) {
        await db
            .insert(postTable)
            .values(batch as never)
            .onConflictDoUpdate({
                target: postTable.id,
                set: {
                    title: sql.raw('excluded.title'),
                    slug: sql.raw('excluded.slug'),
                    status: sql.raw('excluded.status'),
                    lexical: sql.raw('excluded.lexical'),
                    visibility: sql.raw('excluded.visibility'),
                    customExcerpt: sql.raw('excluded.custom_excerpt'),
                    featureImage: sql.raw('excluded.feature_image'),
                    featureImageAlt: sql.raw('excluded.feature_image_alt'),
                    featureImageCaption: sql.raw('excluded.feature_image_caption'),
                    publishedAt: sql.raw('excluded.published_at'),
                    updatedAt: sql.raw('excluded.updated_at')
                }
            });
    }
    return rows.length;
};

const ensureSchema = async (db: ReturnType<typeof createDb>) => {
    const statements = [
        `CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            slug TEXT NOT NULL,
            status TEXT NOT NULL,
            lexical TEXT NOT NULL,
            visibility TEXT NOT NULL DEFAULT 'public',
            custom_excerpt TEXT,
            feature_image TEXT,
            feature_image_alt TEXT,
            feature_image_caption TEXT,
            published_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS post_revisions (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            title TEXT NOT NULL,
            slug TEXT NOT NULL,
            status TEXT NOT NULL,
            lexical TEXT NOT NULL,
            visibility TEXT NOT NULL DEFAULT 'public',
            custom_excerpt TEXT,
            feature_image TEXT,
            feature_image_alt TEXT,
            feature_image_caption TEXT,
            editor_id TEXT,
            reason TEXT,
            created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS posts_tags (
            post_id TEXT NOT NULL,
            tag_id TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            filter TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS author_profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            bio TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS newsletters (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sender_email TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY,
            newsletter_id TEXT NOT NULL,
            subject TEXT NOT NULL,
            status TEXT NOT NULL,
            send_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS newsletter_memberships (
            id TEXT PRIMARY KEY,
            newsletter_id TEXT NOT NULL,
            member_id TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            member_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            body TEXT NOT NULL,
            status TEXT NOT NULL,
            parent_id TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )`
    ];

    for (const statement of statements) {
        await db.run(sql.raw(statement));
    }
};

const buildLexical = (record: Record<string, unknown>) => {
    if (typeof record.lexical === 'string' && record.lexical.trim()) {
        return record.lexical;
    }
    return defaultLexical;
};

const parseInputPath = () => {
    const args = process.argv.slice(2);
    const inputIndex = args.findIndex((arg) => arg === '--input');
    if (inputIndex === -1 || !args[inputIndex + 1]) {
        throw new Error('Missing --input path to Ghost export JSON');
    }
    const input = args[inputIndex + 1];
    if (!input) {
        throw new Error('Missing --input path to Ghost export JSON');
    }
    return resolve(process.cwd(), input);
};

const run = async () => {
    const inputPath = parseInputPath();
    const raw = await readFile(inputPath, 'utf-8');
    const exportData = JSON.parse(raw) as GhostExport;

    const config = loadConfig();
    const db = createDb(config.db);
    await ensureSchema(db);

    const tags = getTable(exportData, 'tags').map((tag) => ({
        id: String(tag.id),
        name: String(tag.name ?? 'Tag'),
        slug: String(tag.slug ?? slugify(String(tag.name ?? 'tag')))
    }));

    const settingsMap = new Map<string, {id: string; key: string; group: string; type: string; value: string; createdAt: number; updatedAt: number}>();
    for (const setting of getTable(exportData, 'settings')) {
        const key = String(setting.key ?? '');
        if (!key) {
            continue;
        }
        const mappedKey = key === 'title'
            ? 'site.title'
            : key === 'description'
                ? 'site.description'
                : key === 'locale'
                    ? 'site.locale'
                    : key === 'cover_image'
                        ? 'site.cover_image'
                        : key === 'logo'
                            ? 'site.logo'
                            : key === 'icon'
                                ? 'site.icon'
                                : key === 'accent_color'
                                    ? 'site.accent_color'
                                    : null;
        if (!mappedKey) {
            continue;
        }
        const createdAt = toTimestamp(setting.created_at ?? setting.createdAt);
        const updatedAt = toTimestamp(setting.updated_at ?? setting.updatedAt, createdAt);
        settingsMap.set(mappedKey, {
            id: mappedKey,
            key: mappedKey,
            group: 'site',
            type: String(setting.type ?? 'string'),
            value: JSON.stringify(setting.value ?? null),
            createdAt,
            updatedAt
        });
    }

    const posts = getTable(exportData, 'posts').map((post) => {
        const status = String(post.status ?? 'draft');
        const rawPublishedAt = post.published_at ?? post.publishedAt;
        const publishedAt = status === 'published'
            ? rawPublishedAt
                ? toTimestamp(rawPublishedAt)
                : null
            : null;
        const createdAt = toTimestamp(post.created_at ?? post.createdAt);
        const updatedAt = toTimestamp(post.updated_at ?? post.updatedAt, createdAt);
        return {
            id: String(post.id),
            title: String(post.title ?? 'Untitled'),
            slug: String(post.slug ?? slugify(String(post.title ?? 'post'))),
            status: status === 'published' || status === 'scheduled' ? status : 'draft',
            lexical: buildLexical(post),
            visibility: String(post.visibility ?? 'public'),
            customExcerpt: post.custom_excerpt ?? post.customExcerpt ?? null,
            featureImage: post.feature_image ?? post.featureImage ?? null,
            featureImageAlt: post.feature_image_alt ?? post.featureImageAlt ?? null,
            featureImageCaption: post.feature_image_caption ?? post.featureImageCaption ?? null,
            publishedAt,
            createdAt,
            updatedAt
        };
    });

    const revisions = posts.map((post) => ({
        id: `${post.id}-migration`,
        postId: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        lexical: post.lexical,
        visibility: post.visibility,
        customExcerpt: post.customExcerpt,
        featureImage: post.featureImage,
        featureImageAlt: post.featureImageAlt,
        featureImageCaption: post.featureImageCaption,
        editorId: null,
        reason: 'migration',
        createdAt: post.updatedAt
    }));

    const postTags = getTable(exportData, 'posts_tags').map((link) => ({
        postId: String(link.post_id ?? link.postId),
        tagId: String(link.tag_id ?? link.tagId)
    })).filter((link) => link.postId && link.tagId);

    const collections = getTable(exportData, 'collections').map((collection) => ({
        id: String(collection.id),
        name: String(collection.title ?? collection.name ?? 'Collection'),
        slug: String(collection.slug ?? slugify(String(collection.title ?? collection.name ?? 'collection'))),
        filter: String(collection.filter ?? 'featured:true')
    }));

    const authors = getTable(exportData, 'users').map((user) => ({
        id: String(user.id),
        name: String(user.name ?? user.slug ?? 'Author'),
        slug: String(user.slug ?? slugify(String(user.name ?? 'author'))),
        bio: typeof user.bio === 'string' ? user.bio : null
    }));

    const members = getTable(exportData, 'members').map((member) => ({
        id: String(member.id),
        email: String(member.email ?? `${member.id}@example.com`),
        status: String(member.status ?? 'free') === 'paid' ? 'paid' : 'free',
        createdAt: toTimestamp(member.created_at ?? member.createdAt),
        updatedAt: toTimestamp(member.updated_at ?? member.updatedAt)
    }));

    const newsletters = getTable(exportData, 'newsletters').map((newsletter) => ({
        id: String(newsletter.id),
        name: String(newsletter.name ?? 'Newsletter'),
        senderEmail: String(newsletter.sender_email ?? newsletter.senderEmail ?? 'hello@example.com'),
        createdAt: toTimestamp(newsletter.created_at ?? newsletter.createdAt),
        updatedAt: toTimestamp(newsletter.updated_at ?? newsletter.updatedAt)
    }));

    const issues = getTable(exportData, 'emails').map((email) => ({
        id: String(email.id),
        newsletterId: String(email.newsletter_id ?? email.newsletterId ?? newsletters[0]?.id ?? 'default'),
        subject: String(email.subject ?? 'Email'),
        status: String(email.status ?? 'draft'),
        sendAt: email.send_at ? toTimestamp(email.send_at) : null,
        createdAt: toTimestamp(email.created_at ?? email.createdAt),
        updatedAt: toTimestamp(email.updated_at ?? email.updatedAt)
    }));

    const memberships = getTable(exportData, 'members_newsletters').map((entry) => ({
        id: `${entry.newsletter_id ?? entry.newsletterId}:${entry.member_id ?? entry.memberId}`,
        newsletterId: String(entry.newsletter_id ?? entry.newsletterId),
        memberId: String(entry.member_id ?? entry.memberId),
        status: String(entry.status ?? 'subscribed'),
        createdAt: toTimestamp(entry.created_at ?? entry.createdAt),
        updatedAt: toTimestamp(entry.updated_at ?? entry.updatedAt)
    })).filter((entry) => entry.newsletterId && entry.memberId);

    const comments = getTable(exportData, 'comments').map((comment) => ({
        id: String(comment.id),
        postId: String(comment.post_id ?? comment.postId),
        memberId: String(comment.member_id ?? comment.memberId ?? comment.author_id ?? comment.authorId),
        authorName: String(comment.author_name ?? comment.authorName ?? comment.name ?? 'Member'),
        body: String(comment.html ?? comment.body ?? comment.markdown ?? comment.text ?? ''),
        status: String(comment.status ?? 'published'),
        parentId: comment.parent_id ? String(comment.parent_id) : null,
        createdAt: toTimestamp(comment.created_at ?? comment.createdAt),
        updatedAt: toTimestamp(comment.updated_at ?? comment.updatedAt)
    })).filter((comment) => comment.postId && comment.memberId);

    const insertedTags = await insertChunks(db, tagTable, tags);
    const insertedPosts = await upsertPosts(db, posts);
    const insertedSettings = await upsertSettings(db, Array.from(settingsMap.values()));
    const insertedRevisions = await insertChunks(db, postRevisionTable, revisions);
    const insertedPostTags = await insertChunks(db, postTagTable, postTags);
    const insertedCollections = await insertChunks(db, collectionTable, collections);
    const insertedAuthors = await insertChunks(db, authorProfileTable, authors);
    const insertedMembers = await insertChunks(db, memberTable, members);
    const insertedNewsletters = await insertChunks(db, newsletterTable, newsletters);
    const insertedIssues = await insertChunks(db, issueTable, issues);
    const insertedMemberships = await insertChunks(db, newsletterMembershipTable, memberships);
    const insertedComments = await insertChunks(db, commentTable, comments);

    console.info('Migration complete');
    console.info({
        tags: insertedTags,
        posts: insertedPosts,
        settings: insertedSettings,
        revisions: insertedRevisions,
        postTags: insertedPostTags,
        collections: insertedCollections,
        authors: insertedAuthors,
        members: insertedMembers,
        newsletters: insertedNewsletters,
        issues: insertedIssues,
        memberships: insertedMemberships,
        comments: insertedComments
    });
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
