import React, {useEffect, useRef, useState} from 'react';
import {Button} from '@tryghost/shade/components';
import {Label} from '@tryghost/admin-x-framework/api/labels';

interface EditRowProps {
    label: Label;
    onSave: (id: string, name: string) => Promise<void>;
    onCancel: () => void;
    onDelete: (id: string) => Promise<void>;
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
}

export const EditRow: React.FC<EditRowProps> = ({label, onSave, onCancel, onDelete, isDuplicateName}) => {
    const [name, setName] = useState(label.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isBusy = isSaving || isDeleting;

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const validate = (value: string): string => {
        const trimmed = value.trim();
        if (!trimmed) {
            return 'Name is required';
        }
        if (isDuplicateName?.(trimmed, label.id)) {
            return 'A label with this name already exists';
        }
        return '';
    };

    const handleSave = async () => {
        const validationError = validate(name);
        if (validationError) {
            setError(validationError);
            return;
        }
        setIsSaving(true);
        try {
            await onSave(label.id, name.trim());
            onCancel();
        } catch {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (!isBusy) {
                onCancel();
            }
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(label.id);
        } catch {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="flex flex-col gap-2 py-1.5" data-edit-row>
            <input
                ref={inputRef}
                className="h-7 w-full rounded border border-border bg-background px-2 text-sm outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={isBusy}
                type="text"
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                }}
                onKeyDown={handleKeyDown}
            />
            {error && <span className="text-xs text-destructive">{error}</span>}
            {showDeleteConfirm ? (
                <div className="flex items-center gap-1 text-sm">
                    <span className="flex-1 font-semibold">Delete label?</span>
                    <Button
                        className="h-6 px-2 text-xs"
                        disabled={isBusy}
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="h-6 px-2 text-xs"
                        disabled={isBusy}
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            ) : (
                <div className="flex items-center">
                    <Button
                        className="h-6 gap-1 px-1.5 text-xs text-red hover:bg-red/5 hover:text-red"
                        disabled={isBusy}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        Delete
                    </Button>
                    <div className="ml-auto flex gap-1">
                        <Button
                            className="h-6 px-2 text-xs"
                            disabled={isBusy}
                            size="sm"
                            variant="outline"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-6 px-2 text-xs"
                            disabled={isBusy}
                            size="sm"
                            onClick={handleSave}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
