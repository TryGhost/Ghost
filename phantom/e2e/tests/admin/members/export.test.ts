// Vendored from /e2e/tests/admin/members/export.test.ts. Adapted: ids are
// v10 UUIDs rather than 24-hex ObjectIDs, and isolation comes from the
// reset fixture.
import {MemberFactory, createMemberFactory} from '../../../helpers/data-factory';
import {MembersListPage} from '../../../helpers/pages';
import {expect, test} from '../../../helpers/fixture';


const DOWNLOADED_CONTENT_FIELDS = [
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
    'tiers,',
    'gift_id'
];

const MEMBERS_FIXTURE = [
    {
        name: 'Test Member 1',
        email: 'test@member1.com',
        note: 'This is a test member',
        labels: ['old']
    },
    {
        name: 'Test Member 2',
        email: 'test@member2.com',
        note: 'This is a test member',
        labels: ['old']
    },
    {
        name: 'Test Member 3',
        email: 'test@member3.com',
        note: 'This is a test member',
        labels: ['old']
    },
    {
        name: 'Sashi',
        email: 'test@member4.com',
        note: 'This is a test member',
        labels: ['dog']
    },
    {
        name: 'Mia',
        email: 'test@member5.com',
        note: 'This is a test member',
        labels: ['dog']
    },
    {
        name: 'Minki',
        email: 'test@member6.com',
        note: 'This is a test member',
        labels: ['dog']
    }
];

function extractDownloadedContentSpecifics(content: string) {
    const contentIds = content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gm);
    const contentTimestamps = content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/gm);

    return {
        contentIds,
        contentTimestamps
    };
}

function assertExportedMembers(content: string, membersFixture: typeof MEMBERS_FIXTURE) {
    expect(content).toMatch(new RegExp(DOWNLOADED_CONTENT_FIELDS.join('')));

    membersFixture.forEach((member) => {
        expect(content).toContain(member.name);
        expect(content).toContain(member.email);
        expect(content).toContain(member.note);
        expect(content).toContain(member.labels[0]);
    });
}

test.describe('Ghost Admin - Members Export', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('exports all members to CSV', async ({page}) => {
        await memberFactory.createMany(MEMBERS_FIXTURE);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.openActionsMenu();

        const {suggestedFilename, content} = await membersPage.exportMembers();
        const {contentTimestamps, contentIds} = extractDownloadedContentSpecifics(content);

        assertExportedMembers(content, MEMBERS_FIXTURE);

        expect(contentIds).toHaveLength(MEMBERS_FIXTURE.length);
        expect(contentTimestamps).toHaveLength(MEMBERS_FIXTURE.length);
        expect(suggestedFilename).toMatch(/ghost\.members\.\d{4}-\d{2}-\d{2}\.csv$/);
    });

    test('exports filtered members by label to CSV', async ({page}) => {
        await memberFactory.createMany(MEMBERS_FIXTURE);

        const labelToFilterBy = 'dog';
        const filteredMembers = MEMBERS_FIXTURE.filter(member => member.labels[0] === labelToFilterBy);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.applyLabelFilter(labelToFilterBy);
        await expect.poll(async () => await membersPage.getVisibleMemberCount()).toBe(filteredMembers.length);
        await membersPage.openActionsMenu();

        const {suggestedFilename, content} = await membersPage.exportMembers();
        const {contentTimestamps, contentIds} = extractDownloadedContentSpecifics(content);

        assertExportedMembers(content, filteredMembers);

        expect(contentIds).toHaveLength(filteredMembers.length);
        expect(contentTimestamps).toHaveLength(filteredMembers.length);
        expect(suggestedFilename).toMatch(/ghost\.members\.\d{4}-\d{2}-\d{2}\.csv$/);
    });
});
