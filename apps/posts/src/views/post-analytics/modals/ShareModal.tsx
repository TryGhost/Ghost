import {DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@tryghost/shade';

const ShareModal = () => {
    return (
        <DialogContent className='max-w-2xl'>
            <DialogHeader>
                <DialogTitle>Share</DialogTitle>
                <DialogDescription>
                    This is a dialog opened with router and with a custom width.
                </DialogDescription>
            </DialogHeader>
        </DialogContent>
    );
};

export default ShareModal;