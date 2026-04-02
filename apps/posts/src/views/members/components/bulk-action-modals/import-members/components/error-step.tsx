import {Button, DialogFooter} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

interface ErrorStepProps {
    errorMessage: string | null;
    showTryAgainButton: boolean;
    onTryAgain: () => void;
    onClose: () => void;
}

export function ErrorStep({errorMessage, showTryAgainButton, onTryAgain, onClose}: ErrorStepProps) {
    return (
        <>
            <div className="mt-5">
                <div className="flex items-start gap-2 text-sm text-red-600">
                    <LucideIcon.AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>{errorMessage}</p>
                </div>
            </div>

            <DialogFooter className="mt-5">
                {showTryAgainButton && (
                    <Button variant="outline" onClick={onTryAgain}>
                        Try again
                    </Button>
                )}
                <Button onClick={onClose}>
                    OK
                </Button>
            </DialogFooter>
        </>
    );
}
