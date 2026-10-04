import { LucideIcon } from '@tryghost/shade/utils';
import {
  FEATURED_OPTIONS,
  type PostFilterOption,
  VISIBILITY_OPTIONS,
  getTypeOptions,
} from '@/posts/list/post-filter-fields';
import { LEGACY_FEATURED_TYPE, splitTypeParam } from '@/posts/list/post-query-params';
import { TYPE_OPERATOR } from '@/posts/list/post-filter-query';
import { isAuthorOrContributor, isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { usePostAuthorValueSource } from '@/shared/filter-sources/use-post-author-value-source';
import { usePostTagValueSource } from '@/shared/filter-sources/use-post-tag-value-source';
import type { FilterFieldConfig, ValueSource } from '@tryghost/shade/patterns';
import type { PostResource } from '@/posts/list/post-resource';
import type { User } from '@tryghost/admin-x-framework/api/users';

/**
 * The Shade field config for the posts/pages filter bar.
 *
 * Type matches any of several values; the other fields are single-select
 * equality.
 *
 * `order` is deliberately absent: it is a sort, not a filter, and lives in its
 * own control.
 */

export interface BuildPostFilterFieldsOptions {
  resource: PostResource;
  authorValueSource: ValueSource<string>;
  tagValueSource: ValueSource<string>;
  /** Contributors see only their own posts, so only the type and featured filters. */
  isContributor?: boolean;
  /** Authors are scoped to themselves, so the author filter is meaningless. */
  isAuthorOrContributor?: boolean;
  /**
   * The params currently in the URL. A value that isn't a known option gets
   * an "Unknown" entry so the chip still shows something — otherwise Shade
   * falls back to "Select…" and the filter vanishes from the UI while
   * staying in the URL. Ember shows a red "Unknown type" for the same case.
   */
  params?: Partial<Record<'type' | 'featured' | 'visibility', string | null>>;
}

const IS_ONLY = [{ value: 'is', label: 'is' }];
const IS_ANY_OF = [{ value: TYPE_OPERATOR, label: 'is any of' }];

function withUnknownOptions(
  options: PostFilterOption[],
  values: string[],
  noun: string,
): PostFilterOption[] {
  const unknown = values.filter((value) => !options.some((option) => option.value === value));

  return [...options, ...unknown.map((value) => ({ value, label: `Unknown ${noun}` }))];
}

function singleValue(value: string | null | undefined): string[] {
  return value ? [value] : [];
}

export function buildPostFilterFields({
  resource,
  authorValueSource,
  tagValueSource,
  isContributor = false,
  isAuthorOrContributor: authorScoped = false,
  params = {},
}: BuildPostFilterFieldsOptions): FilterFieldConfig<string>[] {
  const noun = resource === 'pages' ? 'Page' : 'Post';

  const typeValues = splitTypeParam(params.type).filter((value) => value !== LEGACY_FEATURED_TYPE);

  const typeField: FilterFieldConfig<string> = {
    key: 'type',
    label: `${noun} type`,
    type: 'multiselect',
    icon: <LucideIcon.FileText className="size-4" />,
    operators: IS_ANY_OF,
    defaultOperator: TYPE_OPERATOR,
    options: withUnknownOptions(getTypeOptions(resource), typeValues, 'type'),
  };

  const featuredField: FilterFieldConfig<string> = {
    key: 'featured',
    label: 'Featured',
    type: 'select',
    icon: <LucideIcon.Star className="size-4" />,
    operators: IS_ONLY,
    options: withUnknownOptions(FEATURED_OPTIONS, singleValue(params.featured), 'value'),
  };

  if (isContributor) {
    return [typeField, featuredField];
  }

  const fields: FilterFieldConfig<string>[] = [
    typeField,
    featuredField,
    {
      key: 'visibility',
      label: 'Access',
      type: 'select',
      icon: <LucideIcon.Lock className="size-4" />,
      operators: IS_ONLY,
      options: withUnknownOptions(VISIBILITY_OPTIONS, singleValue(params.visibility), 'access'),
    },
  ];

  if (!authorScoped) {
    fields.push({
      key: 'author',
      label: 'Author',
      type: 'select',
      icon: <LucideIcon.User className="size-4" />,
      operators: IS_ONLY,
      searchable: true,
      placeholder: 'Search authors',
      valueSource: authorValueSource,
    });
  }

  fields.push({
    key: 'tag',
    label: 'Tag',
    type: 'select',
    icon: <LucideIcon.Tag className="size-4" />,
    operators: IS_ONLY,
    searchable: true,
    placeholder: 'Search tags',
    valueSource: tagValueSource,
    // Wider than the 200px default: each row carries the tag's name and its
    // slug side by side, and the slug is what tells two same-named tags
    // apart — it should not be the first thing to truncate.
    className: 'w-[320px]',
  });

  return fields;
}

export function usePostFilterFields(
  resource: PostResource,
  currentUser?: User,
  params?: BuildPostFilterFieldsOptions['params'],
): FilterFieldConfig<string>[] {
  const authorValueSource = usePostAuthorValueSource();
  const tagValueSource = usePostTagValueSource();

  return buildPostFilterFields({
    resource,
    authorValueSource,
    tagValueSource,
    isContributor: Boolean(currentUser && isContributorUser(currentUser)),
    isAuthorOrContributor: Boolean(currentUser && isAuthorOrContributor(currentUser)),
    params,
  });
}
