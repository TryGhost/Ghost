import {
    Badge,
    Button,
    Command,
    CommandCheck,
    CommandEmpty,
    CommandItem,
    CommandList,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    LucideIcon
} from '@tryghost/shade';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {useCallback, useEffect, useRef, useState} from 'react';

type UnsubscribeMode = 'all' | 'selected';

interface UnsubscribeModalProps {
    open: boolean;
    newsletters: Newsletter[];
    memberCount: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: (newsletterIds: string[] | null) => void;
    isLoading?: boolean;
}

export function UnsubscribeModal({
    open,
    newsletters,
    memberCount,
    onOpenChange,
    onConfirm,
    isLoading = false
}: UnsubscribeModalProps) {
    const [mode, setMode] = useState<UnsubscribeMode>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [listOpen, setListOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state when dialog is closed externally (e.g. parent sets open=false after confirm)
    useEffect(() => {
        if (!open) {
            setMode('all');
            setSelectedIds([]);
            setSearch('');
            setListOpen(false);
        }
    }, [open]);

    // Close list on click outside the picker
    useEffect(() => {
        if (!listOpen) {
            return;
        }
        const handlePointerDown = (e: PointerEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(e.target as Node)
            ) {
                setListOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [listOpen]);

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setMode('all');
            setSelectedIds([]);
            setSearch('');
            setListOpen(false);
        }
        onOpenChange(isOpen);
    };

    const toggleNewsletter = useCallback((id: string) => {
        setSelectedIds((prev) => {
            return prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id];
        });
    }, []);

    const showPicker = newsletters.length >= 2;

    const handleConfirm = () => {
        if (!showPicker || mode === 'all') {
            onConfirm(null);
        } else {
            onConfirm(selectedIds);
        }
    };

    const isDisabled =
        isLoading ||
        (showPicker && mode === 'selected' && selectedIds.length === 0);
    const memberLabel = memberCount === 1 ? 'member' : 'members';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="gap-5">
                <DialogHeader>
                    <DialogTitle>Unsubscribe members</DialogTitle>
                </DialogHeader>

                {showPicker ? (
                    <>
                        <div
                            aria-label="Unsubscribe scope"
                            className="flex flex-col gap-3"
                            role="radiogroup"
                        >
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    checked={mode === 'all'}
                                    className="mt-0.5 size-4 cursor-pointer accent-black"
                                    name="unsubscribe-mode"
                                    type="radio"
                                    value="all"
                                    onChange={() => setMode('all')}
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">
                                        Unsubscribe from all newsletters
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {memberCount.toLocaleString()}{' '}
                                        {memberLabel} will be unsubscribed from{' '}
                                        {newsletters.length}{' '}
                                        {newsletters.length === 1
                                            ? 'newsletter'
                                            : 'newsletters'}
                                        .
                                    </span>
                                </div>
                            </label>

                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    checked={mode === 'selected'}
                                    className="mt-0.5 size-4 cursor-pointer accent-black"
                                    name="unsubscribe-mode"
                                    type="radio"
                                    value="selected"
                                    onChange={() => setMode('selected')}
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">
                                        Unsubscribe from selected newsletters
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        Select which newsletters to unsubscribe{' '}
                                        {memberCount.toLocaleString()}{' '}
                                        {memberLabel} from.
                                    </span>
                                </div>
                            </label>
                        </div>

                        {mode === 'selected' && (
                            <div ref={pickerRef} className="relative space-y-2">
                                <label
                                    className="text-sm font-semibold"
                                    htmlFor="newsletter-search"
                                >
                                    Newsletters
                                </label>
                                <div
                                    className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-1 text-sm"
                                    onClick={() => {
                                        inputRef.current?.focus();
                                        setListOpen(true);
                                    }}
                                >
                                    {selectedIds.map((id) => {
                                        const nl = newsletters.find(
                                            n => n.id === id
                                        );
                                        if (!nl) {
                                            return null;
                                        }
                                        return (
                                            <Badge
                                                key={id}
                                                className="cursor-pointer gap-1 pr-1"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleNewsletter(id);
                                                }}
                                            >
                                                {nl.name}
                                                <LucideIcon.X className="size-3" />
                                            </Badge>
                                        );
                                    })}
                                    <input
                                        ref={inputRef}
                                        className="min-w-[80px] flex-1 bg-transparent py-1 text-sm outline-hidden placeholder:text-muted-foreground"
                                        id="newsletter-search"
                                        placeholder={
                                            selectedIds.length === 0
                                                ? 'Search newsletters...'
                                                : ''
                                        }
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            if (!listOpen) {
                                                setListOpen(true);
                                            }
                                        }}
                                        onFocus={() => setListOpen(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setListOpen(false);
                                                inputRef.current?.blur();
                                            }
                                            if (
                                                e.key === 'Backspace' &&
                                                !search &&
                                                selectedIds.length > 0
                                            ) {
                                                toggleNewsletter(
                                                    selectedIds[
                                                        selectedIds.length - 1
                                                    ]
                                                );
                                            }
                                        }}
                                    />
                                </div>
                                {listOpen && (
                                    <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-white shadow-md dark:bg-gray-950">
                                        <Command shouldFilter={false}>
                                            <CommandList className="max-h-64 overflow-y-auto">
                                                <CommandEmpty>
                                                    No newsletters found.
                                                </CommandEmpty>
                                                {newsletters
                                                    .filter(n => n.name
                                                        .toLowerCase()
                                                        .includes(
                                                            search.toLowerCase()
                                                        )
                                                    )
                                                    .map(newsletter => (
                                                        <CommandItem
                                                            key={newsletter.id}
                                                            value={
                                                                newsletter.name
                                                            }
                                                            onSelect={() => toggleNewsletter(
                                                                newsletter.id
                                                            )
                                                            }
                                                        >
                                                            {newsletter.name}
                                                            {selectedIds.includes(
                                                                newsletter.id
                                                            ) && (
                                                                <CommandCheck />
                                                            )}
                                                        </CommandItem>
                                                    ))}
                                            </CommandList>
                                        </Command>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to unsubscribe{' '}
                        {memberCount.toLocaleString()} {memberLabel} from all
                        newsletters? They will no longer receive any email
                        newsletters from you.
                    </p>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={isDisabled}
                        variant="destructive"
                        onClick={handleConfirm}
                    >
                        {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
