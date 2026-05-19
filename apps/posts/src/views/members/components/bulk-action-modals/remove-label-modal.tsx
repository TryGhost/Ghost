import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {LabelPicker} from '@src/components/label-picker';
import {formatNumber} from '@tryghost/shade/utils';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useCallback, useMemo, useState} from 'react';
import {useLabelPicker} from '@src/hooks/use-label-picker';

interface RemoveLabelModalProps {
    open: boolean;
    memberCount: number;
    nql?: string;
    search?: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: (labelIds: string[]) => void;
    isLoading?: boolean;
}

export function RemoveLabelModal({
    open,
    memberCount,
    nql,
    search,
    onOpenChange,
    onConfirm,
    isLoading = false
}: RemoveLabelModalProps) {
    const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

    // Fetch members matching the current filter to find which labels they have
    const {data: membersData, isLoading: isMembersLoading} = useBrowseMembers({
        searchParams: {
            ...(nql ? {filter: nql} : {}),
            ...(search ? {search} : {}),
            include: 'labels',
            limit: 'all',
            fields: 'id'
        },
        enabled: open
    });

    // Extract unique label slugs from the filtered members
    const memberLabelSlugs = useMemo(() => {
        const slugs = new Set<string>();
        for (const member of membersData?.members || []) {
            for (const label of member.labels || []) {
                slugs.add(label.slug);
            }
        }
        return slugs;
    }, [membersData]);

    const picker = useLabelPicker({
        selectedSlugs,
        onSelectionChange: setSelectedSlugs
    });

    const availableOptionSource = {
        ...picker.optionSource,
        options: picker.optionSource.options.filter(option => memberLabelSlugs.has(String(option.value)))
    };

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
                        Remove label from {formatNumber(memberCount)} {memberCount === 1 ? 'member' : 'members'}
                    </DialogTitle>
                </DialogHeader>

                <LabelPicker
                    isDuplicateName={picker.isDuplicateName}
                    labels={picker.labels.filter(label => memberLabelSlugs.has(label.slug))}
                    optionSource={{
                        ...availableOptionSource,
                        isInitialLoad: availableOptionSource.isInitialLoad || isMembersLoading
                    }}
                    resolvedSelectedLabels={picker.resolvedSelectedLabels.filter(label => memberLabelSlugs.has(label.slug))}
                    selectedSlugs={selectedSlugs}
                    onDelete={picker.deleteLabel}
                    onEdit={picker.editLabel}
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
                        {isLoading ? 'Removing...' : selectedSlugs.length > 1 ? `Remove ${formatNumber(selectedSlugs.length)} labels` : 'Remove label'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
