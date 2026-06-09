import moment from 'moment-timezone';
import {Badge} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import type {Post} from '@tryghost/admin-x-framework/api/posts';
import type {PostsResource} from '../posts-query-params';

export function getStatusLabel(status?: string): string {
    switch (status) {
    case 'scheduled':
        return 'Scheduled';
    case 'draft':
        return 'Draft';
    case 'sent':
        return 'Sent';
    default:
        return 'Published';
    }
}

export function getEditorHref(resource: PostsResource, id?: string): string {
    const type = resource === 'pages' ? 'page' : 'post';
    return id ? `#/editor/${type}/${id}` : `#/editor/${type}`;
}

interface PostsListItemProps {
    post: Post;
    resource: PostsResource;
    selected: boolean;
    selectionEnabled: boolean;
    onToggleSelect: (id: string) => void;
    onShiftSelect: (id: string) => void;
    onOpen: (post: Post) => void;
    onContextMenu: (post: Post, event: React.MouseEvent) => void;
}

function PostsListItem({
    post,
    resource,
    selected,
    selectionEnabled,
    onToggleSelect,
    onShiftSelect,
    onOpen,
    onContextMenu
}: PostsListItemProps) {
    const editorHref = getEditorHref(resource, post.id);
    const authorNames = post.authors?.map(author => author.name).filter(Boolean).join(', ');
    const isDraftLike = post.status === 'draft' || post.status === 'scheduled';
    const dateValue = isDraftLike ? (post.updated_at ?? post.published_at) : (post.published_at ?? post.updated_at);
    const formattedDate = dateValue ? moment(dateValue).format('D MMM YYYY') : '';

    const handleClick = (event: React.MouseEvent) => {
        if (selectionEnabled && event.shiftKey) {
            event.preventDefault();
            onShiftSelect(post.id);
            return;
        }
        if (selectionEnabled && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onToggleSelect(post.id);
            return;
        }
        event.preventDefault();
        onOpen(post);
    };

    return (
        <div
            className={cn(
                'group cursor-pointer border-b px-2 py-4 transition-colors hover:bg-muted/50',
                selected && 'bg-accent hover:bg-accent'
            )}
            data-selected={selected || undefined}
            role="menuitem"
            onClick={handleClick}
            onContextMenu={event => onContextMenu(post, event)}
        >
            <div className="flex items-center justify-between gap-4" data-testid="posts-list-item">
                <div className="min-w-0">
                    {/* The row click handler always calls preventDefault, so this link never double-navigates */}
                    <a className="block min-w-0" href={editorHref}>
                        <h3 className="truncate text-md font-semibold">
                            {post.featured && (
                                <LucideIcon.Star
                                    aria-label="star-fill"
                                    className="mr-1.5 mb-0.5 inline-block size-3.5 fill-amber-400 text-amber-400"
                                    role="img"
                                />
                            )}
                            {post.title}
                        </h3>
                    </a>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                        {authorNames && <span>By {authorNames}</span>}
                        {post.primary_tag && <span> in {post.primary_tag.name}</span>}
                        {formattedDate && <span>{authorNames ? ' – ' : ''}{formattedDate}</span>}
                    </p>
                </div>
                <Badge className="shrink-0" data-testid="post-status" variant="outline">
                    {getStatusLabel(post.status)}
                </Badge>
            </div>
        </div>
    );
}

export default PostsListItem;
