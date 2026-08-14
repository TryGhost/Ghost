/* eslint-disable @typescript-eslint/no-require-imports */
const _ = require('lodash');
const resourcesConfig = require('./config');
/* eslint-enable @typescript-eslint/no-require-imports */

import type {ResourceLookupParams, FindResource} from './lazy-url-service';

interface BookshelfModel {
    findOne(query: Record<string, unknown>, options?: Record<string, unknown>): Promise<{toJSON(): Record<string, unknown>} | null>;
}

interface Models {
    Post: BookshelfModel;
    TagPublic: BookshelfModel;
    Author: BookshelfModel;
}

const POST_SCOPE = {type: 'post', status: 'published'};
const PAGE_SCOPE = {type: 'page', status: 'published'};
const POST_RELATIONS = ['tags', 'authors'];
const RELATION_KEYS = ['tags', 'authors', 'primary_tag', 'primary_author'];

// Drop the same fields the eager resourceConfig excludes so the resolved record
// has the same shape the eager service exposes (no post body, no extra
// author/tag fields). posts_meta is an auto-loaded relation eager never keeps.
function excludeFor(type: string): string[] {
    const cfg = resourcesConfig.find((c: {type: string}) => c.type === type);
    const exclude = (cfg && cfg.modelOptions.exclude) || [];
    return [...exclude, 'posts_meta'];
}

// Eager trims relations to {id, slug} via withRelatedFields; match that.
function trimRelation(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(item => _.pick(item, ['id', 'slug']));
    }
    if (value && typeof value === 'object') {
        return _.pick(value, ['id', 'slug']);
    }
    return value;
}

function pruneToEagerShape(record: Record<string, unknown>, type: string): Record<string, unknown> {
    const pruned = _.omit(record, excludeFor(type));

    if (type === 'pages') {
        // Eager always exposes primary_tag/primary_author as null on pages (they
        // are virtual Post fields) but never carries the tags/authors arrays.
        pruned.primary_tag = null;
        pruned.primary_author = null;
        return pruned;
    }

    for (const key of RELATION_KEYS) {
        if (pruned[key] !== undefined) {
            pruned[key] = trimRelation(pruned[key]);
        }
    }
    return pruned;
}

/**
 * Builds the per-request DB lookup hook injected into LazyUrlService.resolveUrl.
 * Visibility rules mirror the eager service so a guessed slug can't surface
 * anything the eager path hid; unknown types resolve to null.
 */
export function createFindResource(models: Models): FindResource {
    const loadOne = async (
        Model: BookshelfModel,
        query: Record<string, unknown>,
        type: string,
        options: Record<string, unknown> = {}
    ): Promise<Record<string, unknown> | null> => {
        const result = await Model.findOne(query, {...options, require: false});
        if (!result) {
            return null;
        }
        const record = result.toJSON();
        // Post.toJSON computes primary_tag but not primary_author.
        if (Array.isArray(record.authors)) {
            record.primary_author = record.authors[0] ?? null;
        }
        return pruneToEagerShape(record, type);
    };

    return (type: string, params: ResourceLookupParams): Promise<Record<string, unknown> | null> => {
        switch (type) {
        case 'posts':
            return loadOne(models.Post, {...params, ...POST_SCOPE}, type, {withRelated: POST_RELATIONS});
        case 'pages':
            return loadOne(models.Post, {...params, ...PAGE_SCOPE}, type);
        case 'tags':
            return loadOne(models.TagPublic, {...params, visibility: 'public'}, type);
        case 'authors':
            return loadOne(models.Author, {...params, visibility: 'public'}, type);
        default:
            return Promise.resolve(null);
        }
    };
}

module.exports = {createFindResource};
module.exports.createFindResource = createFindResource;
