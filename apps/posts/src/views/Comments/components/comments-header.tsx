import React, {useCallback, useEffect, useState} from 'react';
import {Button, Header, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ToggleGroup, ToggleGroupItem} from '@tryghost/shade';
import {Link} from '@tryghost/admin-x-framework';

interface CommentsHeaderProps {
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    sortOrder: string;
    onSortOrderChange: (value: string) => void;
    memberFilter: string;
    onMemberFilterChange: (value: string) => void;
    commentFilter: string;
    onCommentFilterChange: (value: string) => void;
}

const CommentsHeader: React.FC<CommentsHeaderProps> = ({
    statusFilter,
    onStatusFilterChange,
    sortOrder,
    onSortOrderChange,
    memberFilter,
    onMemberFilterChange,
    commentFilter,
    onCommentFilterChange
}) => {
    const [inputValue, setInputValue] = useState(memberFilter);
    const [error, setError] = useState<string | null>(null);
    const [commentInput, setCommentInput] = useState(commentFilter);
    const [commentError, setCommentError] = useState<string | null>(null);

    const isValidMemberId = useCallback((value: string) => /^[a-f0-9]{24}$/i.test(value), []);

    useEffect(() => {
        setInputValue(memberFilter);
        setError(null);
    }, [memberFilter]);

    useEffect(() => {
        setCommentInput(commentFilter);
        setCommentError(null);
    }, [commentFilter]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setError(null);
            onMemberFilterChange('');
            return;
        }
        if (!isValidMemberId(trimmed)) {
            setError('Enter a valid 24-character member ID');
            return;
        }
        setError(null);
        onMemberFilterChange(trimmed);
    };

    const handleClear = () => {
        setInputValue('');
        setError(null);
        onMemberFilterChange('');
    };

    const handleCommentSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = commentInput.trim();
        if (!trimmed) {
            setCommentError(null);
            onCommentFilterChange('');
            return;
        }
        if (!isValidMemberId(trimmed)) {
            setCommentError('Enter a valid 24-character comment ID');
            return;
        }
        setCommentError(null);
        onCommentFilterChange(trimmed);
    };

    const handleCommentClear = () => {
        setCommentInput('');
        setCommentError(null);
        onCommentFilterChange('');
    };

    return (
        <Header variant="inline-nav">
            <Header.Title>Comments</Header.Title>

            <Header.Actions>
                <Header.ActionGroup>
                    <ToggleGroup data-testid="comments-status-filter" size='button' type="single" value={statusFilter} onValueChange={(value) => value && onStatusFilterChange(value)}>
                        <ToggleGroupItem aria-label="All comments" value="all" asChild>
                            <Link to="/comments">
                                All
                            </Link>
                        </ToggleGroupItem>
                        <ToggleGroupItem aria-label="Published comments" value="published" asChild>
                            <Link to="/comments?status=published">
                                Published
                            </Link>
                        </ToggleGroupItem>
                        <ToggleGroupItem aria-label="Hidden comments" value="hidden" asChild>
                            <Link to="/comments?status=hidden">
                                Hidden
                            </Link>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </Header.ActionGroup>
                <Header.ActionGroup>
                    <Select value={sortOrder} onValueChange={onSortOrderChange}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Newest first</SelectItem>
                            <SelectItem value="asc">Oldest first</SelectItem>
                        </SelectContent>
                    </Select>
                </Header.ActionGroup>
                <Header.ActionGroup>
                    <form className="flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
                        <Input
                            className="w-64"
                            placeholder="Filter by member ID"
                            value={inputValue}
                            onChange={event => setInputValue(event.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <Button size="sm" type="submit" variant="secondary">
                                Apply
                            </Button>
                            {memberFilter && (
                                <Button size="sm" type="button" variant="ghost" onClick={handleClear}>
                                    Clear
                                </Button>
                            )}
                        </div>
                        {error && (
                            <span className="text-xs text-destructive">{error}</span>
                        )}
                    </form>
                </Header.ActionGroup>
                <Header.ActionGroup>
                    <form className="flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleCommentSubmit}>
                        <Input
                            className="w-64"
                            placeholder="Filter by comment ID"
                            value={commentInput}
                            onChange={event => setCommentInput(event.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <Button size="sm" type="submit" variant="secondary">
                                Apply
                            </Button>
                            {commentFilter && (
                                <Button size="sm" type="button" variant="ghost" onClick={handleCommentClear}>
                                    Clear
                                </Button>
                            )}
                        </div>
                        {commentError && (
                            <span className="text-xs text-destructive">{commentError}</span>
                        )}
                    </form>
                </Header.ActionGroup>
            </Header.Actions>
        </Header>
    );
};

export default CommentsHeader;
