import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersForwardPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

const EXPECTED_CSV_HEADER_FIELDS = [
    'id,',
    'email,',
    'name,',
    'note,',
    'subscribed_to_emails,',
    'complimentary_plan,',
    'stripe_customer_id,',
    'created_at,',
    'deleted_at,',
    'labels,',
    'tiers'
];

test.describe('Ghost Admin - Members Forward Export', () => {
    test.use({labs: {membersForward: true}});

    let memberFactory: MemberFactory;

    const membersFixture = [
        {name: 'Export Member 1', email: 'export1@example.com', note: 'First export test', labels: ['alpha']},
        {name: 'Export Member 2', email: 'export2@example.com', note: 'Second export test', labels: ['alpha']},
        {name: 'Export Member 3', email: 'export3@example.com', note: 'Third export test', labels: ['beta']}
    ];

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('exports all members to a CSV with expected fields', async ({page}) => {
        await memberFactory.createMany(membersFixture);

        const membersPage = new MembersForwardPage(page);
        await membersPage.goto();
        await membersPage.openActionsMenu();

        const {suggestedFilename, content} = await membersPage.exportMembers();

        expect(content).toMatch(new RegExp(EXPECTED_CSV_HEADER_FIELDS.join('')));

        for (const member of membersFixture) {
            expect(content).toContain(member.name);
            expect(content).toContain(member.email);
            expect(content).toContain(member.note);
        }

        expect(suggestedFilename).toMatch(/^members\.\d{4}-\d{2}-\d{2}\.csv$/);
    });

    test('exports only filtered members when a filter is active', async ({page}) => {
        await memberFactory.createMany(membersFixture);

        const membersPage = new MembersForwardPage(page);
        await page.goto('/ghost/#/members-forward?filter=label:alpha');
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.openActionsMenu();
        await expect(membersPage.getMenuItem(/Export 2 members/)).toBeVisible();

        const {content} = await membersPage.exportMembers();

        expect(content).toContain('export1@example.com');
        expect(content).toContain('export2@example.com');
        expect(content).not.toContain('export3@example.com');
    });
});
