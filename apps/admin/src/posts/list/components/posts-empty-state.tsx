import {Button, EmptyIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {type PostResource, getPostResourceCopy} from '@/posts/list/post-resource';

interface PostsEmptyStateProps {
    resource: PostResource;
    /**
     * Whether any filter is active. Sorting deliberately doesn't count — Ember
     * excludes `order` from this check, so re-sorting an empty list still
     * offers "write your first post" rather than "clear your filters".
     */
    hasFilters: boolean;
    onClearFilters: () => void;
}

/**
 * The two empty states from `apps/ember-admin/app/templates/posts.hbs`: a cold
 * start with a call to action, and a filtered-to-nothing state offering a way
 * back.
 */
export function PostsEmptyState({resource, hasFilters, onClearFilters}: PostsEmptyStateProps) {
    const copy = getPostResourceCopy(resource);

    if (hasFilters) {
        return (
            <EmptyIndicator
                actions={
                    <Button onClick={onClearFilters}>
                        Show all {copy.plural}
                    </Button>
                }
                data-testid='posts-empty-filtered'
                title={`No ${copy.plural} match the current filter`}
            >
                <LucideIcon.SearchX />
            </EmptyIndicator>
        );
    }

    return (
        <EmptyIndicator
            actions={
                <Button asChild>
                    <a href={copy.newHref}>{copy.emptyAction}</a>
                </Button>
            }
            data-testid='posts-empty-cold'
            description={copy.emptyDescription}
            title={copy.emptyTitle}
        >
            <LucideIcon.PenLine />
        </EmptyIndicator>
    );
}
