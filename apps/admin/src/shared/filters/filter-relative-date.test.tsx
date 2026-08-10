import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {createRelativeDateRenderer} from './create-relative-date-renderer';
import {formatRelativeDateTooltip} from './filter-relative-date';
import {render, screen} from '@testing-library/react';
import {setupShadeMocks} from '@tryghost/admin-x-framework/test/setup';
import type {FilterFieldConfig} from '@tryghost/shade/patterns';

// The Shade date picker relies on matchMedia/ResizeObserver/getBoundingClientRect,
// which jsdom does not provide.
beforeAll(() => {
    setupShadeMocks();
});

const dateField: FilterFieldConfig = {
    key: 'created_at',
    label: 'Created',
    type: 'date',
    operators: [
        {value: 'is-or-less', label: 'on or before'},
        {value: 'in-the-last', label: 'in the last'}
    ]
};

describe('createRelativeDateRenderer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uses the Shade date picker for non-relative date operators', () => {
        const renderer = createRelativeDateRenderer('2026-05-09');

        render(<>{renderer({
            field: dateField,
            operator: 'is-or-less',
            values: ['2026-05-07'],
            onChange: vi.fn()
        })}</>);

        const input = screen.getByPlaceholderText<HTMLInputElement>('YYYY-MM-DD');

        expect(input.type).toBe('text');
        expect(screen.getByRole('button', {name: 'Open calendar'})).toBeInTheDocument();
    });

    it('formats relative date tooltips with the browser locale', () => {
        vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fr-FR');

        expect(formatRelativeDateTooltip('2026-05-09', -7)).toBe('2 mai 2026');
    });

    it('does not rewrite hydrated relative date amounts above one year', () => {
        const renderer = createRelativeDateRenderer('2026-05-09');
        const onChange = vi.fn();

        render(<>{renderer({
            field: dateField,
            operator: 'in-the-last',
            values: [730],
            onChange
        })}</>);

        expect(screen.getByLabelText('Relative date amount')).toHaveValue(730);
        expect(onChange).not.toHaveBeenCalled();
    });
});
