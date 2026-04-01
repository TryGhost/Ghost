import MembersHeaderSearch from '@src/views/members/components/members-header-search';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

describe('MembersHeaderSearch', () => {
    it('renders the current search and emits updates from user input', () => {
        const onSearchChange = vi.fn();

        render(
            <MembersHeaderSearch
                search="jamie"
                onSearchChange={onSearchChange}
            />
        );

        const input = screen.getByPlaceholderText('Search members...') as HTMLInputElement;

        expect(input.value).toBe('jamie');

        fireEvent.change(input, {target: {value: 'jamie@example.com'}});

        expect(onSearchChange).toHaveBeenCalledWith('jamie@example.com');
    });

    it('syncs the visible input when the external search changes', () => {
        const onSearchChange = vi.fn();
        const {rerender} = render(
            <MembersHeaderSearch
                search="jamie"
                onSearchChange={onSearchChange}
            />
        );

        rerender(
            <MembersHeaderSearch
                search="alex"
                onSearchChange={onSearchChange}
            />
        );

        const input = screen.getByPlaceholderText('Search members...') as HTMLInputElement;

        expect(input.value).toBe('alex');
    });
});
