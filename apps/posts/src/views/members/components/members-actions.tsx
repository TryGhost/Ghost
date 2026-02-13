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
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBulkDeleteMembers, useBulkEditMembers} from '@tryghost/admin-x-framework/api/members';

interface MembersActionsProps {
    isFiltered: boolean;
    memberCount: number;
    nql?: string;
    canBulkDelete: boolean;
}

async function exportMembers(filter?: string): Promise<void> {
    const params = new URLSearchParams();
    if (filter) {
        params.set('filter', filter);
    }
    params.set('limit', 'all');

    // Using raw fetch instead of useFetchApi because we need response.blob() for file download.
    // useFetchApi's handleResponse returns text/json which doesn't support blob download URLs.
    const response = await fetch(`/ghost/api/admin/members/upload/?${params}`, {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error('Failed to export members');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members.${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        try {
            await exportMembers(nql);
        } catch (error) {
            // TODO: Show toast notification on export failure once Toast is ported to React.
            // The Ember version shows a toast here. For now, we log to console.
            // eslint-disable-next-line no-console
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
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
            }
        });
    }, [bulkDelete, nql]);

    const handleExportBackup = useCallback(async () => {
        try {
            await exportMembers(nql);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Export backup failed:', error);
            throw error;
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
                    <DropdownMenuItem disabled={isExporting} onClick={handleExport}>
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
                isExporting={isExporting}
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
