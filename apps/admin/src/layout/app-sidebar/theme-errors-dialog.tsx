import { ThemeValidationIssueList } from '@/settings/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import type { ThemeProblem } from '@tryghost/admin-x-framework/api/themes';

interface ThemeErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ThemeProblem<'error'>[];
  warnings: ThemeProblem<'warning'>[];
}

function ThemeErrorsDialog({ open, onOpenChange, errors, warnings }: ThemeErrorsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-[600px] flex-col bg-background"
      >
        <DialogHeader>
          <DialogTitle className="leading-normal tracking-normal">Theme errors</DialogTitle>
        </DialogHeader>

        <section className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
          <ThemeValidationIssueList problems={[...errors, ...warnings]} />
        </section>

        <DialogFooter className="shrink-0">
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ThemeErrorsDialog;
