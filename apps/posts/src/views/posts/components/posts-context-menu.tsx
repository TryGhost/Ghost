import {useEffect, useRef} from 'react';
import type {Post} from '@tryghost/admin-x-framework/api/posts';

export type PostsContextMenuAction =
    | 'copy-link'
    | 'copy-preview'
    | 'unpublish'
    | 'unschedule'
    | 'feature'
    | 'unfeature'
    | 'add-tag'
    | 'change-access'
    | 'duplicate'
    | 'delete';

interface PostsContextMenuProps {
    position: {x: number; y: number};
    /** Selected posts that are loaded in memory (Ember's `availableModels`) */
    selectedPosts: Post[];
    isSingle: boolean;
    canDelete: boolean;
    membersEnabled: boolean;
    onAction: (action: PostsContextMenuAction) => void;
    onClose: () => void;
}

function MenuButton({label, destructive = false, onClick}: {
    label: string;
    destructive?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={`flex w-full cursor-pointer items-center rounded-xs px-2 py-1.5 text-left text-control transition-colors hover:bg-accent ${destructive ? 'text-destructive' : ''}`}
            type="button"
            onClick={onClick}
        >
            {label}
        </button>
    );
}

function PostsContextMenu({
    position,
    selectedPosts,
    isSingle,
    canDelete,
    membersEnabled,
    onAction,
    onClose
}: PostsContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const canUnpublish = selectedPosts.some(post => post.status === 'published' || post.status === 'sent');
    const canUnschedule = selectedPosts.some(post => post.status === 'scheduled');
    const canFeature = selectedPosts.some(post => post.status !== 'sent');
    const shouldFeature = selectedPosts.some(post => !post.featured);

    const left = typeof window === 'undefined' ? position.x : Math.min(position.x, window.innerWidth - 200);
    const top = typeof window === 'undefined' ? position.y : Math.min(position.y, window.innerHeight - 320);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[176px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            data-testid="posts-context-menu"
            role="menu"
            style={{left, top}}
        >
            {canUnpublish ? (
                <>
                    {isSingle && <MenuButton label="Copy link to post" onClick={() => onAction('copy-link')} />}
                    <MenuButton label="Unpublish" onClick={() => onAction('unpublish')} />
                </>
            ) : (
                <>
                    {isSingle && <MenuButton label="Copy preview link" onClick={() => onAction('copy-preview')} />}
                    {canUnschedule && <MenuButton label="Unschedule" onClick={() => onAction('unschedule')} />}
                </>
            )}
            {canFeature && (
                shouldFeature
                    ? <MenuButton label="Feature" onClick={() => onAction('feature')} />
                    : <MenuButton label="Unfeature" onClick={() => onAction('unfeature')} />
            )}
            <MenuButton label="Add a tag" onClick={() => onAction('add-tag')} />
            {membersEnabled && <MenuButton label="Change access" onClick={() => onAction('change-access')} />}
            {isSingle && <MenuButton label="Duplicate" onClick={() => onAction('duplicate')} />}
            {canDelete && <MenuButton label="Delete" destructive onClick={() => onAction('delete')} />}
        </div>
    );
}

export default PostsContextMenu;
