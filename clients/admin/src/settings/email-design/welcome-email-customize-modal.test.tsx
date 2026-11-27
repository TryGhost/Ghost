import EmailDesignModal from '@/settings/email-design/email-design-modal';
import React, { useState } from 'react';
import { ButtonColorField } from '@/settings/email-design/design-fields/button-color-field';
import { DEFAULT_EMAIL_DESIGN } from '@/settings/email-design/types';
import { EmailDesignProvider } from '@/settings/email-design/email-design-provider';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@tryghost/shade/components', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/shade/components')>(
    '@tryghost/shade/components',
  );
  const react = await vi.importActual<typeof import('react')>('react');

  const DelayedPopoverContent = ({
    children,
    ...props
  }: React.ComponentProps<typeof actual.PopoverContent>) => {
    const [ready, setReady] = react.useState(false);

    react.useEffect(() => {
      const timeout = window.setTimeout(() => {
        setReady(true);
      }, 50);

      return () => window.clearTimeout(timeout);
    }, []);

    return ready ? <actual.PopoverContent {...props}>{children}</actual.PopoverContent> : null;
  };

  return {
    ...actual,
    PopoverContent: DelayedPopoverContent,
  };
});

const TestModal = ({ onClose }: { onClose?: () => void }) => {
  const [open, setOpen] = useState(true);

  return (
    <EmailDesignProvider
      accentColor="#ff0088"
      settings={DEFAULT_EMAIL_DESIGN}
      onSettingsChange={() => {}}
    >
      <EmailDesignModal
        open={open}
        preview={<div>Preview</div>}
        sidebar={<ButtonColorField />}
        testId="welcome-email-customize-modal"
        title="Customize welcome email"
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        onSave={() => {}}
      />
    </EmailDesignProvider>
  );
};

describe('Welcome email customize modal', function () {
  afterEach(function () {
    vi.useRealTimers();
  });

  it('keeps the customize modal open when Escape is pressed after the color picker has mounted', async function () {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(<TestModal onClose={onClose} />);

    fireEvent.click(screen.getByText('Button color'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(screen.getByRole('textbox')).toBeTruthy();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(onClose.mock.calls.length).toBe(0);
    expect(screen.getByTestId('welcome-email-customize-modal')).toBeTruthy();
  });

  it('keeps the customize modal open when Escape is pressed immediately after opening the color picker', function () {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(<TestModal onClose={onClose} />);

    act(() => {
      fireEvent.click(screen.getByText('Button color'));
      expect(screen.queryByRole('textbox')).toBeNull();
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByTestId('welcome-email-customize-modal')).toBeTruthy();
    expect(onClose.mock.calls.length).toBe(0);
  });
});
