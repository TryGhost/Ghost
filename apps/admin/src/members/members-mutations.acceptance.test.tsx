import {describe, expect, it} from 'vitest';

import {fakeMembers, member, renderAdminApp} from '@test-utils/acceptance';
import {membersScreen} from './members.screen';

describe('Members list', () => {
    it('shows member details in each row', async () => {
        fakeMembers([
            member({name: 'Alice Anderson', email: 'alice@example.com', status: 'free'}),
            member({name: 'Bob Baker', email: 'bob@example.com'}),
            member({name: 'Charlie Clark', email: 'charlie@example.com'})
        ]);
        await renderAdminApp('/members');

        await expect(membersScreen.memberRows()).toHaveCount(3);
        await expect.element(membersScreen.memberRow('Alice Anderson')).toHaveTextContent('alice@example.com');
        await expect.element(membersScreen.memberRow('Alice Anderson')).toHaveTextContent('Free');
    });

    it('shows the empty state', async () => {
        fakeMembers([]);
        await renderAdminApp('/members');

        await expect.element(membersScreen.emptyState()).toBeVisible();
        await expect(membersScreen.memberRows()).toHaveCount(0);
    });
});
