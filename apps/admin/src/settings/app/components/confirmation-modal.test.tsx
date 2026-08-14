import ConfirmationModal, {type ConfirmationModalProps} from '@/settings/app/components/confirmation-modal';
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
        expect(screen.getByTestId('confirmation-modal')).toHaveClass('gap-6', 'p-6');
        expect(screen.getByRole('heading', {name: 'Delete newsletter?'})).toHaveClass('font-semibold');
        expect(screen.getByRole('heading', {name: 'Delete newsletter?'})).not.toHaveClass('font-bold');
        expect(screen.getByRole('button', {name: 'Keep it'})).toHaveClass('border-control-border', 'bg-transparent');
        expect(screen.getByRole('button', {name: 'Delete'}).parentElement).not.toHaveClass('[&>button]:min-w-20');

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

        const runningButton = screen.getByRole('button', {name: 'Activating...'});

        expect(runningButton).toBeDisabled();
        expect(runningButton).toHaveAttribute('aria-busy', 'true');
        expect(runningButton.firstElementChild).toHaveClass('animate-spin', 'border-current/20', 'before:bg-current');
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
