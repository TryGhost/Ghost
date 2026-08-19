import React, {useEffect, useRef, useState} from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    LoadingIndicator
} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';

export type ExportMode = 'sync' | 'async';

type ExportComponentKey = 'content' | 'members' | 'analytics' | 'themes' | 'routes' | 'media';

type ExportComponent = {
    key: ExportComponentKey;
    label: string;
    description: string;
    defaultChecked: boolean;
    asyncOnly?: boolean;
};

const EXPORT_COMPONENTS: ExportComponent[] = [
    {key: 'content', label: 'Content & settings', description: 'Posts, pages, tags, tiers and settings (JSON)', defaultChecked: true},
    {key: 'members', label: 'Members', description: 'All members with labels and subscription status (CSV)', defaultChecked: true},
    {key: 'analytics', label: 'Post analytics', description: 'Sends, opens, clicks and conversions per post (CSV)', defaultChecked: true},
    {key: 'themes', label: 'Themes', description: 'All installed themes, including custom code', defaultChecked: true},
    {key: 'routes', label: 'Redirects & routes', description: 'routes.yaml and redirects configuration', defaultChecked: true},
    {key: 'media', label: 'Media files', description: 'All images, video and audio files. May significantly increase export size and duration', defaultChecked: false, asyncOnly: true}
];

type ExportPhase = 'select' | 'confirmed' | 'preparing' | 'done';

const ExportAllModal: React.FC<{open: boolean; onOpenChange: (open: boolean) => void; mode: ExportMode}> = ({open, onOpenChange, mode}) => {
    const {data: currentUser} = useCurrentUser();
    const [phase, setPhase] = useState<ExportPhase>('select');
    const [selected, setSelected] = useState<Record<ExportComponentKey, boolean>>(() => {
        const initial = {} as Record<ExportComponentKey, boolean>;
        EXPORT_COMPONENTS.forEach((component) => {
            initial[component.key] = component.defaultChecked;
        });
        return initial;
    });
    const mockTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

    const email = currentUser?.email;
    const visibleComponents = EXPORT_COMPONENTS.filter(component => mode === 'async' || !component.asyncOnly);
    const noneSelected = visibleComponents.every(component => !selected[component.key]);

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);
        if (next) {
            clearTimeout(resetTimerRef.current);
            setPhase('select');
            return;
        }
        clearTimeout(mockTimerRef.current);
        clearTimeout(resetTimerRef.current);
        // Reset for the next open, after the close animation
        resetTimerRef.current = setTimeout(() => setPhase('select'), 200);
    };

    // Static UX/UI mockup, nothing is wired to a backend
    const startExport = () => {
        if (mode === 'async') {
            setPhase('confirmed');
            return;
        }
        setPhase('preparing');
        mockTimerRef.current = setTimeout(() => {
            triggerMockDownload();
            setPhase('done');
        }, 10000);
    };

    const triggerMockDownload = () => {
        const emptyZip = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...new Array<number>(18).fill(0)]);
        const url = URL.createObjectURL(new Blob([emptyZip], {type: 'application/zip'}));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'ghost-export.zip';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        return () => {
            clearTimeout(mockTimerRef.current);
            clearTimeout(resetTimerRef.current);
        };
    }, []);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className='max-h-[85vh] max-w-md overflow-y-auto'>
                {phase === 'select' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Export data</DialogTitle>
                            <DialogDescription>
                                {mode === 'async'
                                    ? 'Choose what to include. Your export will be prepared in the background and a download link sent to you by email.'
                                    : <>
                                        Your export will be downloaded as a single zip file.{' '}
                                        Images, videos and files are not included.{' '}
                                        <a
                                            className='font-medium whitespace-nowrap text-foreground hover:underline'
                                            href='https://docs.ghost.org/migration/ghost#images'
                                            rel='noopener noreferrer'
                                            target='_blank'
                                        >Learn more &rarr;</a>
                                    </>}
                            </DialogDescription>
                        </DialogHeader>
                        <div className='flex flex-col gap-1 py-1'>
                            {visibleComponents.map(component => (
                                <label
                                    key={component.key}
                                    className='flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60'
                                    htmlFor={`export-${component.key}`}
                                >
                                    <Checkbox
                                        checked={selected[component.key]}
                                        className='mt-0.5'
                                        id={`export-${component.key}`}
                                        onCheckedChange={checked => setSelected(current => ({...current, [component.key]: checked === true}))}
                                    />
                                    <span className='flex flex-col'>
                                        <span className='text-sm font-medium text-foreground'>{component.label}</span>
                                        <span className='text-xs text-muted-foreground'>{component.description}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <DialogFooter className='gap-2 sm:justify-end'>
                            <Button variant='outline' onClick={() => handleOpenChange(false)}>Cancel</Button>
                            <Button disabled={noneSelected} onClick={startExport}>
                                <LucideIcon.Download /> Export
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {phase === 'confirmed' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className='flex items-center gap-2'>
                                <LucideIcon.CircleCheck className='size-5 text-green-600' /> Exporting data&hellip;
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                            A link to download your data will be sent to your email <span className='font-medium text-foreground'>{email}</span> once
                            the export is complete. The link will be valid for 7 days. You can now close this window.
                        </DialogDescription>
                        <DialogFooter className='sm:justify-end'>
                            <Button onClick={() => handleOpenChange(false)}>Close</Button>
                        </DialogFooter>
                    </>
                )}

                {phase === 'preparing' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className='flex items-center gap-2'>
                                <LoadingIndicator size='sm' /> Preparing your export&hellip;
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                            Your download will start automatically when it&rsquo;s ready. Keep this window open.
                        </DialogDescription>
                        <DialogFooter className='sm:justify-end'>
                            <Button variant='outline' onClick={() => handleOpenChange(false)}>Cancel</Button>
                        </DialogFooter>
                    </>
                )}

                {phase === 'done' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className='flex items-center gap-2'>
                                <LucideIcon.CircleCheck className='size-5 text-green-600' /> Export downloaded
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                            Your export has been downloaded as a zip file.
                        </DialogDescription>
                        <DialogFooter className='sm:justify-end'>
                            <Button onClick={() => handleOpenChange(false)}>Close</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ExportAllModal;
