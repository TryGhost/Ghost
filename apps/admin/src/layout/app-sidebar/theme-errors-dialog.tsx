import {useState} from 'react';
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    LucideIcon
} from '@tryghost/shade';
import type {ThemeProblem} from '@tryghost/admin-x-framework/api/themes';

interface ThemeErrorsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    errors: ThemeProblem<'error'>[];
    warnings: ThemeProblem<'warning'>[];
}

function ThemeErrorItem({error}: {error: ThemeProblem}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <li className="border-b border-border last:border-0">
            <button
                className="flex w-full items-center gap-2 py-3 text-left text-sm font-medium"
                type="button"
                onClick={() => setExpanded(!expanded)}
            >
                <LucideIcon.ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                <span>{error.rule}</span>
            </button>
            {expanded && (
                <div className="pb-3 pl-6 text-sm text-muted-foreground">
                    <p dangerouslySetInnerHTML={{__html: error.details}} />
                    {error.failures?.length > 0 && (
                        <div className="mt-2">
                            <h6 className="text-xs font-semibold uppercase text-muted-foreground">Affected files:</h6>
                            <ul className="mt-1 list-disc pl-4">
                                {error.failures.map((failure, i) => (
                                    <li key={i}>
                                        <code className="text-xs">{failure.ref}</code>
                                        {failure.message && <>: {failure.message}</>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}

function ThemeErrorsDialog({open, onOpenChange, errors, warnings}: ThemeErrorsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl tracking-tighter">
                        Theme errors
                    </DialogTitle>
                </DialogHeader>

                <section className="flex-1 overflow-y-auto -mx-6 px-6">
                    {errors.length > 0 && (
                        <div>
                            <h2 className="mb-1 text-sm font-semibold">Errors</h2>
                            <p className="mb-2 text-xs text-muted-foreground">
                                Highly recommended to fix, functionality could be restricted
                            </p>
                            <ul className="border-t border-border">
                                {errors.map((error, i) => (
                                    <ThemeErrorItem key={i} error={error} />
                                ))}
                            </ul>
                        </div>
                    )}

                    {warnings.length > 0 && (
                        <div className={errors.length > 0 ? 'mt-4' : ''}>
                            <h2 className="mb-1 text-sm font-semibold">Warnings</h2>
                            <ul className="border-t border-border">
                                {warnings.map((warning, i) => (
                                    <ThemeErrorItem key={i} error={warning} />
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ThemeErrorsDialog;
