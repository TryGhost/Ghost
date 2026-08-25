import type { PostData } from './post-data';

export interface CreatedPost {
  id: string;
  toJSON(): Record<string, unknown>;
}

export type PostWriteResult =
  | { status: 'created'; post: CreatedPost }
  | { status: 'skipped'; reason: string };

export interface PostsRepository {
  write(data: PostData, options: object): Promise<PostWriteResult>;
}

interface Models {
  Base: {
    transaction<T>(callback: (transacting: object) => Promise<T>): Promise<T>;
  };
  Post: {
    findOne(data: object, options: object): Promise<CreatedPost | null>;
    add(data: PostData, options: object): Promise<CreatedPost>;
  };
}

export class BookshelfPostsRepository implements PostsRepository {
  private _models: Models;

  constructor(models: Models) {
    this._models = models;
  }

  write(data: PostData, options: object): Promise<PostWriteResult> {
    return this._models.Base.transaction(async (transacting) => {
      const writeOptions = { ...options, transacting };
      const lookupOptions = { ...writeOptions, forUpdate: true };

      if (data.comment_id) {
        const existingSource = await this._models.Post.findOne(
          { comment_id: data.comment_id, status: 'all' },
          lookupOptions,
        );

        if (existingSource) {
          return {
            status: 'skipped',
            reason: `A post with the source ID "${data.comment_id}" already exists.`,
          };
        }
      }

      const existingSlug = await this._models.Post.findOne(
        { slug: data.slug, status: 'all' },
        lookupOptions,
      );

      if (existingSlug) {
        return {
          status: 'skipped',
          reason: `A post with the slug "${data.slug}" already exists.`,
        };
      }

      const post = await this._models.Post.add(data, writeOptions);
      return { status: 'created', post };
    });
  }
}
