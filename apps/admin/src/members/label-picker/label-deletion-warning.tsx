import { Stack } from '@tryghost/shade/primitives';
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
import { Link } from '@tryghost/admin-x-framework';
import type { Label } from '@tryghost/admin-x-framework/api/labels';

export function LabelDeletionWarning({
  label,
  automations,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  label: Pick<Label, 'id' | 'name'>;
  automations: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Can&apos;t delete label</AlertDialogTitle>
          <AlertDialogDescription>
            {automations.length === 1 ? (
              <>
                <strong>{label.name}</strong> is the trigger for the active automation{' '}
                <strong>{automations[0].name}</strong>. Turn off the automation to delete this
                label.
              </>
            ) : (
              <>
                <strong>{label.name}</strong> is the trigger for these active automations. Turn off
                these automations to delete this label.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {automations.length > 1 && (
          <Stack className="max-h-64 overflow-y-auto" gap="sm">
            {automations.map((automation) => (
              <Link
                key={automation.id}
                aria-label={`Go to automation ${automation.name}`}
                className="text-sm font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground"
                to={`/automations/${automation.id}`}
              >
                {automation.name}
              </Link>
            ))}
          </Stack>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {automations.length === 1 && (
            <AlertDialogAction asChild>
              <Link to={`/automations/${automations[0].id}`}>Go to automation</Link>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
