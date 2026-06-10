import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {createClient} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import {ensureCoreSchema} from '../../db/ddl.js';
import {createGhostImporter} from './importer.js';
import {postTable, postTagTable, tagTable, authorProfileTable, postAuthorTable, collectionTable} from '../content/db.js';
import {staffTable, roleTable, staffRoleTable} from '../identity/db.js';
import {newsletterTable, issueTable, newsletterMembershipTable} from '../newsletters/db.js';
import {planTable, priceTable} from '../subscriptions/db.js';
import {settingTable} from '../settings/db.js';
import {memberTable} from '../members/db.js';
import {commentTable} from '../comments/db.js';
import {eq} from 'drizzle-orm';

const fixturePath = path.resolve(__dirname, '../../../test/fixtures/ghost-v5-export.json');

const loadFixture = async () => {
    return JSON.parse(await readFile(fixturePath, 'utf8')) as Record<string, unknown>;
};

const createTestDb = async () => {
    const db = drizzle(createClient({url: ':memory:'}));
    await ensureCoreSchema(db);
    return db;
};

describe('ghost export importer', () => {
    it('imports posts from a real v5 export, converting mobiledoc-only posts to lexical', async () => {
        const db = await createTestDb();
        const importer = createGhostImporter(db);
        const counts = await importer.importExport(await loadFixture());

        expect(counts.posts).toBe(2);

        const posts = await db.select().from(postTable);
        expect(posts).toHaveLength(2);

        const comingSoon = posts.find((post) => post.slug === 'coming-soon');
        expect(comingSoon).toBeDefined();
        expect(comingSoon?.status).toBe('published');
        expect(comingSoon?.type).toBe('post');
        expect(comingSoon?.uuid).toBe('a3adbe4e-7bea-4467-b93e-dce93858d8c0');
        expect(comingSoon?.featured).toBe(0);
        expect(comingSoon?.html).toContain('subscribe');
        expect(comingSoon?.publishedAt).toBe(Date.parse('2025-07-22T10:10:32.000Z'));
        expect(comingSoon?.featureImage).toBe('https://static.ghost.org/v4.0.0/images/feature-image.jpg');

        // The fixture post has lexical: null but html present; the importer
        // must wrap the html in a lexical doc so phantom can re-render it.
        const lexical = JSON.parse(comingSoon?.lexical ?? '{}') as {
            root: {children: Array<{type: string; html?: string}>};
        };
        const htmlNode = lexical.root.children.find((child) => child.type === 'html');
        expect(htmlNode?.html).toContain('subscribe');

        const about = posts.find((post) => post.slug === 'about');
        expect(about?.type).toBe('page');
    });

    it('imports tags and post-tag links', async () => {
        const db = await createTestDb();
        await createGhostImporter(db).importExport(await loadFixture());

        const tags = await db.select().from(tagTable);
        expect(tags).toHaveLength(1);
        expect(tags[0]?.name).toBe('News');
        expect(tags[0]?.slug).toBe('news');
        expect(tags[0]?.visibility).toBe('public');

        const links = await db.select().from(postTagTable);
        expect(links).toHaveLength(1);
        expect(links[0]?.postId).toBe('687f639878ce35708d46d05b');
        expect(links[0]?.tagId).toBe('687f639878ce35708d46cfe2');
    });

    it('imports users as author profiles with post-author links', async () => {
        const db = await createTestDb();
        await createGhostImporter(db).importExport(await loadFixture());

        const authors = await db.select().from(authorProfileTable);
        expect(authors).toHaveLength(1);
        expect(authors[0]?.name).toBe('Fixture Ghosty');
        expect(authors[0]?.slug).toBe('fixture');
        expect(authors[0]?.email).toBe('test@ghost.org');

        const links = await db.select().from(postAuthorTable);
        expect(links).toHaveLength(2);
        expect(links.every((link) => link.authorId === '1')).toBe(true);
    });

    it('imports staff accounts with their roles', async () => {
        const db = await createTestDb();
        await createGhostImporter(db).importExport(await loadFixture());

        const staff = await db.select().from(staffTable);
        expect(staff).toHaveLength(1);
        expect(staff[0]?.email).toBe('test@ghost.org');
        expect(staff[0]?.status).toBe('active');
        expect(staff[0]?.passwordHash.startsWith('$2a$')).toBe(true);

        const roles = await db.select().from(roleTable);
        const ownerRole = roles.find((role) => role.name === 'Owner');
        expect(ownerRole).toBeDefined();

        const staffRoles = await db.select().from(staffRoleTable);
        expect(staffRoles).toContainEqual({staffId: '1', roleId: ownerRole?.id});
    });

    it('imports newsletters preserving null sender email', async () => {
        const db = await createTestDb();
        await createGhostImporter(db).importExport(await loadFixture());

        const newsletters = await db.select().from(newsletterTable);
        expect(newsletters).toHaveLength(1);
        expect(newsletters[0]?.name).toBe('Testing Export Fixtures');
        expect(newsletters[0]?.slug).toBe('default-newsletter');
        expect(newsletters[0]?.senderEmail).toBeNull();
        expect(newsletters[0]?.senderReplyTo).toBe('newsletter');
        expect(newsletters[0]?.status).toBe('active');
        expect(newsletters[0]?.subscribeOnSignup).toBe(1);
    });

    it('imports products as plans with prices', async () => {
        const db = await createTestDb();
        await createGhostImporter(db).importExport(await loadFixture());

        const plans = await db.select().from(planTable);
        expect(plans).toHaveLength(2);

        const free = plans.find((plan) => plan.slug === 'free');
        expect(free?.type).toBe('free');

        const paid = plans.find((plan) => plan.slug === 'default-product');
        expect(paid?.type).toBe('paid');

        const prices = await db.select().from(priceTable).where(eq(priceTable.planId, paid?.id ?? ''));
        expect(prices).toHaveLength(2);
        const monthly = prices.find((price) => price.cadence === 'month');
        expect(monthly?.amount).toBe(500);
        expect(monthly?.currency).toBe('USD');
        const yearly = prices.find((price) => price.cadence === 'year');
        expect(yearly?.amount).toBe(5000);
    });

    it('maps legacy settings keys and custom theme settings', async () => {
        const db = await createTestDb();
        await createGhostImporter(db).importExport(await loadFixture());

        const settings = await db.select().from(settingTable);
        const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));

        expect(JSON.parse(byKey.get('site.title') ?? 'null')).toBe('Testing Export Fixtures');
        expect(JSON.parse(byKey.get('site.description') ?? 'null')).toBe('Thoughts, stories and ideas.');
        expect(JSON.parse(byKey.get('site.accent_color') ?? 'null')).toBe('#FF1A75');
        expect(JSON.parse(byKey.get('site.timezone') ?? 'null')).toBe('Etc/UTC');
        expect(JSON.parse(byKey.get('theme.active') ?? 'null')).toBe('source');

        const navigation = JSON.parse(byKey.get('site.navigation') ?? 'null') as Array<{label: string; url: string}>;
        expect(navigation).toEqual([
            {label: 'Home', url: '/'},
            {label: 'About', url: '/about/'}
        ]);

        const custom = JSON.parse(byKey.get('theme.custom') ?? 'null') as Record<string, unknown>;
        expect(custom.site_background_color).toBe('#ffffff');
        expect(custom.navigation_layout).toBe('Logo in the middle');
    });

    it('imports members, comments, collections, issues and memberships from payloads that include them', async () => {
        const db = await createTestDb();
        const payload = {
            data: {
                members: [
                    {id: 'm1', email: 'reader@example.com', status: 'paid', created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-02T00:00:00.000Z'}
                ],
                comments: [
                    {id: 'c1', post_id: 'p1', member_id: 'm1', html: '<p>Nice</p>', status: 'published', created_at: '2025-01-03T00:00:00.000Z', updated_at: '2025-01-03T00:00:00.000Z'}
                ],
                collections: [
                    {id: 'col1', title: 'Featured', slug: 'featured', filter: 'featured:true'}
                ],
                newsletters: [
                    {id: 'n1', name: 'Weekly', slug: 'weekly', status: 'active', created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z'}
                ],
                emails: [
                    {id: 'e1', newsletter_id: 'n1', subject: 'Issue one', status: 'submitted', created_at: '2025-01-04T00:00:00.000Z', updated_at: '2025-01-04T00:00:00.000Z'}
                ],
                members_newsletters: [
                    {id: 'mn1', member_id: 'm1', newsletter_id: 'n1'}
                ]
            }
        };
        const counts = await createGhostImporter(db).importExport(payload);
        expect(counts.members).toBe(1);
        expect(counts.comments).toBe(1);
        expect(counts.collections).toBe(1);
        expect(counts.issues).toBe(1);
        expect(counts.memberships).toBe(1);

        const members = await db.select().from(memberTable);
        expect(members[0]?.email).toBe('reader@example.com');
        expect(members[0]?.status).toBe('paid');

        const comments = await db.select().from(commentTable);
        expect(comments[0]?.body).toBe('<p>Nice</p>');

        const collections = await db.select().from(collectionTable);
        expect(collections[0]?.slug).toBe('featured');

        const issues = await db.select().from(issueTable);
        expect(issues[0]?.newsletterId).toBe('n1');
        expect(issues[0]?.subject).toBe('Issue one');

        const memberships = await db.select().from(newsletterMembershipTable);
        expect(memberships[0]?.memberId).toBe('m1');
        expect(memberships[0]?.status).toBe('subscribed');
    });

    it('is idempotent across repeated imports', async () => {
        const db = await createTestDb();
        const importer = createGhostImporter(db);
        const fixture = await loadFixture();
        await importer.importExport(fixture);
        await importer.importExport(fixture);

        expect(await db.select().from(postTable)).toHaveLength(2);
        expect(await db.select().from(tagTable)).toHaveLength(1);
        expect(await db.select().from(postTagTable)).toHaveLength(1);
        expect(await db.select().from(postAuthorTable)).toHaveLength(2);
        expect(await db.select().from(authorProfileTable)).toHaveLength(1);
        expect(await db.select().from(planTable)).toHaveLength(2);
        expect(await db.select().from(newsletterTable)).toHaveLength(1);
    });

    it('rejects payloads without a data section', async () => {
        const db = await createTestDb();
        await expect(createGhostImporter(db).importExport({foo: 'bar'})).rejects.toThrow(/invalid_export/);
    });
});
