import {UniqueChecker} from './UniqueChecker';
import {ValidationError} from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import nql from '@tryghost/nql';
import {posts as postExpansions} from '@tryghost/nql-filter-expansions';
import {CollectionPost} from './CollectionPost';

import ObjectID from 'bson-objectid';

const messages = {
    invalidIDProvided: 'Invalid ID provided for Collection',
    invalidDateProvided: 'Invalid date provided for {fieldName}',
    invalidFilterProvided: {
        message: 'Invalid filter provided for automatic Collection',
        context: 'Automatic type of collection should always have a filter value'
    },
    noTitleProvided: 'Title must be provided',
    slugMustBeUnique: 'Slug must be unique'
};

export class Collection {
    id: string;
    title: string;
    private _slug: string;
    get slug() {
        return this._slug;
    }

    async setSlug(slug: string, uniqueChecker: UniqueChecker) {
        if (slug === this.slug) {
            return;
        }
        if (await uniqueChecker.isUniqueSlug(slug)) {
            this._slug = slug;
        } else {
            throw new ValidationError({
                message: tpl(messages.slugMustBeUnique)
            });
        }
    }
    description: string;
    type: 'manual' | 'automatic';
    filter: string | null;
    featureImage: string | null;
    createdAt: Date;
    updatedAt: Date;
    get deletable() {
        return this.slug !== 'latest' && this.slug !== 'featured';
    }
    private _deleted: boolean = false;

    private _posts: string[];
    get posts() {
        return this._posts;
    }

    public get deleted() {
        return this._deleted;
    }

    public set deleted(value: boolean) {
        if (this.deletable) {
            this._deleted = value;
        }
    }

    public async edit(data: Partial<Collection>, uniqueChecker: UniqueChecker) {
        if (this.type === 'automatic' && this.slug !== 'latest' && (data.filter === null || data.filter === '')) {
            throw new ValidationError({
                message: tpl(messages.invalidFilterProvided.message),
                context: tpl(messages.invalidFilterProvided.context)
            });
        }

        if (data.title !== undefined) {
            this.title = data.title;
        }

        if (data.slug !== undefined) {
            await this.setSlug(data.slug, uniqueChecker);
        }

        if (data.description !== undefined) {
            this.description = data.description;
        }

        if (data.filter !== undefined) {
            this.filter = data.filter;
        }

        if (data.featureImage !== undefined) {
            this.featureImage = data.featureImage;
        }

        return this;
    }

    postMatchesFilter(post: CollectionPost) {
        const filterNql = nql(this.filter, {
            expansions: postExpansions
        });
        return filterNql.queryJSON(post);
    }

    /**
     * @param post {{id: string}} - The post to add to the collection
     * @param index {number} - The index to insert the post at, use negative numbers to count from the end.
     */
    addPost(post: CollectionPost, index: number = -0) {
        if (this.type === 'automatic') {
            const matchesFilter = this.postMatchesFilter(post);

            if (!matchesFilter) {
                return false;
            }
        }

        if (this.posts.includes(post.id)) {
            this._posts = this.posts.filter(id => id !== post.id);
        }

        if (index < 0 || Object.is(index, -0)) {
            index = this.posts.length + index;
        }

        this.posts.splice(index, 0, post.id);
        return true;
    }

    removePost(id: string) {
        if (this.posts.includes(id)) {
            this._posts = this.posts.filter(postId => postId !== id);
        }
    }

    includesPost(id: string) {
        return this.posts.includes(id);
    }

    removeAllPosts() {
        this._posts = [];
    }

    private constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this._slug = data.slug;
        this.description = data.description;
        this.type = data.type;
        this.filter = data.filter;
        this.featureImage = data.featureImage;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.deleted = data.deleted;
        this._posts = data.posts;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            slug: this.slug,
            description: this.description,
            type: this.type,
            filter: this.filter,
            featureImage: this.featureImage,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            posts: this.posts
        };
    }

    static validateDateField(date: any, fieldName: string): Date {
        if (!date) {
            return new Date();
        }

        if (date instanceof Date) {
            return date;
        }

        throw new ValidationError({
            message: tpl(messages.invalidDateProvided, {fieldName})
        });
    }

    static async create(data: any): Promise<Collection> {
        let id;

        if (!data.id) {
            id = new ObjectID();
        } else if (typeof data.id === 'string') {
            id = ObjectID.createFromHexString(data.id);
        } else if (data.id instanceof ObjectID) {
            id = data.id;
        } else {
            throw new ValidationError({
                message: tpl(messages.invalidIDProvided)
            });
        }

        if (data.type === 'automatic' && (data.slug !== 'latest') && !data.filter) {
            // @NOTE: add filter validation here
            throw new ValidationError({
                message: tpl(messages.invalidFilterProvided.message),
                context: tpl(messages.invalidFilterProvided.context)
            });
        }

        if (!data.title) {
            throw new ValidationError({
                message: tpl(messages.noTitleProvided)
            });
        }

        return new Collection({
            id: id.toHexString(),
            title: data.title,
            slug: data.slug,
            description: data.description || null,
            type: data.type || 'manual',
            filter: data.filter || null,
            featureImage: data.feature_image || null,
            createdAt: Collection.validateDateField(data.created_at, 'created_at'),
            updatedAt: Collection.validateDateField(data.updated_at, 'updated_at'),
            deleted: data.deleted || false,
            posts: data.posts || []
        });
    }
}
