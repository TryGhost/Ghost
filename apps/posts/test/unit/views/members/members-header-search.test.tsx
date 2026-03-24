import MembersHeaderSearch from '@src/views/members/components/members-header-search';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('MembersHeaderSearch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the current search and debounces updates', () => {
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

        expect(input.value).toBe('jamie@example.com');
        expect(onSearchChange).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(249);
        });

        expect(onSearchChange).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });

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

    it('does not replay the stale search value when the external search changes', () => {
        const onSearchChange = vi.fn();
        const {rerender} = render(
            <MembersHeaderSearch
                search="jamie"
                onSearchChange={onSearchChange}
            />
        );

        onSearchChange.mockClear();

        rerender(
            <MembersHeaderSearch
                search=""
                onSearchChange={onSearchChange}
            />
        );

        const input = screen.getByPlaceholderText('Search members...') as HTMLInputElement;

        expect(input.value).toBe('');
        expect(onSearchChange).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(250);
        });

        expect(onSearchChange).not.toHaveBeenCalled();
    });
});
