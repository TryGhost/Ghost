// have to use requires until there are type definitions for these modules

import {ValidationError} from '@tryghost/errors';
import tpl from '@tryghost/tpl';

import ObjectID from 'bson-objectid';
import {PostDTO} from './PostDTO';

const messages = {
    invalidIDProvided: 'Invalid ID provided for Collection',
    invalidDateProvided: 'Invalid date provided for {fieldName}'
};

export class Collection {
    id: string;
    title: string;
    slug: string;
    description: string;
    type: 'manual' | 'automatic';
    filter: string | null;
    featureImage: string | null;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;

    posts: PostDTO[];

    private constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this.slug = data.slug;
        this.description = data.description;
        this.type = data.type;
        this.filter = data.filter;
        this.featureImage = data.featureImage;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.deleted = data.deleted;
        this.posts = data.posts;
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
            posts: this.posts.map(post => ({
                id: post.id,
                title: post.title,
                slug: post.slug
            }))
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

        return new Collection({
            id: id.toHexString(),
            title: data.title,
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
