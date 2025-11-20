import { useEffect } from "react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, LoadingIndicator } from "@tryghost/shade";
import { useChangelog } from "@/whats-new/hooks/use-changelog";
import { useDismissWhatsNew } from "@/whats-new/hooks/use-whats-new";
import ChangelogEntry from "@/whats-new/components/changelog-entry";

interface WhatsNewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
    const { data: changelog } = useChangelog();
    const { mutate: dismissWhatsNew } = useDismissWhatsNew();

    // Mark as seen when dialog opens
    useEffect(() => {
        if (open) {
            dismissWhatsNew();
        }
    }, [open, dismissWhatsNew]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-2xl max-h-[85vh] flex flex-col"
                data-test-modal="whats-new"
                role="dialog"
                aria-modal="true"
                aria-labelledby="whats-new-modal-title"
            >
                <DialogHeader>
                    <DialogTitle id="whats-new-modal-title" data-test-modal-title className="text-2xl tracking-tighter">
                        What’s new?
                    </DialogTitle>
                </DialogHeader>

                {!changelog ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : (
                    <>
                        <section className="flex-1 overflow-y-auto space-y-2 -mx-6 px-6" data-test-entries>
                            {changelog.entries.map((entry) => (
                                <ChangelogEntry key={entry.slug} entry={entry} />
                            ))}
                        </section>

                        <DialogFooter className="flex-row justify-between sm:justify-between gap-3">
                            <Button asChild variant="outline">
                                <a href={`${changelog.changelogUrl}#/portal/signup`} rel="noopener noreferrer" target="_blank">
                                    Turn on notifications
                                </a>
                            </Button>
                            <Button asChild>
                                <a href={changelog.changelogUrl} rel="noopener noreferrer" target="_blank">
                                    All updates →
                                </a>
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default WhatsNewDialog;
