import assert from 'assert/strict';
import {beforeEach, describe, it} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';

import ShadeProvider, {useFocusContext} from '../../../../src/providers/shade-provider';
import {CodeEditor} from '../../../../src/components/ui/code-editor';
import {render} from '../../utils/test-utils';

class ResizeObserverMock implements ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
}

const FocusState = () => {
    const {isAnyTextFieldFocused} = useFocusContext();
    return <output data-testid='focus-state'>{String(isAnyTextFieldFocused)}</output>;
};

const Harness = ({showEditor = true}: {showEditor?: boolean}) => (
    <ShadeProvider darkMode={false} fetchKoenigLexical={null}>
        {showEditor && (
            <CodeEditor
                ariaLabel='Code editor'
                extensions={[]}
                hint='Add valid HTML.'
                value='<p>Hello</p>'
            />
        )}
        <FocusState />
    </ShadeProvider>
);

describe('CodeEditor', () => {
    beforeEach(() => {
        global.ResizeObserver = ResizeObserverMock;
    });

    it('associates hint text with the editable content', async () => {
        render(<Harness />);

        const editor = await screen.findByRole('textbox', {name: 'Code editor'});
        const descriptionId = editor.getAttribute('aria-describedby');

        assert.ok(descriptionId);
        assert.equal(document.getElementById(descriptionId)?.textContent, 'Add valid HTML.');
    });

    it('clears the shared focus state when a focused editor unmounts', async () => {
        const {rerender} = render(<Harness />);
        const editor = await screen.findByRole('textbox', {name: 'Code editor'});

        fireEvent.focus(editor);
        assert.equal(screen.getByTestId('focus-state').textContent, 'true');

        rerender(<Harness showEditor={false} />);
        assert.equal(screen.getByTestId('focus-state').textContent, 'false');
    });
});
