import {useState} from 'react';

import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

export const Checkpoint = ({disabled, discardLaterWork, onReturn}: {disabled?: boolean; discardLaterWork?: boolean; onReturn: () => void | Promise<void>}) => {
    const [confirming, setConfirming] = useState(false);

    return (
        <>
            <Button disabled={disabled} size='sm' type='button' variant='ghost' onClick={() => discardLaterWork ? setConfirming(true) : void onReturn()}>
                <LucideIcon.History aria-hidden='true' />
                Return to before this message
            </Button>
            <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Return to this checkpoint?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Later messages and their workspace changes will be discarded. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep current work</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button variant='destructive' onClick={() => void onReturn()}>Return and discard later work</Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
