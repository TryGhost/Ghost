import React, {useState} from 'react';
import {Button, Input, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade';
import {type MemberView, useDeleteMemberView, useSaveMemberView} from '../hooks/use-member-views';

interface ManageViewPopoverProps {
    filter: string;
    existingViews: MemberView[];
    activeView?: MemberView | null;
    onDeleted?: () => void;
}

interface ManageViewPopoverContentProps extends ManageViewPopoverProps {
    onClose: () => void;
}

const ManageViewPopoverContent: React.FC<ManageViewPopoverContentProps> = ({filter, existingViews, activeView, onDeleted, onClose}) => {
    const [name, setName] = useState(() => activeView?.name ?? '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const saveMemberView = useSaveMemberView();
    const deleteMemberView = useDeleteMemberView();

    const isEditing = Boolean(activeView);

    const handleSave = async () => {
        const trimmed = name.trim();

        if (!trimmed) {
            setError('Please enter a name');
            return;
        }

        if (!isEditing) {
            const duplicate = existingViews.find(view => view.name.trim().toLowerCase() === trimmed.toLowerCase());

            if (duplicate) {
                setError('A view with this name already exists');
                return;
            }
        }

        setSaving(true);

        try {
            await saveMemberView(trimmed, filter, activeView ?? undefined);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save view');
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
            onClose();
            onDeleted?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete view');
        } finally {
            setDeleting(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void handleSave();
        }
    };

    return (
        <PopoverContent align="end" className="w-72">
            <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">{isEditing ? 'Edit view' : 'Save view'}</h3>
                <div className="flex flex-col gap-1.5">
                    <Input
                        placeholder="View name"
                        value={name}
                        autoFocus
                        onChange={(event) => {
                            setName(event.target.value);

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
                                    onClick={onClose}
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
    );
};

const ManageViewPopover: React.FC<ManageViewPopoverProps> = ({filter, existingViews, activeView, onDeleted}) => {
    const [open, setOpen] = useState(false);
    const contentKey = activeView ? `edit:${activeView.name}:${activeView.filter.filter}` : `save:${filter}`;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline">
                    {activeView ? 'Edit view' : 'Save view'}
                </Button>
            </PopoverTrigger>
            {open && (
                <ManageViewPopoverContent
                    key={contentKey}
                    activeView={activeView}
                    existingViews={existingViews}
                    filter={filter}
                    onClose={() => setOpen(false)}
                    onDeleted={onDeleted}
                />
            )}
        </Popover>
    );
};

export default ManageViewPopover;
