import React, {useEffect, useState} from 'react';
import {Button, Input, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade';
import {type MemberView, useDeleteMemberView, useSaveMemberView} from '../hooks/use-member-views';
import type {Filter} from '@tryghost/shade';

interface ManageViewPopoverProps {
    filters: Filter[];
    existingViews: MemberView[];
    activeView?: MemberView | null;
    onDeleted?: () => void;
}

const ManageViewPopover: React.FC<ManageViewPopoverProps> = ({filters, existingViews, activeView, onDeleted}) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const saveMemberView = useSaveMemberView();
    const deleteMemberView = useDeleteMemberView();

    const isEditing = !!activeView;

    // Pre-fill name when opening in edit mode
    useEffect(() => {
        if (open && activeView) {
            setName(activeView.name);
        }
    }, [open, activeView]);

    const handleSave = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Please enter a name');
            return;
        }

        // In create mode only, check for duplicate name before calling the hook
        if (!isEditing) {
            const duplicate = existingViews.find(v => v.name.trim().toLowerCase() === trimmed.toLowerCase()
            );
            if (duplicate) {
                setError('A view with this name already exists');
                return;
            }
        }

        setSaving(true);
        try {
            // In edit mode, pass activeView so the hook uses it as the identity anchor
            await saveMemberView(trimmed, filters, isEditing ? activeView : undefined);
            setName('');
            setError('');
            setOpen(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save view');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!activeView) {
            return;
        }

        setDeleting(true);
        try {
            await deleteMemberView(activeView);
            setName('');
            setError('');
            setConfirmingDelete(false);
            setOpen(false);
            onDeleted?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete view');
        } finally {
            setDeleting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleSave();
        }
    };

    return (
        <Popover open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
                setName('');
                setError('');
                setConfirmingDelete(false);
            }
        }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                >
                    {isEditing ? 'Edit view' : 'Save view'}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold">{isEditing ? 'Edit view' : 'Save view'}</h3>
                    <div className="flex flex-col gap-1.5">
                        <Input
                            placeholder="View name"
                            value={name}
                            autoFocus
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) {
                                    setError('');
                                }
                            }}
                            onKeyDown={handleKeyDown}
                        />
                        {error && (
                            <p className="text-xs text-red-500">{error}</p>
                        )}
                    </div>
                    {isEditing ? (
                        confirmingDelete ? (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Delete view?</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setConfirmingDelete(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled={deleting}
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => void handleDelete()}
                                    >
                                        {deleting ? 'Deleting...' : 'Delete'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <Button
                                    className="text-red hover:bg-red/5 hover:text-red"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmingDelete(true)}
                                >
                                    Delete
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled={saving || !name.trim()}
                                        size="sm"
                                        onClick={() => void handleSave()}
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        )
                    ) : (
                        <Button
                            className="w-full"
                            disabled={saving || !name.trim()}
                            onClick={() => void handleSave()}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ManageViewPopover;
