import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade';

const WelcomeEmailCustomizeModal = NiceModal.create(() => {
    const modal = useModal();

    return (
        <Dialog open onOpenChange={() => modal.remove()}>
            <DialogContent data-testid='welcome-email-customize-modal'>
                <DialogHeader>
                    <DialogTitle>Customize welcome emails</DialogTitle>
                </DialogHeader>
                <p className='text-sm text-muted-foreground'>Design customization options coming soon.</p>
                <DialogFooter>
                    <Button variant='outline' onClick={() => modal.remove()}>Close</Button>
                    <Button onClick={() => modal.remove()}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

export default WelcomeEmailCustomizeModal;
