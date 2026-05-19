import {Button, DialogFooter} from '@tryghost/shade/components';

interface ProcessingStepProps {
    onUploadAnotherFile: () => void;
    onClose: () => void;
}

export function ProcessingStep({onUploadAnotherFile, onClose}: ProcessingStepProps) {
    return (
        <>
            <div className="mt-5">
                <p className="text-sm">
                    Your import is being processed, and you&apos;ll receive a confirmation email as soon as it&apos;s complete. Usually this only takes a few minutes, but larger imports may take longer.
                </p>
            </div>

            <DialogFooter className="mt-5">
                <Button variant="outline" onClick={onUploadAnotherFile}>
                    Upload another file
                </Button>
                <Button onClick={onClose}>
                    Got it
                </Button>
            </DialogFooter>
        </>
    );
}
