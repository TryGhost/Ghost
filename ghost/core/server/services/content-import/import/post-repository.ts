import type { PostData } from './post-data';
import type { DuplicateMetadata } from './store';
import {
  BookshelfPostRelationsResolver,
  type PostRelationSource,
  type PostRelationsResolver,
  type RelationModels,
} from './relations';

export interface WrittenPost {
  id: string;
  toJSON(): Record<string, unknown>;
}

export type PostWriteResult =
  | { status: 'created'; post: WrittenPost; warnings: string[] }
  | { status: 'updated'; post: WrittenPost; warnings: string[] }
  | { status: 'skipped'; reason: string; duplicate: DuplicateMetadata };

export interface PostWriteMetadata extends PostRelationSource {
  sourceUpdatedAt?: string;
  runTagName?: string;
}

export interface PostsRepository {
  write(data: PostData, options: object, metadata?: PostWriteMetadata): Promise<PostWriteResult>;
}

interface Models extends RelationModels {
  Base: {
    transaction<T>(callback: (transacting: object) => Promise<T>): Promise<T>;
  };
  Post: {
    findOne(data: object, options: object): Promise<WrittenPost | null>;
    add(data: PostData, options: object): Promise<WrittenPost>;
    edit(data: object, options: object): Promise<WrittenPost>;
  };
}

export class BookshelfPostsRepository implements PostsRepository {
  private _models: Models;
  private _relations: PostRelationsResolver;

  constructor(
    models: Models,
    relations: PostRelationsResolver = new BookshelfPostRelationsResolver(models),
  ) {
    this._models = models;
    this._relations = relations;
  }

  write(
    data: PostData,
    options: object,
    metadata: PostWriteMetadata = {},
  ): Promise<PostWriteResult> {
    return this._models.Base.transaction(async (transacting) => {
      const writeOptions = { ...options, transacting };
      const lookupOptions = {
        ...writeOptions,
        forUpdate: true,
        ...(metadata.runTagName ? { withRelated: ['tags'] } : {}),
      };
      let existingMatch:
        | {
            post: WrittenPost;
            duplicateReason: string;
            matchedBy: DuplicateMetadata['matchedBy'];
          }
        | undefined;

      if (data.comment_id) {
        const existing = await this._models.Post.findOne(
          { comment_id: data.comment_id, status: 'all' },
          lookupOptions,
        );

        if (existing) {
          existingMatch = {
            post: existing,
            duplicateReason: `A post with the source ID "${data.comment_id}" already exists.`,
            matchedBy: 'source_id',
          };
        }
      }

      if (!existingMatch) {
        const existing = await this._models.Post.findOne(
          { slug: data.slug, status: 'all' },
          lookupOptions,
        );

        if (existing) {
          existingMatch = {
            post: existing,
            duplicateReason: `A post with the slug "${data.slug}" already exists.`,
            matchedBy: 'slug',
          };
        }
      }

      if (existingMatch) {
        const { post: existing, duplicateReason, matchedBy } = existingMatch;
        const duplicate: DuplicateMetadata = {
          origin: hasRunTag(existing, metadata.runTagName) ? 'this_import' : 'pre_existing',
          matchedBy,
        };
        if (!metadata.sourceUpdatedAt) {
          return { status: 'skipped', reason: duplicateReason, duplicate };
        }

        const incomingInstant = new Date(metadata.sourceUpdatedAt).getTime();
        const storedUpdatedAt = existing.toJSON().updated_at;
        const storedInstant = storedUpdatedAt
          ? new Date(storedUpdatedAt as string | number | Date).getTime()
          : undefined;

        if (
          Number.isNaN(incomingInstant) ||
          (storedInstant !== undefined && incomingInstant <= storedInstant)
        ) {
          return {
            status: 'skipped',
            reason: 'The existing post is newer than or as recent as the imported row.',
            duplicate,
          };
        }

        // Ghost's collision plugin treats updated_at as the client's version token.
        // First update the content against the locked server version, then persist
        // the incoming source timestamp on its own. The second edit is safe because
        // timestamp-only importing edits are excluded from collision detection.
        const resolved = await this._relations.resolve(data, metadata, writeOptions);
        const collisionSafeData: Record<string, unknown> = { ...resolved.data };
        if (storedUpdatedAt) {
          collisionSafeData.updated_at = storedUpdatedAt;
        } else {
          delete collisionSafeData.updated_at;
        }
        const editOptions = {
          ...writeOptions,
          id: existing.id,
        };
        await this._models.Post.edit(collisionSafeData, { ...editOptions });
        const post = await this._models.Post.edit(
          { updated_at: metadata.sourceUpdatedAt },
          { ...editOptions },
        );
        return { status: 'updated', post, warnings: resolved.warnings };
      }

      const resolved = await this._relations.resolve(data, metadata, writeOptions);
      const post = await this._models.Post.add(resolved.data, writeOptions);
      return { status: 'created', post, warnings: resolved.warnings };
    });
  }
}

function hasRunTag(post: WrittenPost, runTagName?: string): boolean {
  if (!runTagName) {
    return false;
  }

  const tags = post.toJSON().tags;
  return (
    Array.isArray(tags) &&
    tags.some(
      (tag) =>
        typeof tag === 'object' &&
        tag !== null &&
        'name' in tag &&
        (tag as { name?: unknown }).name === runTagName,
    )
  );
}
