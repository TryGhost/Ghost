import React, {useMemo} from 'react';
import {Filter, FilterFieldConfig, LucideIcon} from '@tryghost/shade';
import {getMember} from '@tryghost/admin-x-framework/api/members';
import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {createOperatorOptions} from '../filters/filter-operator-options';
import {commentFields} from './comment-fields';
import {useFilterOptions} from './hooks/use-filter-options';
import {useSearchMembers} from './hooks/use-search-members';
import {useSearchPosts} from './hooks/use-search-posts';

interface UseCommentFilterFieldsProps {
    filters: Filter[];
    knownPosts: Array<{id: string; title: string}>;
    knownMembers: Array<{id: string; name?: string; email?: string}>;
}

const COMMENT_FIELD_ORDER = ['author', 'post', 'body', 'status', 'reported', 'created_at'] as const;

function getFieldIcon(key: string) {
    switch (key) {
    case 'author':
        return React.createElement(LucideIcon.User, {className: 'size-4'});
    case 'post':
        return React.createElement(LucideIcon.FileText, {className: 'size-4'});
    case 'body':
        return React.createElement(LucideIcon.MessageSquareText, {className: 'size-4'});
    case 'status':
        return React.createElement(LucideIcon.Circle, {className: 'size-4'});
    case 'reported':
        return React.createElement(LucideIcon.Flag, {className: 'size-4'});
    case 'created_at':
        return React.createElement(LucideIcon.Calendar, {className: 'size-4'});
    default:
        return undefined;
    }
}

export function useCommentFilterFields({
    filters,
    knownPosts,
    knownMembers
}: UseCommentFilterFieldsProps): FilterFieldConfig[] {
    const posts = useFilterOptions({
        knownItems: knownPosts,
        useSearch: useSearchPosts,
        useGetById: getPost,
        searchFieldName: 'posts',
        filters,
        filterFieldName: 'post',
        toOption: post => ({
            value: post.id,
            label: post.title || '(Untitled)'
        })
    });

    const members = useFilterOptions({
        knownItems: knownMembers,
        useSearch: useSearchMembers,
        useGetById: getMember,
        searchFieldName: 'members',
        filters,
        filterFieldName: 'author',
        toOption: member => ({
            value: member.id,
            label: member.name || 'Unknown name',
            detail: member.email ?? '(Unknown email)'
        })
    });

    return useMemo(() => {
        return COMMENT_FIELD_ORDER.map((key) => {
            const field = commentFields[key];
            if (!field) {
                return null;
            }

                const config: FilterFieldConfig = {
                    key,
                    ...field.ui,
                    icon: getFieldIcon(key),
                    operators: createOperatorOptions(field.operators),
                    ...('options' in field && field.options ? {options: field.options} : {})
                };

                if (key === 'author') {
                    return {
                        ...config,
                        options: members.options,
                        isLoading: members.options.length === 0 && members.isLoading,
                        onSearchChange: members.onSearchChange,
                        searchValue: members.searchValue
                    };
                }

                if (key === 'post') {
                    return {
                        ...config,
                        options: posts.options,
                        isLoading: posts.options.length === 0 && posts.isLoading,
                        onSearchChange: posts.onSearchChange,
                        searchValue: posts.searchValue
                    };
                }

            return config;
        }).filter((field): field is FilterFieldConfig => field !== null);
    }, [members, posts]);
}
