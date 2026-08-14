import assert from 'assert/strict';
import {useState} from 'react';
import {describe, it, vi} from 'vitest';
import {act, fireEvent, screen} from '@testing-library/react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../../../../src/components/ui/tabs';
import {render} from '../../utils/test-utils';

describe('Tabs Component', () => {
    it('commits a focused field before changing tabs and changes value once', () => {
        const handleBlur = vi.fn();
        const handleValueChange = vi.fn();

        const TestTabs = () => {
            const [value, setValue] = useState('first');

            return (
                <Tabs value={value} onValueChange={(nextValue) => {
                    handleValueChange(nextValue);
                    setValue(nextValue);
                }}>
                    <TabsList>
                        <TabsTrigger value='first'>First</TabsTrigger>
                        <TabsTrigger value='second'>Second</TabsTrigger>
                    </TabsList>
                    <TabsContent value='first'><input aria-label='Field' onBlur={handleBlur} /></TabsContent>
                    <TabsContent value='second'>Second panel</TabsContent>
                </Tabs>
            );
        };

        render(<TestTabs />);
        const input = screen.getByRole('textbox', {name: 'Field'});
        const secondTab = screen.getByRole('tab', {name: 'Second'});
        act(() => input.focus());

        fireEvent.mouseDown(secondTab);
        act(() => secondTab.focus());

        assert.equal(handleBlur.mock.calls.length, 1, 'Blur handler should run before the panel unmounts');
        assert.equal(handleValueChange.mock.calls.length, 1, 'Value change handler should run once');
        assert.equal(secondTab.getAttribute('aria-selected'), 'true');
    });
});
