import {UniqueChecker} from './UniqueChecker';
import {ValidationError, MethodNotAllowedError} from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import nql from '@tryghost/nql';
import {posts as postExpansions} from '@tryghost/nql-filter-expansions';
import {CollectionPost} from './CollectionPost';
import {Entity} from './Entity';

import ObjectID from 'bson-objectid';

const messages = {
    invalidIDProvided: 'Invalid ID provided for Collection',
    invalidDateProvided: 'Invalid date provided for {fieldName}',
    invalidFilterProvided: {
        message: 'Invalid filter provided for automatic Collection',
        context: 'Automatic type of collection should always have a filter value'
    },
    noTitleProvided: 'Title must be provided',
    slugMustBeUnique: 'Slug must be unique',
    cannotDeleteBuiltInCollectionError: {
        message: 'Cannot delete builtin collection',
        context: 'The collection {id} is a builtin collection and cannot be deleted'
    }
};

/**
 * This defines how the Entity can be interacted with
 */
type CollectionData = {
    readonly id: string;
    readonly slug: string;
    readonly type: 'manual' | 'automatic';
    readonly posts: string[];
    title: string;
    description: string | null;
    filter: string | null;
    featureImage: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date | null;
}

export class Collection extends Entity<CollectionData> {
    // Optional, but handles delete logic - obviously
    delete() {
        if (this.slug !== 'latest' && this.slug !== 'featured') {
            this.setDeleted();
        } else {
            throw new MethodNotAllowedError({
                message: tpl(messages.cannotDeleteBuiltInCollectionError.message),
                context: tpl(messages.cannotDeleteBuiltInCollectionError.context, {
                    id: this.id
                })
            });
        }
    }

    // Optional, but handle validation - obviously
    protected validations: Partial<{[T in keyof CollectionData]: (entity: Collection, value: unknown) => void}>  = {
        id(collection, id) {
            // We have to cast to string;
            if (!ObjectID.isValid(id + '')) {
                throw new ValidationError({
                    message: tpl(messages.invalidIDProvided)
                });
            }
        },
        type(collection, type) {
            if (type !== 'automatic' && type !== 'manual') {
                throw new ValidationError({
                    message: 'Invalid type ' + type
                });
            }
        },
        description(collection, value) {
            if (typeof value === 'string' && value.length > 2000) {
                throw new ValidationError({
                    message: 'Invalid description'
                });
            }
        },
        filter(collection, filter) {
            validateFilter(filter as string | null, collection.type, collection.slug === 'latest');
        },
        createdAt(collection, date) {
            validateDateField(date, 'created_at');
        },
        updatedAt(collection, date) {
            validateDateField(date, 'updated_at');
        }
    };

    // Custom setter
    set filter(value: string | null) {
        if (this.slug === 'latest' || this.slug === 'featured') {
            return;
        }
        this.validate('filter', value)
        this.attr.filter = value;
    }

    /**
     * Functionality
     */

    async setSlug(slug: string, uniqueChecker: UniqueChecker) {
        if (slug === this.slug) {
            return;
        }
        if (await uniqueChecker.isUniqueSlug(slug)) {
            this.attr.slug = slug;
        } else {
            throw new ValidationError({
                message: tpl(messages.slugMustBeUnique)
            });
        }
    }

    postMatchesFilter(post: CollectionPost): boolean {
        const filterNql = nql(this.filter, {
            expansions: postExpansions
        });
        return filterNql.queryJSON(post);
    }

    /**
     * @param post - The post to add to the collection
     * @param index - The index to insert the post at, use negative numbers to count from the end.
     */
    addPost(post: CollectionPost, index: number = -0) {
        if (this.type === 'automatic') {
            const matchesFilter = this.postMatchesFilter(post);

            if (!matchesFilter) {
                return false;
            }
        }

        if (this.posts.includes(post.id)) {
            this.attr.posts = this.posts.filter(id => id !== post.id);
        }

        if (index < 0 || Object.is(index, -0)) {
            index = this.posts.length + index;
        }

        this.posts.splice(index, 0, post.id);
        return true;
    }

    removePost(id: string) {
        if (this.posts.includes(id)) {
            this.attr.posts = this.posts.filter(postId => postId !== id);
        }
    }

    removeAllPosts() {
        this.attr.posts = [];
    }

    /**
     * Boilerplate
     */

    // Some boilerplate - used to setup getters and setters;
    protected fields: (keyof CollectionData)[] = ['id', 'title', 'slug', 'description', 'type', 'filter', 'featureImage', 'posts', 'createdAt', 'updatedAt'];
    protected writeableFields: (keyof CollectionData)[] = ['filter', 'title', 'description', 'featureImage'];



    /**
     * The create method is the factory for creating instances of the Entity
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async create(data: any): Promise<Collection> {
        // Here we can handle any "global defaults" - these are things that we want to always enforce.
        const type = data.type ? data.type : 'manual';
        const filter = typeof data.filter === 'string' ? data.filter : null;

        let id = data.id;
        if (!id) {
            id = (new ObjectID()).toHexString();
        }

        // Global defaults are done, we pass all the values into the Collection now.
        const collection = new Collection({
            id: id,
            title: data.title,
            slug: data.slug,
            description: data.description || null,
            type: type,
            filter: filter,
            featureImage: data.feature_image || null,
            createdAt: data.created_at || new Date(),
            updatedAt: data.updated_at || new Date(),
            posts: data.posts || []
        });

        // This is boilerplate, it sets up all the getters and setters
        collection.initialise();

        // This will throw if any of the passed values are invalid
        collection.validate();

        return collection;
    }
}

/**
 * Validations, could eventually be pulled into ValueObjects, validation utility files etc..
 */

function validateFilter(filter: string | null, type: 'manual' | 'automatic', isAllowedEmpty = false) {
    const allowedProperties = ['featured', 'published_at', 'tag', 'tags']
    if (type === 'manual') {
        if (filter !== null) {
            throw new ValidationError({
                message: tpl(messages.invalidFilterProvided.message),
                context: tpl(messages.invalidFilterProvided.context)
            });
        }
        return;
    }

    // type === 'automatic' now
    if (filter === null) {
        throw new ValidationError({
            message: tpl(messages.invalidFilterProvided.message),
            context: tpl(messages.invalidFilterProvided.context)
        });
    }

    if (filter.trim() === '' && !isAllowedEmpty) {
        throw new ValidationError({
            message: tpl(messages.invalidFilterProvided.message),
            context: tpl(messages.invalidFilterProvided.context)
        });
    }

    try {
        const parsedFilter = nql(filter);
        const keysUsed: string[] = [];
        nql.utils.mapQuery(parsedFilter.toJSON(), function (value: unknown, key: string) {
            keysUsed.push(key);
        });
        if (keysUsed.some(key => !allowedProperties.includes(key))) {
            throw new ValidationError({
                message: tpl(messages.invalidFilterProvided.message)
            });
        }
    } catch (err) {
        throw new ValidationError({
            message: tpl(messages.invalidFilterProvided.message)
        });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateDateField(date: unknown, fieldName: string): Date {
    if (date instanceof Date) {
        return date;
    }

    throw new ValidationError({
        message: tpl(messages.invalidDateProvided, {fieldName})
    });
}
