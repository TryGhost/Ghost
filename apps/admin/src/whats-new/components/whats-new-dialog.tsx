import { useEffect } from "react";
import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, LoadingIndicator} from "@tryghost/shade/components";
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
                aria-labelledby="whats-new-modal-title"
                aria-modal="true"
                className="flex max-h-[85vh] max-w-2xl flex-col"
                data-test-modal="whats-new"
                role="dialog"
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl tracking-tighter" id="whats-new-modal-title" data-test-modal-title>
                        What’s new?
                    </DialogTitle>
                </DialogHeader>

                {!changelog ? (
                    <div className="flex flex-1 items-center justify-center py-12">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : (
                    <>
                        <section className="-mx-6 flex-1 space-y-2 overflow-y-auto px-6" data-test-entries>
                            {changelog.entries.map((entry) => (
                                <ChangelogEntry key={entry.slug} entry={entry} />
                            ))}
                        </section>

                        <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
                            <Button variant="outline" asChild>
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
