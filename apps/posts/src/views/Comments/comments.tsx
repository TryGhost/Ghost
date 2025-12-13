import React, {useState, useCallback, useMemo, useEffect} from 'react';
import BulkActionsBar from './components/bulk-actions-bar';
import CommentsContent from './components/comments-content';
import CommentsHeader from './components/comments-header';
import CommentsLayout from './components/comments-layout';
import CommentsList from './components/comments-list';
import {useQueryClient} from '@tanstack/react-query';
import {Button, EmptyIndicator, LoadingIndicator, LucideIcon, toast} from '@tryghost/shade';
import {useBrowseComments, useHideComment, useShowComment, useDeleteComment, useBulkEditComments} from '@tryghost/admin-x-framework/api/comments';
import {useBanMemberFromComments, useUnbanMemberFromComments} from '@tryghost/admin-x-framework/api/members';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

const Comments: React.FC = () => {
    const navigate = useNavigate();
    const {search} = useLocation();
    const queryClient = useQueryClient();
    const qs = new URLSearchParams(search);

    const statusFilter = qs.get('status') ?? 'all';
    const sortOrder = qs.get('sort') ?? 'desc';
    const memberFilter = qs.get('member') ?? '';
    const commentFilter = qs.get('comment') ?? '';

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);

    // Build filter based on status
    const memberFilterExpression = useMemo(() => {
        if (!memberFilter) {
            return undefined;
        }
        const trimmed = memberFilter.trim();
        if (/^[a-f0-9]{24}$/i.test(trimmed)) {
            return `member_id:'${trimmed}'`;
        }
        return undefined;
    }, [memberFilter]);

    const commentFilterExpression = useMemo(() => {
        if (!commentFilter) {
            return undefined;
        }
        const trimmed = commentFilter.trim();
        if (/^[a-f0-9]{24}$/i.test(trimmed)) {
            return `id:'${trimmed}'`;
        }
        return undefined;
    }, [commentFilter]);

    const filter = useMemo(() => {
        const clauses = [] as string[];
        if (statusFilter !== 'all') {
            clauses.push(`status:${statusFilter}`);
        }
        if (memberFilterExpression) {
            clauses.push(memberFilterExpression);
        }
        if (commentFilterExpression) {
            clauses.push(commentFilterExpression);
        }
        if (!clauses.length) {
            return undefined;
        }
        return clauses.join('+');
    }, [statusFilter, memberFilterExpression, commentFilterExpression]);

    const {
        data,
        isError,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useBrowseComments({
        searchParams: {
            ...(filter && {filter}),
            order: `created_at ${sortOrder}`,
            include: 'member,post',
            limit: '30',
            include_nested: 'true'
        }
    });

    const comments = data?.comments ?? [];
    const totalComments = data?.meta?.pagination?.total ?? 0;

    const hideComment = useHideComment();
    const showComment = useShowComment();
    const deleteComment = useDeleteComment();
    const bulkEditComments = useBulkEditComments();
    const banMember = useBanMemberFromComments();
    const unbanMember = useUnbanMemberFromComments();

    const handleStatusFilterChange = useCallback((value: string) => {
        const params = new URLSearchParams();
        if (value !== 'all') {
            params.set('status', value);
        }
        if (sortOrder !== 'desc') {
            params.set('sort', sortOrder);
        }
        if (memberFilter) {
            params.set('member', memberFilter);
        }
        if (commentFilter) {
            params.set('comment', commentFilter);
        }
        navigate(`/comments${params.toString() ? `?${params.toString()}` : ''}`);
        setSelectedIds(new Set());
        setIsAllMatchingSelected(false);
    }, [navigate, sortOrder, memberFilter, commentFilter]);

    const handleSortOrderChange = useCallback((value: string) => {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
            params.set('status', statusFilter);
        }
        if (value !== 'desc') {
            params.set('sort', value);
        }
        if (memberFilter) {
            params.set('member', memberFilter);
        }
        if (commentFilter) {
            params.set('comment', commentFilter);
        }
        navigate(`/comments${params.toString() ? `?${params.toString()}` : ''}`);
        setSelectedIds(new Set());
        setIsAllMatchingSelected(false);
    }, [navigate, statusFilter, memberFilter, commentFilter]);

    const handleMemberFilterChange = useCallback((value: string) => {
        const trimmed = value.trim();
        const isValidId = trimmed === '' || /^[a-f0-9]{24}$/i.test(trimmed);
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
            params.set('status', statusFilter);
        }
        if (sortOrder !== 'desc') {
            params.set('sort', sortOrder);
        }
        if (trimmed && isValidId) {
            params.set('member', trimmed);
        }
        if (commentFilter) {
            params.set('comment', commentFilter);
        }
        navigate(`/comments${params.toString() ? `?${params.toString()}` : ''}`);
        setSelectedIds(new Set());
        setIsAllMatchingSelected(false);
    }, [navigate, statusFilter, sortOrder, commentFilter]);

    const handleCommentFilterChange = useCallback((value: string) => {
        const trimmed = value.trim();
        const isValidId = trimmed === '' || /^[a-f0-9]{24}$/i.test(trimmed);
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
            params.set('status', statusFilter);
        }
        if (sortOrder !== 'desc') {
            params.set('sort', sortOrder);
        }
        if (memberFilter) {
            params.set('member', memberFilter);
        }
        if (trimmed && isValidId) {
            params.set('comment', trimmed);
        }
        navigate(`/comments${params.toString() ? `?${params.toString()}` : ''}`);
        setSelectedIds(new Set());
        setIsAllMatchingSelected(false);
    }, [navigate, statusFilter, sortOrder, memberFilter]);

    const handleFilterByMember = useCallback((memberId: string) => {
        if (!memberId) {
            return;
        }
        handleMemberFilterChange(memberId);
    }, [handleMemberFilterChange]);

    const handleFilterByComment = useCallback((commentId: string) => {
        if (!commentId) {
            return;
        }
        handleCommentFilterChange(commentId);
    }, [handleCommentFilterChange]);

    const handleMemberNavigate = useCallback((memberId: string) => {
        if (!memberId) {
            return;
        }
        navigate(`/members/${memberId}`, {crossApp: true});
    }, [navigate]);

    const handleHideComment = useCallback(async (id: string) => {
        try {
            await hideComment.mutateAsync(id);
            toast.success('Comment hidden');
        } catch {
            toast.error('Failed to hide comment');
        }
    }, [hideComment]);

    const handleShowComment = useCallback(async (id: string) => {
        try {
            await showComment.mutateAsync(id);
            toast.success('Comment shown');
        } catch {
            toast.error('Failed to show comment');
        }
    }, [showComment]);

    const handleDeleteComment = useCallback(async (id: string) => {
        try {
            await deleteComment.mutateAsync(id);
            toast.success('Comment deleted');
        } catch {
            toast.error('Failed to delete comment');
        }
    }, [deleteComment]);

    const handleBanMember = useCallback(async (memberId: string) => {
        try {
            await banMember.mutateAsync(memberId);
            await queryClient.invalidateQueries(['CommentsResponseType']);
            toast.success('Member banned from commenting');
        } catch (error) {
            console.error('Ban member error:', error);
            toast.error('Failed to ban member');
        }
    }, [banMember, queryClient]);

    const handleUnbanMember = useCallback(async (memberId: string) => {
        try {
            await unbanMember.mutateAsync({memberId, restoreComments: true});
            await queryClient.invalidateQueries(['CommentsResponseType']);
            toast.success('Member unbanned from commenting');
        } catch (error) {
            console.error('Unban member error:', error);
            toast.error('Failed to unban member');
        }
    }, [unbanMember, queryClient]);

    const handleSelectAllMatching = useCallback(() => {
        if (data?.comments) {
            setSelectedIds(new Set(data.comments.map(c => c.id)));
        }
        setIsAllMatchingSelected(true);
    }, [data?.comments]);

    const handleSelectionChange = useCallback((ids: Set<string>) => {
        setIsAllMatchingSelected(false);
        setSelectedIds(new Set(ids));
    }, []);

    useEffect(() => {
        if (!isAllMatchingSelected || !data?.comments) {
            return;
        }

        setSelectedIds((prev) => {
            const currentIds = new Set(data.comments.map(c => c.id));
            if (prev.size === currentIds.size) {
                let isSame = true;
                currentIds.forEach((id) => {
                    if (!prev.has(id)) {
                        isSame = false;
                    }
                });
                if (isSame) {
                    return prev;
                }
            }
            return currentIds;
        });
    }, [isAllMatchingSelected, data?.comments]);

    const handleClearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setIsAllMatchingSelected(false);
    }, []);

    const getSelectionFilter = useCallback(() => {
        if (isAllMatchingSelected) {
            return filter ?? 'status:[published,hidden,deleted]';
        }

        if (selectedIds.size === 0) {
            return null;
        }

        return `id:[${Array.from(selectedIds).map(id => `'${id}'`).join(',')}]`;
    }, [isAllMatchingSelected, filter, selectedIds]);

    const handleBulkHide = useCallback(async () => {
        const selectionCount = isAllMatchingSelected ? totalComments : selectedIds.size;
        if (selectionCount === 0) {
            return;
        }
        try {
            const filterStr = getSelectionFilter();
            if (filterStr === null) {
                return;
            }
            await bulkEditComments.mutateAsync({filter: filterStr, action: 'hide'});
            await queryClient.invalidateQueries(['CommentsResponseType']);
            toast.success(`${selectionCount} ${selectionCount === 1 ? 'comment' : 'comments'} hidden`);
            setSelectedIds(new Set());
            setIsAllMatchingSelected(false);
        } catch {
            toast.error('Failed to hide comments');
        }
    }, [selectedIds, bulkEditComments, getSelectionFilter, isAllMatchingSelected, totalComments]);

    const handleBulkShow = useCallback(async () => {
        const selectionCount = isAllMatchingSelected ? totalComments : selectedIds.size;
        if (selectionCount === 0) {
            return;
        }
        try {
            const filterStr = getSelectionFilter();
            if (filterStr === null) {
                return;
            }
            await bulkEditComments.mutateAsync({filter: filterStr, action: 'show'});
            await queryClient.invalidateQueries(['CommentsResponseType']);
            toast.success(`${selectionCount} ${selectionCount === 1 ? 'comment' : 'comments'} shown`);
            setSelectedIds(new Set());
            setIsAllMatchingSelected(false);
        } catch {
            toast.error('Failed to show comments');
        }
    }, [selectedIds, bulkEditComments, getSelectionFilter, isAllMatchingSelected, totalComments]);

    const handleBulkDelete = useCallback(async () => {
        const selectionCount = isAllMatchingSelected ? totalComments : selectedIds.size;
        if (selectionCount === 0) {
            return;
        }
        try {
            const filterStr = getSelectionFilter();
            if (filterStr === null) {
                return;
            }
            await bulkEditComments.mutateAsync({filter: filterStr, action: 'delete'});
            await queryClient.invalidateQueries(['CommentsResponseType']);
            toast.success(`${selectionCount} ${selectionCount === 1 ? 'comment' : 'comments'} deleted`);
            setSelectedIds(new Set());
            setIsAllMatchingSelected(false);
        } catch {
            toast.error('Failed to delete comments');
        }
    }, [selectedIds, bulkEditComments, getSelectionFilter, isAllMatchingSelected, totalComments]);

    const selectedCount = isAllMatchingSelected ? totalComments : selectedIds.size;

    return (
        <CommentsLayout>
                        <CommentsHeader
                            sortOrder={sortOrder}
                            statusFilter={statusFilter}
                            onSortOrderChange={handleSortOrderChange}
                            onStatusFilterChange={handleStatusFilterChange}
                            memberFilter={memberFilter}
                            onMemberFilterChange={handleMemberFilterChange}
                            commentFilter={commentFilter}
                            onCommentFilterChange={handleCommentFilterChange}
                        />
            <CommentsContent>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
                        <h2 className="mb-2 text-xl font-medium">
                            Error loading comments
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Please reload the page to try again
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyIndicator
                            title={statusFilter === 'all' ? 'No comments yet' : `No ${statusFilter} comments`}
                        >
                            <LucideIcon.MessageSquare />
                        </EmptyIndicator>
                    </div>
                ) : (
                    <>
                        <CommentsList
                            fetchNextPage={fetchNextPage}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            items={comments}
                            selectedIds={selectedIds}
                            isSelectingAllMatching={isAllMatchingSelected}
                            onSelectAllMatching={handleSelectAllMatching}
                            onClearSelection={handleClearSelection}
                            totalItems={totalComments}
                            onBanMember={handleBanMember}
                            onDeleteComment={handleDeleteComment}
                            onHideComment={handleHideComment}
                            onSelectionChange={handleSelectionChange}
                            onFilterByMember={handleFilterByMember}
                            onFilterByComment={handleFilterByComment}
                            onMemberNavigate={handleMemberNavigate}
                            onShowComment={handleShowComment}
                            onUnbanMember={handleUnbanMember}
                        />
                        <BulkActionsBar
                            isSelectingAllMatching={isAllMatchingSelected}
                            selectedCount={selectedCount}
                            totalCount={totalComments}
                            onBulkDelete={handleBulkDelete}
                            onBulkHide={handleBulkHide}
                            onBulkShow={handleBulkShow}
                            onClearSelection={handleClearSelection}
                        />
                    </>
                )}
            </CommentsContent>
        </CommentsLayout>
    );
};

export default Comments;
