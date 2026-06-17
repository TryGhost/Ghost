import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    type ArchiveDirHandle,
    type ArchiveItem,
    type ArchiveProgress,
    type ArchiveResult,
    pickArchiveFolder,
    runFolderArchive,
    runZipArchive,
    supportsFolderArchive
} from './media-archive';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {clearArchiveSession, ensureHandlePermission, loadArchiveSession, saveArchiveSession} from './media-archive-store';

type ArchivePhase = 'closed' | 'intro' | 'running' | 'done';

const ZIP_FILENAME = 'media-archive.zip';

// Drives the whole "Download all media" flow. The download runs as plain async
// JS tied to this hook, so it keeps going as long as the component is mounted —
// the only thing that stops it is Cancel (which aborts) or closing the tab.
export function useMediaArchive(items: ArchiveItem[]) {
    const folderMode = supportsFolderArchive();

    const [phase, setPhase] = useState<ArchivePhase>('closed');
    const [progress, setProgress] = useState<ArchiveProgress | null>(null);
    const [result, setResult] = useState<ArchiveResult | null>(null);
    const [hasResumable, setHasResumable] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const rootRef = useRef<ArchiveDirHandle | null>(null); // folder in use, kept for Retry failed

    const open = useCallback(() => {
        setResult(null);
        setProgress(null);
        setPhase('intro');
        // Only the folder path can resume (the zip leaves nothing on disk to skip).
        if (folderMode) {
            loadArchiveSession().then(session => setHasResumable(Boolean(session)));
        }
    }, [folderMode]);

    const runFolder = useCallback(async (root: ArchiveDirHandle, runItems: ArchiveItem[], skipExisting: boolean) => {
        rootRef.current = root;
        const controller = new AbortController();
        abortRef.current = controller;
        setProgress({total: runItems.length, completed: 0, skipped: 0, failed: 0, currentFile: null});
        setPhase('running');
        const archiveResult = await runFolderArchive({items: runItems, root, signal: controller.signal, skipExisting, onProgress: setProgress});
        // A clean, complete run has nothing left to resume, so drop the saved
        // session rather than leave a stale "Resume" option pointing at it.
        if (!archiveResult.cancelled && !archiveResult.diskFull && archiveResult.failures.length === 0) {
            await clearArchiveSession();
            setHasResumable(false);
        }
        setResult(archiveResult);
        setPhase('done');
    }, []);

    const runZip = useCallback(async (runItems: ArchiveItem[], fileName: string) => {
        const controller = new AbortController();
        abortRef.current = controller;
        setProgress({total: runItems.length, completed: 0, skipped: 0, failed: 0, currentFile: null});
        setPhase('running');
        const archiveResult = await runZipArchive({items: runItems, signal: controller.signal, fileName, onProgress: setProgress});
        setResult(archiveResult);
        setPhase('done');
    }, []);

    const startFolder = useCallback(async () => {
        const root = await pickArchiveFolder(); // the click into this is the required user gesture
        if (!root) {
            return; // user dismissed the picker
        }
        await saveArchiveSession(root, items); // enables one-click resume next time
        await runFolder(root, items, true);
    }, [items, runFolder]);

    const startZip = useCallback(() => runZip(items, ZIP_FILENAME), [items, runZip]);

    const resume = useCallback(async () => {
        const session = await loadArchiveSession();
        if (!session) {
            setHasResumable(false);
            return;
        }
        // The browser drops the folder grant between sessions; this re-asks, using
        // the Resume click as the gesture. Files already written are then skipped.
        if (!(await ensureHandlePermission(session.handle))) {
            return;
        }
        await runFolder(session.handle, session.items, true);
    }, [runFolder]);

    const retryFailed = useCallback(async () => {
        const failedItems = result?.failures.map(failure => failure.item) ?? [];
        if (failedItems.length === 0) {
            return;
        }
        if (folderMode && rootRef.current) {
            await runFolder(rootRef.current, failedItems, false); // they never landed, so don't skip
        } else {
            await runZip(failedItems, 'media-archive-retry.zip');
        }
    }, [result, folderMode, runFolder, runZip]);

    const cancel = useCallback(() => abortRef.current?.abort(), []);

    const close = useCallback(() => {
        abortRef.current?.abort();
        setPhase('closed');
    }, []);

    // Guard against closing the tab mid-run, which would kill the download.
    useEffect(() => {
        if (phase !== 'running') {
            return;
        }
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [phase]);

    return {phase, progress, result, folderMode, hasResumable, itemCount: items.length, open, startFolder, startZip, resume, retryFailed, cancel, close};
}

export type MediaArchive = ReturnType<typeof useMediaArchive>;

const ProgressBar: React.FC<{done: number; total: number}> = ({done, total}) => {
    const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return (
        <div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
            <div className='h-full rounded-full bg-primary transition-[width] duration-200' style={{width: `${percent}%`}} />
        </div>
    );
};

const IntroBody: React.FC<{archive: MediaArchive; count: number}> = ({archive, count}) => {
    if (archive.folderMode) {
        return (
            <DialogDescription>
                {formatNumber(count)} {count === 1 ? 'file' : 'files'} will download straight from your CDN into a folder
                you choose, recreating the original <code>content/</code> structure. Ghost&rsquo;s servers aren&rsquo;t
                involved, so this works even on very large libraries, and you can close this and resume later.
            </DialogDescription>
        );
    }
    return (
        <DialogDescription>
            {formatNumber(count)} {count === 1 ? 'file' : 'files'} will be packed into a single <code>.zip</code>.
            Large libraries are held in memory while zipping, so for very big sites we recommend using Chrome or Edge,
            which can stream straight to a folder instead.
        </DialogDescription>
    );
};

const RunningBody: React.FC<{progress: ArchiveProgress; onCancel: () => void}> = ({progress, onCancel}) => {
    const done = progress.completed + progress.skipped;
    return (
        <div className='flex flex-col gap-4'>
            <ProgressBar done={done} total={progress.total} />
            <div className='flex items-center justify-between text-sm'>
                <span className='font-medium text-foreground'>
                    {formatNumber(done)} of {formatNumber(progress.total)}
                </span>
                <span className='text-muted-foreground'>
                    {progress.total > 0 ? Math.round((done / progress.total) * 100) : 0}%
                </span>
            </div>
            {progress.currentFile && (
                <div className='truncate text-xs text-muted-foreground' title={progress.currentFile}>
                    {progress.currentFile}
                </div>
            )}
            <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                {progress.skipped > 0 && <span>{formatNumber(progress.skipped)} already saved</span>}
                {progress.failed > 0 && <span className='text-destructive'>{formatNumber(progress.failed)} failed</span>}
            </div>
            <div className='flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground'>
                <LucideIcon.Info className='size-4 shrink-0' />
                Keep this tab open until the download finishes.
            </div>
            <div className='flex justify-end'>
                <Button size='sm' variant='outline' onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
};

const doneTitle = (result: ArchiveResult): string => {
    if (result.diskFull) {
        return 'Ran out of disk space';
    }
    if (result.cancelled) {
        return 'Download cancelled';
    }
    if (result.failures.length > 0) {
        return 'Download finished with errors';
    }
    return 'Download complete';
};

const DoneBody: React.FC<{result: ArchiveResult}> = ({result}) => (
    <div className='flex flex-col gap-3 text-sm'>
        <div className='flex flex-col gap-1'>
            <span className='text-foreground'>{formatNumber(result.completed)} downloaded</span>
            {result.skipped > 0 && <span className='text-muted-foreground'>{formatNumber(result.skipped)} already saved (skipped)</span>}
            {result.failures.length > 0 && <span className='text-destructive'>{formatNumber(result.failures.length)} failed</span>}
        </div>
        {result.diskFull && (
            <p className='text-muted-foreground'>Your disk filled up before the download finished. Free up space and resume to get the rest.</p>
        )}
        {result.failures.length > 0 && !result.diskFull && (
            <p className='text-muted-foreground'>Some files couldn&rsquo;t be downloaded. You can retry just those.</p>
        )}
    </div>
);

export const MediaArchiveDialog: React.FC<{archive: MediaArchive}> = ({archive}) => {
    const {phase, progress, result} = archive;

    return (
        <Dialog
            open={phase !== 'closed'}
            onOpenChange={(next) => {
                // Don't let an outside-click/escape dismiss a live download; Cancel is
                // the explicit way out while it runs.
                if (!next && phase !== 'running') {
                    archive.close();
                }
            }}
        >
            <DialogContent className='max-w-md'>
                {phase === 'intro' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Download all media in use</DialogTitle>
                        </DialogHeader>
                        <IntroBody archive={archive} count={archive.itemCount} />
                        <DialogFooter className='gap-2 sm:justify-end'>
                            <Button variant='outline' onClick={archive.close}>Cancel</Button>
                            {archive.folderMode ? (
                                <>
                                    {archive.hasResumable && (
                                        <Button variant='secondary' onClick={archive.resume}>Resume previous download</Button>
                                    )}
                                    <Button onClick={archive.startFolder}>
                                        <LucideIcon.FolderDown /> Choose folder &amp; download
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={archive.startZip}>
                                    <LucideIcon.Download /> Download .zip
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                )}

                {phase === 'running' && progress && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Downloading media</DialogTitle>
                        </DialogHeader>
                        <RunningBody progress={progress} onCancel={archive.cancel} />
                    </>
                )}

                {phase === 'done' && result && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{doneTitle(result)}</DialogTitle>
                        </DialogHeader>
                        <DoneBody result={result} />
                        <DialogFooter className='gap-2 sm:justify-end'>
                            {result.failures.length > 0 && (
                                <Button variant='outline' onClick={archive.retryFailed}>Retry failed</Button>
                            )}
                            <Button onClick={archive.close}>Done</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
