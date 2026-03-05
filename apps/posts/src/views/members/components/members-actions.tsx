import React, {useCallback, useState} from 'react';
import {AddLabelModal, DeleteModal, ImportMembersModal, RemoveLabelModal, UnsubscribeModal} from './bulk-action-modals';
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    LucideIcon
} from '@tryghost/shade';
import {blobDownloadFromEndpoint} from '@tryghost/admin-x-framework/helpers';
import {toast} from 'sonner';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBulkDeleteMembers, useBulkEditMembers} from '@tryghost/admin-x-framework/api/members';

interface MembersActionsProps {
    isFiltered: boolean;
    memberCount: number;
    nql?: string;
    canBulkDelete: boolean;
    onImportComplete?: () => void;
}

async function exportMembers(filter?: string): Promise<void> {
    const params = new URLSearchParams({limit: 'all'});
    if (filter) {
        params.set('filter', filter);
    }
    const datetime = new Date().toJSON().substring(0, 10);
    await blobDownloadFromEndpoint(`/members/upload/?${params}`, `members.${datetime}.csv`);
}

const MembersActions: React.FC<MembersActionsProps> = ({
    isFiltered,
    memberCount,
    nql,
    canBulkDelete,
    onImportComplete
}) => {
    const {data: labelsData} = useBrowseLabels({});
    const labels = labelsData?.labels || [];

    const {mutateAsync: bulkEditAsync, isLoading: isBulkEditing} = useBulkEditMembers();
    const {mutate: bulkDelete, isLoading: isBulkDeleting} = useBulkDeleteMembers();

    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddLabelModal, setShowAddLabelModal] = useState(false);
    const [showRemoveLabelModal, setShowRemoveLabelModal] = useState(false);
    const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleExport = useCallback(async () => {
        try {
            await exportMembers(nql);
        } catch (e) {
            toast.error('Export failed', {
                description: 'There was a problem downloading your member data. Please check your connection and try again.'
            });
            throw e;
        }
    }, [nql]);

    const handleAddLabel = useCallback(async (labelIds: string[]) => {
        try {
            for (const labelId of labelIds) {
                await bulkEditAsync({
                    filter: nql || '',
                    all: !nql,
                    action: {
                        type: 'addLabel',
                        meta: {label: {id: labelId}}
                    }
                });
            }
            setShowAddLabelModal(false);
            toast.success(labelIds.length > 1 ? 'Labels added successfully' : 'Label added successfully');
        } catch {
            toast.error('Failed to add label', {
                description: 'There was a problem applying this label. Please try again.'
            });
        }
    }, [bulkEditAsync, nql]);

    const handleRemoveLabel = useCallback(async (labelIds: string[]) => {
        try {
            for (const labelId of labelIds) {
                await bulkEditAsync({
                    filter: nql || '',
                    all: !nql,
                    action: {
                        type: 'removeLabel',
                        meta: {label: {id: labelId}}
                    }
                });
            }
            setShowRemoveLabelModal(false);
            toast.success(labelIds.length > 1 ? 'Labels removed successfully' : 'Label removed successfully');
        } catch {
            toast.error('Failed to remove label', {
                description: 'There was a problem removing this label. Please try again.'
            });
        }
    }, [bulkEditAsync, nql]);

    const handleUnsubscribe = useCallback(() => {
        bulkEditAsync({
            filter: nql || '',
            all: !nql,
            action: {
                type: 'unsubscribe'
            }
        }).then(() => {
            setShowUnsubscribeModal(false);
            toast.success('Members unsubscribed successfully');
        }).catch(() => {
            toast.error('Failed to unsubscribe members', {
                description: 'There was a problem unsubscribing these members. Please try again.'
            });
        });
    }, [bulkEditAsync, nql]);

    const handleDelete = useCallback(() => {
        bulkDelete({
            filter: nql || '',
            all: !nql
        }, {
            onSuccess: () => {
                setShowDeleteModal(false);
                toast.success('Members deleted successfully');
            },
            onError: () => {
                toast.error('Failed to delete members', {
                    description: 'There was a problem deleting these members. Please try again.'
                });
            }
        });
    }, [bulkDelete, nql]);

    const handleExportBackup = useCallback(async () => {
        try {
            await exportMembers(nql);
        } catch (e) {
            toast.error('Export failed', {
                description: 'There was a problem downloading your backup. Please check your connection and try again.'
            });
            throw e;
        }
    }, [nql]);

    return (
        <>
            {/* Actions Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <LucideIcon.MoreHorizontal className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {/* Import */}
                    <DropdownMenuItem onClick={() => setShowImportModal(true)}>
                        <LucideIcon.Upload className="mr-2 size-4" />
                        Import members
                    </DropdownMenuItem>

                    {/* Export */}
                    <DropdownMenuItem onClick={handleExport}>
                        <LucideIcon.Download className="mr-2 size-4" />
                        {isFiltered
                            ? `Export ${memberCount.toLocaleString()} members`
                            : 'Export all members'}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowAddLabelModal(true)}>
                        <LucideIcon.Tags className="mr-2 size-4" />
                            Add label to {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRemoveLabelModal(true)}>
                        <LucideIcon.Tag className="mr-2 size-4" />
                            Remove label from {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowUnsubscribeModal(true)}>
                        <LucideIcon.MailX className="mr-2 size-4" />
                            Unsubscribe {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={!canBulkDelete}
                        onClick={() => setShowDeleteModal(true)}
                    >
                        <LucideIcon.Trash2 className="mr-2 size-4" />
                            Delete {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* New Member Button - styled like Tags */}
            <Button asChild>
                <a className="font-bold" href="#/members/new">
                    New member
                </a>
            </Button>

            {/* Modals */}
            <ImportMembersModal
                labels={labels}
                open={showImportModal}
                onComplete={onImportComplete}
                onOpenChange={setShowImportModal}
            />
            <AddLabelModal
                isLoading={isBulkEditing}
                memberCount={memberCount}
                open={showAddLabelModal}
                onConfirm={handleAddLabel}
                onOpenChange={setShowAddLabelModal}
            />
            <RemoveLabelModal
                isLoading={isBulkEditing}
                memberCount={memberCount}
                nql={nql}
                open={showRemoveLabelModal}
                onConfirm={handleRemoveLabel}
                onOpenChange={setShowRemoveLabelModal}
            />
            <UnsubscribeModal
                isLoading={isBulkEditing}
                memberCount={memberCount}
                open={showUnsubscribeModal}
                onConfirm={handleUnsubscribe}
                onOpenChange={setShowUnsubscribeModal}
            />
            <DeleteModal
                isLoading={isBulkDeleting}
                memberCount={memberCount}
                open={showDeleteModal}
                onConfirm={handleDelete}
                onExportBackup={handleExportBackup}
                onOpenChange={setShowDeleteModal}
            />
        </>
    );
};

export default MembersActions;
