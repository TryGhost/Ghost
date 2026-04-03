import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {LabelPicker} from '@src/components/label-picker';
import {useCallback, useState} from 'react';
import {useLabelPicker} from '@src/hooks/use-label-picker';

interface AddLabelModalProps {
    open: boolean;
    memberCount: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: (labelIds: string[]) => void;
    isLoading?: boolean;
}

export function AddLabelModal({
    open,
    memberCount,
    onOpenChange,
    onConfirm,
    isLoading = false
}: AddLabelModalProps) {
    const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

    const picker = useLabelPicker({
        selectedSlugs,
        onSelectionChange: setSelectedSlugs
    });

    const handleOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen) {
            setSelectedSlugs([]);
        }
        onOpenChange(isOpen);
    }, [onOpenChange]);

    const handleConfirm = () => {
        const labelIds = picker.labels
            .filter(l => selectedSlugs.includes(l.slug))
            .map(l => l.id);
        if (labelIds.length > 0) {
            onConfirm(labelIds);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="gap-5" onOpenAutoFocus={e => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>
                        Add label to {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}
                    </DialogTitle>
                </DialogHeader>

                <LabelPicker
                    canCreateFromSearch={picker.canCreateFromSearch}
                    isCreating={picker.isCreating}
                    isDuplicateName={picker.isDuplicateName}
                    isLoading={picker.isLoading}
                    labels={picker.labels}
                    resolvedSelectedLabels={picker.resolvedSelectedLabels}
                    searchValue={picker.searchValue}
                    selectedSlugs={selectedSlugs}
                    onCreate={picker.createLabel}
                    onDelete={picker.deleteLabel}
                    onEdit={picker.editLabel}
                    onSearchChange={picker.onSearchChange}
                    onToggle={picker.toggleLabel}
                />

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={selectedSlugs.length === 0 || isLoading}
                        onClick={handleConfirm}
                    >
                        {isLoading ? 'Adding...' : selectedSlugs.length > 1 ? `Add ${selectedSlugs.length} labels` : 'Add label'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
