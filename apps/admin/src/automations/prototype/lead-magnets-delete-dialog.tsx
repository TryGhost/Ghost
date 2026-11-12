// PROTOTYPE ONLY (NY-1750): "Can't delete label", from the label picker's Delete when an active
// automation uses the label. Don't merge this folder.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@tryghost/shade/components';

// The dialog's message, also shown on the states page.
export const LeadMagnetDeleteBlockedDescription: React.FC<{
  labelName: string;
  automationName: string;
}> = ({ labelName, automationName }) => (
  <>
    <strong>{labelName}</strong> is the trigger for the active automation{' '}
    <strong>{automationName}</strong>. Turn off the automation to delete this label.
  </>
);

export const LeadMagnetDeleteBlockedDialog: React.FC<{
  labelName: string;
  automation: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ labelName, automation, open, onOpenChange }) => (
  // The label picker closes on any pointerdown outside it, and this dialog is portalled outside.
  // React events bubble through portals, so stopping them here keeps the picker open behind the
  // dialog and after it closes. `contents` adds no box.
  <div className="contents" onPointerDown={(event) => event.stopPropagation()}>
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Can&apos;t delete label</AlertDialogTitle>
          <AlertDialogDescription>
            <LeadMagnetDeleteBlockedDescription
              automationName={automation.name}
              labelName={labelName}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              window.location.hash = `#/automations/${automation.id}`;
            }}
          >
            Go to automation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
