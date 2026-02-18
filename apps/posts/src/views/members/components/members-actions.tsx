import React, {useCallback, useState} from 'react';
import {AddLabelModal, DeleteModal, RemoveLabelModal, UnsubscribeModal} from './bulk-action-modals';
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
    canBulkDelete
}) => {
    const {data: labelsData} = useBrowseLabels({});
    const labels = labelsData?.labels || [];

    const {mutate: bulkEdit, isLoading: isBulkEditing} = useBulkEditMembers();
    const {mutate: bulkDelete, isLoading: isBulkDeleting} = useBulkDeleteMembers();

    const [showAddLabelModal, setShowAddLabelModal] = useState(false);
    const [showRemoveLabelModal, setShowRemoveLabelModal] = useState(false);
    const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleExport = useCallback(async () => {
        try {
            await exportMembers(nql);
        } catch (e) {
            toast.error('Export failed', {
                description: 'There was a problem downloading your member data. Please check your connection and try again.',
                duration: 8000
            });
            throw e;
        }
    }, [nql]);

    const handleAddLabel = useCallback((labelId: string) => {
        bulkEdit({
            filter: nql || '',
            all: !nql,
            action: {
                type: 'addLabel',
                meta: {label: {id: labelId}}
            }
        }, {
            onSuccess: () => {
                setShowAddLabelModal(false);
                toast.success('Label added successfully');
            },
            onError: () => {
                toast.error('Failed to add label', {
                    description: 'There was a problem applying this label. Please try again.',
                    duration: 8000
                });
            }
        });
    }, [bulkEdit, nql]);

    const handleRemoveLabel = useCallback((labelId: string) => {
        bulkEdit({
            filter: nql || '',
            all: !nql,
            action: {
                type: 'removeLabel',
                meta: {label: {id: labelId}}
            }
        }, {
            onSuccess: () => {
                setShowRemoveLabelModal(false);
                toast.success('Label removed successfully');
            },
            onError: () => {
                toast.error('Failed to remove label', {
                    description: 'There was a problem removing this label. Please try again.',
                    duration: 8000
                });
            }
        });
    }, [bulkEdit, nql]);

    const handleUnsubscribe = useCallback(() => {
        bulkEdit({
            filter: nql || '',
            all: !nql,
            action: {
                type: 'unsubscribe'
            }
        }, {
            onSuccess: () => {
                setShowUnsubscribeModal(false);
                toast.success('Members unsubscribed successfully');
            },
            onError: () => {
                toast.error('Failed to unsubscribe members', {
                    description: 'There was a problem unsubscribing these members. Please try again.',
                    duration: 8000
                });
            }
        });
    }, [bulkEdit, nql]);

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
                    description: 'There was a problem deleting these members. Please try again.',
                    duration: 8000
                });
            }
        });
    }, [bulkDelete, nql]);

    const handleExportBackup = useCallback(async () => {
        try {
            await exportMembers(nql);
        } catch (e) {
            toast.error('Export failed', {
                description: 'There was a problem downloading your backup. Please check your connection and try again.',
                duration: 8000
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
                    {/* Export */}
                    <DropdownMenuItem onClick={handleExport}>
                        <LucideIcon.Download className="mr-2 size-4" />
                        {isFiltered
                            ? `Export ${memberCount.toLocaleString()} members`
                            : 'Export all members'}
                    </DropdownMenuItem>

                    {/* Bulk actions only when NQL filter is present (not just search) */}
                    {nql && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowAddLabelModal(true)}>
                                <LucideIcon.Tags className="mr-2 size-4" />
                                    Add label to {memberCount.toLocaleString()} members
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowRemoveLabelModal(true)}>
                                <LucideIcon.Tag className="mr-2 size-4" />
                                    Remove label from {memberCount.toLocaleString()} members
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowUnsubscribeModal(true)}>
                                <LucideIcon.MailX className="mr-2 size-4" />
                                    Unsubscribe {memberCount.toLocaleString()} members
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={!canBulkDelete}
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <LucideIcon.Trash2 className="mr-2 size-4" />
                                    Delete {memberCount.toLocaleString()} members
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* New Member Button - styled like Tags */}
            <Button asChild>
                <a className="font-bold" href="#/members/new">
                    New member
                </a>
            </Button>

            {/* Modals */}
            <AddLabelModal
                isLoading={isBulkEditing}
                labels={labels}
                memberCount={memberCount}
                open={showAddLabelModal}
                onConfirm={handleAddLabel}
                onOpenChange={setShowAddLabelModal}
            />
            <RemoveLabelModal
                isLoading={isBulkEditing}
                labels={labels}
                memberCount={memberCount}
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
