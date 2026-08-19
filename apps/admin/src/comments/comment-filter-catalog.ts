import {buildCatalog} from '@/shared/filters';
import {COMMENT_FIELDS} from './comment-fields';
import type {FilterField} from '@/shared/filters';

export type CommentFields = Record<string, FilterField>;

export const COMMENT_FIELD_CATALOG: CommentFields = buildCatalog(COMMENT_FIELDS);
