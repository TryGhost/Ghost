import {LucideIcon} from '@tryghost/shade/utils';
import {VISIBILITY_OPTIONS, getTypeOptions} from '@/posts/list/post-filter-fields';
import {isAuthorOrContributor, isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {usePostAuthorValueSource} from '@/shared/filter-sources/use-post-author-value-source';
import {usePostTagValueSource} from '@/shared/filter-sources/use-post-tag-value-source';
import type {FilterFieldConfig, ValueSource} from '@tryghost/shade/patterns';
import type {PostResource} from '@/posts/list/post-resource';
import type {User} from '@tryghost/admin-x-framework/api/users';

/**
 * The Shade field config for the posts/pages filter bar.
 *
 * All four fields are single-select equality — Ember offers nothing else, and
 * the URL can only hold one value per param, so anything richer would produce
 * URLs the Ember screen renders as "Unknown".
 *
 * `order` is deliberately absent: it is a sort, not a filter, and lives in its
 * own control.
 */

export interface BuildPostFilterFieldsOptions {
    resource: PostResource;
    authorValueSource: ValueSource<string>;
    tagValueSource: ValueSource<string>;
    /** Contributors see only their own posts, so only the type filter. */
    isContributor?: boolean;
    /** Authors are scoped to themselves, so the author filter is meaningless. */
    isAuthorOrContributor?: boolean;
}

const IS_ONLY = [{value: 'is', label: 'is'}];

export function buildPostFilterFields({
    resource,
    authorValueSource,
    tagValueSource,
    isContributor = false,
    isAuthorOrContributor: authorScoped = false
}: BuildPostFilterFieldsOptions): FilterFieldConfig<string>[] {
    const noun = resource === 'pages' ? 'Page' : 'Post';

    const typeField: FilterFieldConfig<string> = {
        key: 'type',
        label: `${noun} type`,
        type: 'select',
        icon: <LucideIcon.FileText className='size-4' />,
        operators: IS_ONLY,
        options: getTypeOptions(resource)
    };

    if (isContributor) {
        return [typeField];
    }

    const fields: FilterFieldConfig<string>[] = [
        typeField,
        {
            key: 'visibility',
            label: 'Access',
            type: 'select',
            icon: <LucideIcon.Lock className='size-4' />,
            operators: IS_ONLY,
            options: VISIBILITY_OPTIONS
        }
    ];

    if (!authorScoped) {
        fields.push({
            key: 'author',
            label: 'Author',
            type: 'select',
            icon: <LucideIcon.User className='size-4' />,
            operators: IS_ONLY,
            searchable: true,
            placeholder: 'Search authors',
            valueSource: authorValueSource
        });
    }

    fields.push({
        key: 'tag',
        label: 'Tag',
        type: 'select',
        icon: <LucideIcon.Tag className='size-4' />,
        operators: IS_ONLY,
        searchable: true,
        placeholder: 'Search tags',
        valueSource: tagValueSource
    });

    return fields;
}

export function usePostFilterFields(
    resource: PostResource,
    currentUser?: User
): FilterFieldConfig<string>[] {
    const authorValueSource = usePostAuthorValueSource();
    const tagValueSource = usePostTagValueSource();

    return buildPostFilterFields({
        resource,
        authorValueSource,
        tagValueSource,
        isContributor: Boolean(currentUser && isContributorUser(currentUser)),
        isAuthorOrContributor: Boolean(currentUser && isAuthorOrContributor(currentUser))
    });
}
