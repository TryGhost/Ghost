import {expect, test} from '@/helpers/playwright';

import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersPage} from '@/helpers/pages';

test.describe('Ghost Admin - Member Export', () => {
    let memberFactory: MemberFactory;

    function extractDownloadedContentSpecifics(content: string) {
        const contentIds = content.match(/[a-z0-9]{24}/gm);
        const contentTimestamps = content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/gm);

        return {
            contentIds,
            contentTimestamps
        };
    }

    const downloadedContentFields = [
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

    const membersFixture = [
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

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('exports all members to CSV', async ({page}) => {
        await memberFactory.createMany(membersFixture);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.membersActionsButton.click();
        const {suggestedFilename, content} = await membersPage.exportMembers();
        const {contentTimestamps, contentIds} = extractDownloadedContentSpecifics(content);

        expect(content).toMatch(new RegExp(downloadedContentFields.join('')));

        membersFixture.forEach((member) => {
            expect(content).toContain(member.name);
            expect(content).toContain(member.email);
            expect(content).toContain(member.note);
            expect(content).toContain(member.labels[0]);
        });

        expect(contentIds).toHaveLength(6);
        expect(contentTimestamps).toHaveLength(6);

        expect(suggestedFilename.startsWith('members')).toBe(true);
        expect(suggestedFilename.endsWith('.csv')).toBe(true);
    });

    test('exports filtered members by label to CSV', async ({page}) => {
        await memberFactory.createMany(membersFixture);
        const labelToFilterBy = 'dog';

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.filterSection.applyLabel(labelToFilterBy);
        await expect(membersPage.memberListItems).toHaveCount(3);

        await membersPage.membersActionsButton.click();
        await expect(membersPage.exportMembersButton).toContainText('Export selected members');

        const {suggestedFilename, content} = await membersPage.exportMembers();
        const {contentTimestamps, contentIds} = extractDownloadedContentSpecifics(content);

        const fixture = membersFixture
            .filter(member => member.labels[0] === 'dog');

        expect(content).toMatch(new RegExp(downloadedContentFields.join('')));

        fixture.forEach((member) => {
            expect(content).toContain(member.name);
            expect(content).toContain(member.email);
            expect(content).toContain(member.note);
            expect(content).toContain(labelToFilterBy);
        });

        expect(contentIds).toHaveLength(3);
        expect(contentTimestamps).toHaveLength(3);

        expect(suggestedFilename.startsWith('members')).toBe(true);
        expect(suggestedFilename.endsWith('.csv')).toBe(true);
    });
});
