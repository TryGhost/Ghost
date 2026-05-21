import type {FindResource} from './lazy-url-service';

interface BookshelfModel {
    findOne(query: Record<string, unknown>, options?: Record<string, unknown>): Promise<{toJSON(): Record<string, unknown>} | null>;
}

interface Models {
    Post: BookshelfModel;
    TagPublic: BookshelfModel;
    Author: BookshelfModel;
}

/**
 * Builds the on-demand DB lookup hook used by LazyUrlService.resolveUrl.
 *
 * The eager UrlService only registers URLs for resources matching the
 * resourceConfig filter (status:published, public visibility). Mirror that
 * here so reverse lookups can't return drafts / private resources even though
 * we now hit the DB on demand. We also disambiguate posts vs pages — both
 * share `models.Post` and a permalink template like `/:slug/` could otherwise
 * return either record.
 *
 * For tags and authors we use the public-facing scoped models (TagPublic,
 * Author) which carry the shouldHavePosts gate, so reverse lookups can't
 * return tags/users with no published posts (and in particular can't expose
 * staff User accounts via a guessed slug).
 */
export function createFindResource(models: Models): FindResource {
    const loadOne = async (Model: BookshelfModel, query: Record<string, unknown>, options: Record<string, unknown> = {}) => {
        const result = await Model.findOne(query, {require: false, ...options});
        return result ? result.toJSON() : null;
    };

    // Posts and pages need their tags/authors relations loaded so NQL
    // filters like `tag:news` / `author:jane` can be evaluated against the
    // returned record (LazyUrlService re-checks the route's filter after
    // the DB lookup). Without these, every tag- or author-filtered route
    // would silently 404.
    const POSTLIKE_RELATIONS = ['tags', 'authors'];

    const loadPostlike = (Model: BookshelfModel, query: Record<string, unknown>, dbType: string) => {
        return loadOne(Model, {...query, type: dbType, status: 'published'}, {withRelated: POSTLIKE_RELATIONS});
    };

    return (type: string, query: Record<string, string>) => {
        if (type === 'posts') {
            return loadPostlike(models.Post, query, 'post');
        }
        if (type === 'pages') {
            return loadPostlike(models.Post, query, 'page');
        }
        if (type === 'tags') {
            return loadOne(models.TagPublic, {...query, visibility: 'public'});
        }
        if (type === 'authors') {
            return loadOne(models.Author, {...query, visibility: 'public'});
        }
        return Promise.resolve(null);
    };
}

module.exports = {createFindResource};
