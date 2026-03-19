import LabelPicker from './label-picker';
import {beforeAll, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import type {Label} from '@tryghost/admin-x-framework/api/labels';

// cmdk uses scrollIntoView which jsdom doesn't implement
beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

const makeLabel = (id: string, name: string, slug?: string): Label => ({
    id,
    name,
    slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
});

const labels: Label[] = [
    makeLabel('1', 'Alpha'),
    makeLabel('2', 'Beta'),
    makeLabel('3', 'Gamma')
];

describe('LabelPicker', () => {
    it('does client-side filtering when onSearchChange is not provided', () => {
        render(
            <LabelPicker
                labels={labels}
                selectedSlugs={[]}
                inline
                onToggle={vi.fn()}
            />
        );

        // Open the popover
        fireEvent.click(screen.getByRole('button'));

        // Type in the search
        const searchInput = screen.getByPlaceholderText('Search labels...');
        fireEvent.change(searchInput, {target: {value: 'alp'}});

        // Alpha should be visible, Beta and Gamma should not
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.queryByText('Beta')).not.toBeInTheDocument();
        expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
    });

    it('skips client-side filtering when onSearchChange is provided (server search)', () => {
        const onSearchChange = vi.fn();

        render(
            <LabelPicker
                labels={labels}
                selectedSlugs={[]}
                inline
                onSearchChange={onSearchChange}
                onToggle={vi.fn()}
            />
        );

        // Open the popover
        fireEvent.click(screen.getByRole('button'));

        // Type in the search
        const searchInput = screen.getByPlaceholderText('Search labels...');
        fireEvent.change(searchInput, {target: {value: 'alp'}});

        // All labels should still be visible (server-side filtering, not client)
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
        expect(screen.getByText('Gamma')).toBeInTheDocument();

        // onSearchChange should have been called
        expect(onSearchChange).toHaveBeenCalledWith('alp');
    });

    it('shows loading spinner when isLoadingMore is true', () => {
        render(
            <LabelPicker
                isLoadingMore={true}
                labels={labels}
                selectedSlugs={[]}
                inline
                onSearchChange={vi.fn()}
                onToggle={vi.fn()}
            />
        );

        // Open the popover
        fireEvent.click(screen.getByRole('button'));

        // The Loader2 icon should be rendered (it renders as an SVG with animate-spin class)
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('calls onLoadMore when scrolled to bottom', () => {
        const onLoadMore = vi.fn();

        render(
            <LabelPicker
                hasMore={true}
                labels={labels}
                selectedSlugs={[]}
                inline
                onLoadMore={onLoadMore}
                onSearchChange={vi.fn()}
                onToggle={vi.fn()}
            />
        );

        // Open the popover
        fireEvent.click(screen.getByRole('button'));

        // Find the scrollable CommandList
        const commandList = document.querySelector('[cmdk-list]');
        expect(commandList).toBeTruthy();

        if (commandList) {
            // Simulate scroll to bottom
            Object.defineProperty(commandList, 'scrollTop', {value: 200, writable: true});
            Object.defineProperty(commandList, 'clientHeight', {value: 256, writable: true});
            Object.defineProperty(commandList, 'scrollHeight', {value: 450, writable: true});

            fireEvent.scroll(commandList);

            expect(onLoadMore).toHaveBeenCalled();
        }
    });
});
