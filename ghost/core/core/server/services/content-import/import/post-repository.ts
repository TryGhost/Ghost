import type { PostData } from './post-data';

export interface WrittenPost {
  id: string;
  toJSON(): Record<string, unknown>;
}

export type PostWriteResult =
  | { status: 'created'; post: WrittenPost }
  | { status: 'updated'; post: WrittenPost }
  | { status: 'skipped'; reason: string };

export interface PostWriteMetadata {
  sourceUpdatedAt?: string;
}

export interface PostsRepository {
  write(data: PostData, options: object, metadata?: PostWriteMetadata): Promise<PostWriteResult>;
}

interface Models {
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

  constructor(models: Models) {
    this._models = models;
  }

  write(
    data: PostData,
    options: object,
    metadata: PostWriteMetadata = {},
  ): Promise<PostWriteResult> {
    return this._models.Base.transaction(async (transacting) => {
      const writeOptions = { ...options, transacting };
      const lookupOptions = { ...writeOptions, forUpdate: true };
      let existingMatch: { post: WrittenPost; duplicateReason: string } | undefined;

      if (data.comment_id) {
        const existing = await this._models.Post.findOne(
          { comment_id: data.comment_id, status: 'all' },
          lookupOptions,
        );

        if (existing) {
          existingMatch = {
            post: existing,
            duplicateReason: `A post with the source ID "${data.comment_id}" already exists.`,
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
          };
        }
      }

      if (existingMatch) {
        const { post: existing, duplicateReason } = existingMatch;
        if (!metadata.sourceUpdatedAt) {
          return { status: 'skipped', reason: duplicateReason };
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
          };
        }

        // Ghost's collision plugin treats updated_at as the client's version token.
        // First update the content against the locked server version, then persist
        // the incoming source timestamp on its own. The second edit is safe because
        // timestamp-only importing edits are excluded from collision detection.
        const collisionSafeData: Record<string, unknown> = { ...data };
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
        return { status: 'updated', post };
      }

      const post = await this._models.Post.add(data, writeOptions);
      return { status: 'created', post };
    });
  }
}
