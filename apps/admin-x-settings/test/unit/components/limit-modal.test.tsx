import LimitModal, {type LimitModalProps} from '@src/components/limit-modal';
import NiceModal from '@ebay/nice-modal-react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

describe('LimitModal', () => {
    afterEach(() => {
        void NiceModal.remove(LimitModal);
    });

    const showModal = (props: LimitModalProps) => {
        render(<NiceModal.Provider />);

        act(() => {
            void NiceModal.show(LimitModal, props);
        });
    };

    it('preserves the upgrade defaults and renders HTML prompts', async () => {
        const onOk = vi.fn();

        showModal({
            prompt: 'Upgrade to use <a href="https://ghost.org/pricing/">this feature</a>.',
            onOk
        });

        expect(await screen.findByRole('heading', {name: 'Upgrade your plan'})).toBeInTheDocument();
        const promptLink = screen.getByRole('link', {name: 'this feature'});
        expect(promptLink).toHaveAttribute('href', 'https://ghost.org/pricing/');
        expect(promptLink.closest('.w-full')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Upgrade'}));

        await waitFor(() => expect(onOk).toHaveBeenCalledOnce());
        expect(screen.getByTestId('limit-modal')).toBeInTheDocument();
    });
});
