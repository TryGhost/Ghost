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
    });
});
