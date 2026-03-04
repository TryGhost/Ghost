import {Button, DialogFooter} from '@tryghost/shade';
import {ImportResponse} from '../state';

interface CompleteStepProps {
    importResponse: ImportResponse;
    onReset: () => void;
    onClose: () => void;
}

export function CompleteStep({importResponse, onReset, onClose}: CompleteStepProps) {
    return (
        <>
            <div className="mt-5 space-y-4">
                {importResponse.importedCount === 0 ? (
                    <p className="text-sm">
                        No members were added{importResponse.errorCount > 0 ? ' due to the following errors:' : '.'}
                    </p>
                ) : (
                    <p className="text-sm">
                        A total of <strong>{importResponse.importedCount.toLocaleString()}</strong> {importResponse.importedCount === 1 ? 'person was' : 'people were'} successfully added or updated in your list of members, and now have access to your site.
                    </p>
                )}

                {importResponse.errorCount > 0 && (
                    <>
                        {importResponse.importedCount > 0 && (
                            <>
                                <hr className="border-grey-200" />
                                <p className="text-sm">
                                    <strong>{importResponse.errorCount.toLocaleString()}</strong> {importResponse.errorCount === 1 ? 'member was' : 'members were'} skipped due to the following errors:
                                </p>
                            </>
                        )}
                        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {importResponse.errorList.map(error => (
                                <li key={error.message}>{error.message} ({error.count})</li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <DialogFooter className="mt-5">
                {importResponse.errorCount > 0 ? (
                    <>
                        <Button variant="outline" asChild>
                            <a download={importResponse.errorCsvName} href={importResponse.errorCsvUrl}>
                                Download error file
                            </a>
                        </Button>
                        {importResponse.importedCount === 0 ? (
                            <Button onClick={onReset}>
                                Try again
                            </Button>
                        ) : (
                            <Button onClick={onClose}>
                                View members
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        {importResponse.importedCount === 0 ? (
                            <>
                                <Button variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                                <Button onClick={onReset}>
                                    Try again
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={onReset}>
                                    Upload another file
                                </Button>
                                <Button onClick={onClose}>
                                    View members
                                </Button>
                            </>
                        )}
                    </>
                )}
            </DialogFooter>
        </>
    );
}
