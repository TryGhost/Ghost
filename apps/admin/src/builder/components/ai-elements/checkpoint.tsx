import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

export const Checkpoint = ({
  disabled,
  discardLaterWork,
  onReturn,
}: {
  disabled?: boolean;
  discardLaterWork?: boolean;
  onReturn: () => void | Promise<void>;
}) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Undo this message"
              className="size-6 [&_svg]:size-3"
              disabled={disabled}
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => (discardLaterWork ? setConfirming(true) : void onReturn())}
            >
              <LucideIcon.Undo2 aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo this message</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this message?</AlertDialogTitle>
            <AlertDialogDescription>
              Later messages and their workspace changes will be discarded. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current work</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={() => void onReturn()}>
                Undo and discard later work
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
