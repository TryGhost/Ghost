import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import React from 'react';

interface PostShareModalProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
    children?: React.ReactNode;
}

const PostShareModal: React.FC<PostShareModalProps> = ({children, ...props}) => {
    return (
        <Dialog {...props}>
            <DialogTrigger className="cursor-pointer" asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Are you absolutely sure?
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. Are you sure you want to permanently delete this file from our servers?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="submit"
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button type="submit">
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PostShareModal;