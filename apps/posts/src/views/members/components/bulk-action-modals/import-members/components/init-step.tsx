import {Banner, Button, DialogFooter, Dropzone} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

interface InitStepProps {
    fileError: string | null;
    onClose: () => void;
    onDropAccepted: (file: File) => void;
    onDropRejected: () => void;
}

export function InitStep({fileError, onClose, onDropAccepted, onDropRejected}: InitStepProps) {
    return (
        <>
            <div className="mt-5 space-y-5">
                <Banner variant="info">
                    Need some help? <a className="font-semibold underline" href="https://ghost.org/help/import-members/" rel="noopener noreferrer" target="_blank">Learn more</a> about importing members or <a className="font-semibold underline" href="https://static.ghost.org/v4.0.0/files/member-import-template.csv" rel="noopener noreferrer" target="_blank">download a sample CSV file</a>.
                </Banner>

                {fileError && (
                    <div className="flex items-start gap-2 text-sm text-red-600">
                        <LucideIcon.AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <p>{fileError}</p>
                    </div>
                )}

                <Dropzone
                    accept={{
                        'text/csv': ['.csv'],
                        'application/vnd.ms-excel': ['.csv']
                    }}
                    aria-label="Select or drop a CSV file"
                    onDropAccepted={(files) => {
                        const selectedFile = files[0];
                        if (selectedFile) {
                            onDropAccepted(selectedFile);
                        }
                    }}
                    onDropRejected={onDropRejected}
                >
                    {({isDragActive, isDragReject}) => (
                        <>
                            <LucideIcon.Upload className="mb-2 size-6 text-grey-600" />
                            <span className="text-sm text-grey-700">
                                {isDragReject
                                    ? 'The file type you uploaded is not supported'
                                    : isDragActive
                                        ? 'Drop CSV file to upload'
                                        : 'Select or drop a CSV file'}
                            </span>
                        </>
                    )}
                </Dropzone>
            </div>

            <DialogFooter className="mt-5">
                <Button variant="outline" onClick={onClose}>
                    Close
                </Button>
            </DialogFooter>
        </>
    );
}
