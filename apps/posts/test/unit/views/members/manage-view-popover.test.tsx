import ManageViewPopover from '@src/views/members/components/manage-view-popover';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

const saveMemberView = vi.fn();
const deleteMemberView = vi.fn();

vi.mock('@src/views/members/hooks/use-member-views', () => ({
    useSaveMemberView: () => saveMemberView,
    useDeleteMemberView: () => deleteMemberView
}));

describe('ManageViewPopover', () => {
    it('resets the name when switching from an active saved view to save mode', async () => {
        const activeFilter = 'email:\'test\'';
        const unsavedFilter = 'email:\'test\'+label:\'vip\'';
        const activeView = {
            name: 'Existing view',
            route: 'members' as const,
            filter: {filter: activeFilter}
        };

        const {rerender} = render(
            <ManageViewPopover
                activeView={activeView}
                existingViews={[activeView]}
                filter={activeFilter}
            />
        );

        fireEvent.click(screen.getByRole('button', {name: 'Edit view'}));

        expect(screen.getByRole('textbox', {name: ''})).toHaveValue('Existing view');

        rerender(
            <ManageViewPopover
                activeView={null}
                existingViews={[activeView]}
                filter={unsavedFilter}
            />
        );

        expect(screen.getByRole('heading', {name: 'Save view'})).toBeInTheDocument();
        expect(screen.getByPlaceholderText('View name')).toHaveValue('');
    });
});
