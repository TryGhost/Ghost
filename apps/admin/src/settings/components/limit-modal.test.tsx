import { type LimitModalProps } from '@/settings/components/limit-modal';
import { useEffect } from 'react';
import { ConfirmationProvider } from '@/settings/providers/confirmation-provider';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

describe('LimitModal', () => {
  const showModal = (props: LimitModalProps) => {
    const Trigger = () => {
      const { showLimit } = useConfirmation();
      useEffect(() => {
        showLimit(props);
      }, [showLimit]);
      return null;
    };
    render(
      <ConfirmationProvider>
        <Trigger />
      </ConfirmationProvider>,
    );
  };

  it('preserves the upgrade defaults and renders HTML prompts', async () => {
    const onOk = vi.fn();

    showModal({
      prompt: 'Upgrade to use <a href="https://ghost.org/pricing/">this feature</a>.',
      onOk,
    });

    expect(await screen.findByRole('heading', { name: 'Upgrade your plan' })).toBeInTheDocument();
    const promptLink = screen.getByRole('link', { name: 'this feature' });
    expect(promptLink).toHaveAttribute('href', 'https://ghost.org/pricing/');
    expect(promptLink.closest('.w-full')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    await waitFor(() => expect(onOk).toHaveBeenCalledOnce());
    expect(screen.getByTestId('limit-modal')).toBeInTheDocument();
  });
});
