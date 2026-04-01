import React, {useMemo} from 'react';
import {FilterFieldConfig, ValueSource} from '@tryghost/shade/patterns';
import {LucideIcon} from '@tryghost/shade/utils';
import {commentFields} from './comment-fields';
import {createOperatorOptions} from '../filters/filter-operator-options';

interface UseCommentFilterFieldsOptions {
    postValueSource: ValueSource<string>;
    memberValueSource: ValueSource<string>;
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
    postValueSource,
    memberValueSource
}: UseCommentFilterFieldsOptions): FilterFieldConfig[] {
    return useMemo(() => {
        return COMMENT_FIELD_ORDER.map((key) => {
            const field = commentFields[key];

            return {
                key,
                ...field.ui,
                icon: getFieldIcon(key),
                operators: createOperatorOptions(field.operators),
                ...('options' in field && field.options ? {options: field.options} : {}),
                ...(key === 'author' ? {valueSource: memberValueSource} : {}),
                ...(key === 'post' ? {valueSource: postValueSource} : {})
            };
        });
    }, [memberValueSource, postValueSource]);
}
