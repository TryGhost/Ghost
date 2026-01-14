import React from 'react';
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Header,
    LucideIcon
} from '@tryghost/shade';
import {
    exportMembers,
    useBulkDeleteMembers,
    useBulkUnsubscribe,
    useImportMembers
} from '@tryghost/admin-x-framework/api/members';
import {toast} from 'react-hot-toast';
import {useRef} from 'react';

interface MembersHeaderProps {
    children?: React.ReactNode;
    search: string;
    nql: string | null | undefined;
    selectedIds?: Set<string>;
    selectionMode?: 'include' | 'exclude';
    totalMembers?: number;
    resetSelection?: () => void;
}

const MembersHeader: React.FC<MembersHeaderProps> = ({
    children,
    search,
    nql,
    selectedIds = new Set(),
    selectionMode = 'include',
    totalMembers = 0,
    resetSelection
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {mutateAsync: importMembers} = useImportMembers();
    const {mutateAsync: bulkDelete} = useBulkDeleteMembers();
    const {mutateAsync: bulkUnsubscribe} = useBulkUnsubscribe();

    const selectedCount =
        selectionMode === 'exclude'
            ? totalMembers - selectedIds.size
            : selectedIds.size;

    const handleImport = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            await importMembers(file);
            toast.success('Members have been imported.');
        } catch {
            toast.error('There was an error importing members.');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleExport = () => {
        const query = new URLSearchParams();
        query.set('limit', 'all');
        if (search) {
            query.set('search', search);
        }
        if (nql) {
            query.set('filter', nql);
        }

        exportMembers(query);
    };

    const getBulkActionPayload = () => {
        const filterParts = [];
        if (nql) {
            filterParts.push(nql);
        }

        if (selectionMode === 'exclude' && selectedIds.size > 0) {
            const excludedIds = Array.from(selectedIds).join(',');
            filterParts.push(`id:-[${excludedIds}]`);
        }

        const filter =
            filterParts.length > 0 ? filterParts.join('+') : undefined;

        return {
            all: selectionMode === 'exclude',
            ids:
                selectionMode === 'include'
                    ? Array.from(selectedIds)
                    : undefined,
            search: search || undefined,
            filter
        };
    };

    const handleBulkDelete = async () => {
        if (
            !window.confirm(
                `Are you sure you want to delete ${selectedCount} member${
                    selectedCount !== 1 ? 's' : ''
                }?`
            )
        ) {
            return;
        }
        try {
            await bulkDelete(getBulkActionPayload());
            toast.success('Members deleted');
            resetSelection?.();
        } catch {
            toast.error('Failed to delete members');
        }
    };

    const handleBulkUnsubscribe = async () => {
        if (
            !window.confirm(
                `Are you sure you want to unsubscribe ${selectedCount} member${
                    selectedCount !== 1 ? 's' : ''
                }?`
            )
        ) {
            return;
        }
        try {
            await bulkUnsubscribe(getBulkActionPayload());
            toast.success('Members unsubscribed');
            resetSelection?.();
        } catch {
            toast.error('Failed to unsubscribe members');
        }
    };

    if (selectedCount > 0) {
        return (
            <Header variant="inline-nav">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="font-bold">
                            {selectedCount} selected
                        </span>
                        <Button
                            className="h-auto p-0 text-muted-foreground"
                            size="sm"
                            variant="link"
                            onClick={resetSelection}
                        >
                            Deselect all
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    Actions
                                    <LucideIcon.ChevronDown className="ml-2 size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={handleBulkUnsubscribe}
                                >
                                    Unsubscribe
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={handleBulkDelete}
                                >
                                    Delete selected
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </Header>
        );
    }

    return (
        <Header variant="inline-nav">
            <input
                ref={fileInputRef}
                accept="text/csv"
                className="hidden"
                type="file"
                onChange={onFileChange}
            />
            <Header.Title>Members</Header.Title>

            <Header.Actions>
                <div className="flex items-center gap-2">{children}</div>
                <Header.ActionGroup>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className="size-8"
                                size="icon"
                                variant="ghost"
                            >
                                <LucideIcon.Ellipsis className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleImport}>
                                Import members
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExport}>
                                Export CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </Header.ActionGroup>
                <Header.ActionGroup>
                    <Button asChild>
                        <a className="font-bold" href="#/members/new">
                            <LucideIcon.Plus className="mr-2 size-4" />
                            New member
                        </a>
                    </Button>
                </Header.ActionGroup>
            </Header.Actions>
        </Header>
    );
};

export default MembersHeader;
