import {KeyboardSelection} from '../../src/components/ui/KeyboardSelection';
import {KeyboardSelectionWithGroups} from '../../src/components/ui/KeyboardSelectionWithGroups';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';

describe.each([
    {
        name: 'ungrouped',
        renderSelection: (onSelect: ReturnType<typeof vi.fn>) => (
            <KeyboardSelection
                getItem={() => null}
                items={[]}
                onSelect={onSelect}
            />
        )
    },
    {
        name: 'grouped',
        renderSelection: (onSelect: ReturnType<typeof vi.fn>) => (
            <KeyboardSelectionWithGroups
                getGroup={() => null}
                getItem={() => null}
                groups={[{label: 'Results', items: []}]}
                onSelect={onSelect}
            />
        )
    }
])('KeyboardSelection ($name)', ({renderSelection}) => {
    it('lets Enter fall through when there is no selectable item', () => {
        const onKeyDown = vi.fn();
        const onSelect = vi.fn();

        render(
            <div onKeyDown={onKeyDown}>
                <input aria-label="URL" />
                {renderSelection(onSelect)}
            </div>
        );

        fireEvent.keyDown(screen.getByRole('textbox', {name: 'URL'}), {key: 'Enter'});

        expect(onSelect).not.toHaveBeenCalled();
        expect(onKeyDown).toHaveBeenCalledOnce();
        expect(onKeyDown.mock.calls[0][0].defaultPrevented).toBe(false);
    });
});

describe('KeyboardSelectionWithGroups', () => {
    it('consumes Enter when the selected item has no value', () => {
        const onKeyDown = vi.fn();
        const onSelect = vi.fn();
        const placeholderItem = {label: 'Enter URL to create link', value: null};

        render(
            <div onKeyDown={onKeyDown}>
                <input aria-label="URL" />
                <KeyboardSelectionWithGroups
                    getGroup={() => null}
                    getItem={() => null}
                    groups={[{
                        label: 'Results',
                        items: [placeholderItem]
                    }]}
                    onSelect={onSelect}
                />
            </div>
        );

        fireEvent.keyDown(screen.getByRole('textbox', {name: 'URL'}), {key: 'Enter'});

        expect(onSelect).toHaveBeenCalledOnce();
        expect(onSelect).toHaveBeenCalledWith(placeholderItem);
        expect(onKeyDown).not.toHaveBeenCalled();
    });

    it('handles Enter without a selectable item when requested', () => {
        const onEnterWithoutSelection = vi.fn();
        const onKeyDown = vi.fn();
        const onSelect = vi.fn();

        render(
            <div onKeyDown={onKeyDown}>
                <input aria-label="At-link" />
                <KeyboardSelectionWithGroups
                    getGroup={() => null}
                    getItem={() => null}
                    groups={[{label: 'No results found'}]}
                    onEnterWithoutSelection={onEnterWithoutSelection}
                    onSelect={onSelect}
                />
            </div>
        );

        fireEvent.keyDown(screen.getByRole('textbox', {name: 'At-link'}), {key: 'Enter'});

        expect(onEnterWithoutSelection).toHaveBeenCalledOnce();
        expect(onSelect).not.toHaveBeenCalled();
        expect(onKeyDown).not.toHaveBeenCalled();
    });
});
