import ConfirmationModal, {type ConfirmationModalProps} from '@src/components/confirmation-modal';
import NiceModal from '@ebay/nice-modal-react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

describe('ConfirmationModal', () => {
    afterEach(() => {
        void NiceModal.remove(ConfirmationModal);
    });

    const showModal = (props: ConfirmationModalProps) => {
        render(<NiceModal.Provider />);

        act(() => {
            void NiceModal.show(ConfirmationModal, props);
        });
    };

    it('renders the supplied content and confirms without closing implicitly', async () => {
        const onOk = vi.fn();

        showModal({
            title: 'Delete newsletter?',
            prompt: 'This cannot be undone.',
            cancelLabel: 'Keep it',
            okLabel: 'Delete',
            onOk
        });

        expect(await screen.findByRole('heading', {name: 'Delete newsletter?'})).toBeInTheDocument();
        expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Delete'}));

        await waitFor(() => expect(onOk).toHaveBeenCalledOnce());
        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });

    it('disables both actions and shows the running label while confirming', async () => {
        let resolveTask: () => void = () => undefined;
        const task = new Promise<void>((resolve) => {
            resolveTask = resolve;
        });

        showModal({
            okLabel: 'Activate',
            okRunningLabel: 'Activating...',
            onOk: () => task
        });

        const confirmButton = await screen.findByRole('button', {name: 'Activate'});
        fireEvent.click(confirmButton);

        expect(screen.getByRole('button', {name: 'Activating...'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Cancel'})).toBeDisabled();

        resolveTask();

        await waitFor(() => expect(screen.getByRole('button', {name: 'Activate'})).toBeEnabled());
    });

    it('delegates cancellation when a caller owns the close behavior', async () => {
        const onCancel = vi.fn();

        showModal({onCancel});

        fireEvent.click(await screen.findByRole('button', {name: 'Cancel'}));

        expect(onCancel).toHaveBeenCalledOnce();
        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });
});
