import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@tryghost/shade';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {useState} from 'react';

interface AddLabelModalProps {
    open: boolean;
    labels: Label[];
    memberCount: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: (labelId: string) => void;
    isLoading?: boolean;
}

export function AddLabelModal({
    open,
    labels,
    memberCount,
    onOpenChange,
    onConfirm,
    isLoading = false
}: AddLabelModalProps) {
    const [selectedLabelId, setSelectedLabelId] = useState<string>('');

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedLabelId('');
        }
        onOpenChange(isOpen);
    };

    const handleConfirm = () => {
        if (selectedLabelId) {
            onConfirm(selectedLabelId);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="gap-5">
                <DialogHeader>
                    <DialogTitle>
                        Add label to {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Select label</label>
                    <Select value={selectedLabelId} onValueChange={setSelectedLabelId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a label..." />
                        </SelectTrigger>
                        <SelectContent>
                            {labels.map(label => (
                                <SelectItem key={label.id} value={label.id}>
                                    {label.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={!selectedLabelId || isLoading}
                        onClick={handleConfirm}
                    >
                        {isLoading ? 'Adding...' : 'Add label'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
