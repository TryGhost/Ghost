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
import {buildMemberOperationParams} from '../member-query-params';
import {toast} from 'sonner';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBulkDeleteMembers, useBulkEditMembers} from '@tryghost/admin-x-framework/api/members';

interface MembersActionsProps {
    hasFilterOrSearch: boolean;
    memberCount: number;
    nql?: string;
    search: string;
    canBulkDelete: boolean;
    onImportComplete?: () => void;
}

async function exportMembers(filter?: string, search?: string): Promise<void> {
    const params = new URLSearchParams({limit: 'all'});
    if (filter) {
        params.set('filter', filter);
    }
    if (search) {
        params.set('search', search);
    }
    const datetime = new Date().toJSON().substring(0, 10);
    await blobDownloadFromEndpoint(`/members/upload/?${params}`, `members.${datetime}.csv`);
}

const MembersActions: React.FC<MembersActionsProps> = ({
    hasFilterOrSearch,
    memberCount,
    nql,
    search,
    canBulkDelete,
    onImportComplete
}) => {
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddLabelModal, setShowAddLabelModal] = useState(false);
    const [showRemoveLabelModal, setShowRemoveLabelModal] = useState(false);
    const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const {data: newslettersData, isLoading: isLoadingNewsletters} = useBrowseNewsletters({
        searchParams: {filter: 'status:-archived', limit: '50'}
    });
    const activeNewsletters = newslettersData?.newsletters || [];

    const {mutateAsync: bulkEditAsync, isLoading: isBulkEditing} = useBulkEditMembers();
    const {mutate: bulkDelete, isLoading: isBulkDeleting} = useBulkDeleteMembers();
    const [isUnsubscribing, setIsUnsubscribing] = useState(false);
    const memberOperationParams = buildMemberOperationParams({nql, search});
    const handleExport = useCallback(async () => {
        try {
            await exportMembers(nql, search);
        } catch (e) {
            toast.error('Export failed', {
                description: 'There was a problem downloading your member data. Please check your connection and try again.'
            });
            throw e;
        }
    }, [nql, search]);

    const handleAddLabel = useCallback(async (labelIds: string[]) => {
        try {
            for (const labelId of labelIds) {
                await bulkEditAsync({
                    ...memberOperationParams,
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
    }, [bulkEditAsync, memberOperationParams]);

    const handleRemoveLabel = useCallback(async (labelIds: string[]) => {
        try {
            for (const labelId of labelIds) {
                await bulkEditAsync({
                    ...memberOperationParams,
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
    }, [bulkEditAsync, memberOperationParams]);

    const handleUnsubscribe = useCallback(async (newsletterIds: string[] | null) => {
        const baseParams = memberOperationParams;

        if (newsletterIds === null) {
            try {
                await bulkEditAsync({
                    ...baseParams,
                    action: {type: 'unsubscribe'}
                });
                setShowUnsubscribeModal(false);
                toast.success('Members unsubscribed successfully');
            } catch {
                toast.error('Failed to unsubscribe members', {
                    description: 'There was a problem unsubscribing these members. Please try again.'
                });
            }
            return;
        }

        setIsUnsubscribing(true);
        try {
            const results = await Promise.allSettled(
                newsletterIds.map(id => bulkEditAsync({
                    ...baseParams,
                    action: {type: 'unsubscribe', newsletter: id}
                }))
            );
            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const total = results.length;

            setShowUnsubscribeModal(false);
            if (succeeded === total) {
                toast.success(`Unsubscribed from ${total} ${total === 1 ? 'newsletter' : 'newsletters'}`);
            } else if (succeeded > 0) {
                toast.warning(`Unsubscribed from ${succeeded} of ${total} newsletters`, {
                    description: 'Some newsletters could not be unsubscribed. Please try again.'
                });
            } else {
                toast.error('Failed to unsubscribe members', {
                    description: 'There was a problem unsubscribing these members. Please try again.'
                });
            }
        } catch {
            toast.error('Failed to unsubscribe members', {
                description: 'There was a problem unsubscribing these members. Please try again.'
            });
        } finally {
            setIsUnsubscribing(false);
        }
    }, [bulkEditAsync, memberOperationParams]);

    const handleDelete = useCallback(() => {
        bulkDelete(memberOperationParams, {
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
    }, [bulkDelete, memberOperationParams]);

    const handleExportBackup = useCallback(async () => {
        try {
            await exportMembers(nql, search);
        } catch (e) {
            toast.error('Export failed', {
                description: 'There was a problem downloading your backup. Please check your connection and try again.'
            });
            throw e;
        }
    }, [nql, search]);

    return (
        <>
            {/* Actions Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button data-testid="members-actions" variant="outline">
                        <LucideIcon.MoreHorizontal className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {/* Import */}
                    <DropdownMenuItem onClick={() => setShowImportModal(true)}>
                        <LucideIcon.Upload className="mr-2 size-4" />
                        Import members
                    </DropdownMenuItem>

                    {memberCount > 0 && (
                        <>
                            {/* Export */}
                            <DropdownMenuItem onClick={handleExport}>
                                <LucideIcon.Download className="mr-2 size-4" />
                                {hasFilterOrSearch
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
                            <DropdownMenuItem
                                disabled={isLoadingNewsletters}
                                onClick={() => setShowUnsubscribeModal(true)}
                            >
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
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* New Member Button - styled like Tags */}
            <Button asChild>
                <a aria-label="New member" className="inline-flex items-center gap-2 font-bold" href="#/members/new">
                    <LucideIcon.Plus className="size-4" />
                    <span className="hidden sm:inline">New member</span>
                </a>
            </Button>

            {/* Modals */}
            <ImportMembersModal
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
                search={search}
                onConfirm={handleRemoveLabel}
                onOpenChange={setShowRemoveLabelModal}
            />
            <UnsubscribeModal
                isLoading={isBulkEditing || isUnsubscribing}
                memberCount={memberCount}
                newsletters={activeNewsletters}
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
