import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import ShadeProvider from '../../../../src/providers/shade-provider';
import { useFocusContext } from '../../../../src/providers/shade-context';
import { CodeEditor } from '../../../../src/components/ui/code-editor';
import { render } from '../../utils/test-utils';

class ResizeObserverMock implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

const FocusState = () => {
  const { isAnyTextFieldFocused } = useFocusContext();
  return <output data-testid="focus-state">{String(isAnyTextFieldFocused)}</output>;
};

const Harness = ({ showEditor = true }: { showEditor?: boolean }) => (
  <ShadeProvider darkMode={false}>
    {showEditor && (
      <CodeEditor
        ariaLabel="Code editor"
        extensions={[]}
        hint="Add valid HTML."
        value="<p>Hello</p>"
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

    const editor = await screen.findByRole('textbox', { name: 'Code editor' });
    const descriptionId = editor.getAttribute('aria-describedby')!;

    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId)?.textContent).toBe('Add valid HTML.');
  });

  it('associates the visible title and renders as one layout item', async () => {
    render(
      <ShadeProvider darkMode={false}>
        <div data-testid="editor-layout">
          <CodeEditor extensions={[]} title="HTML editor" value="<p>Hello</p>" />
        </div>
      </ShadeProvider>,
    );

    const editor = await screen.findByRole('textbox', { name: 'HTML editor' });
    const labelId = editor.getAttribute('aria-labelledby')!;

    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId)?.textContent).toBe('HTML editor');
    expect(screen.getByTestId('editor-layout').childElementCount).toBe(1);

    fireEvent.click(document.getElementById(labelId)!);
    expect(document.activeElement).toBe(editor);
  });

  it('clears the shared focus state when a focused editor unmounts', async () => {
    const { rerender } = render(<Harness />);
    const editor = await screen.findByRole('textbox', { name: 'Code editor' });

    fireEvent.focus(editor);
    expect(screen.getByTestId('focus-state').textContent).toBe('true');

    rerender(<Harness showEditor={false} />);
    expect(screen.getByTestId('focus-state').textContent).toBe('false');
  });
});
