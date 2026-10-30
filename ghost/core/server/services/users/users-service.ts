import ObjectId from 'bson-objectid';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { PostRevisions } from '../../lib/post-revisions';
import type { PostsBulkAddTagsEvent } from '../../../shared/events-ts';

type SluggedModel = {
  get(attribute: 'id' | 'slug'): string;
};

type LockableUser = {
  lock(options: object): Promise<unknown>;
};

type Models = {
  Base: {
    knex: Knex;
    transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T>;
  };
  User: {
    findAll(options: object): Promise<{ models: LockableUser[] }>;
    findOne(data: object, options: object): Promise<SluggedModel | null>;
    destroy(options: object): Promise<unknown>;
  };
  Tag: {
    findOne(data: object, options: object): Promise<SluggedModel | null>;
    add(data: object, options: object): Promise<SluggedModel>;
  };
  Post: {
    addActions(type: string, postIds: string[], options: object): Promise<unknown>;
    reassignByAuthor(options: object): Promise<unknown>;
  };
  ApiKey: {
    destroy(options: object): Promise<unknown>;
    NotFoundError: new (...args: never[]) => Error;
  };
  PostRevision: unknown;
};

// Author removal only reads the revision model, so the revisions helper is built without the
// generation config that its other methods need.
type RevisionAuthorRemover = new (deps: {
  model: unknown;
}) => Pick<PostRevisions, 'removeAuthorFromRevisions'>;

type UsersServiceDependencies = {
  models: Models;
  DomainEvents: { dispatch(event: PostsBulkAddTagsEvent): void };
  PostsBulkAddTagsEvent: typeof PostsBulkAddTagsEvent;
  PostRevisions: RevisionAuthorRemover;
};

type FrameOptions = {
  transacting?: Knex.Transaction;
  [key: string]: unknown;
};

type UserFrameOptions = FrameOptions & {
  id: string;
  context?: unknown;
};

type AssignTagOptions = {
  id: string;
  context?: unknown;
  transacting: Knex.Transaction;
};

export class UsersService {
  models: Models;
  DomainEvents: UsersServiceDependencies['DomainEvents'];
  PostsBulkAddTagsEvent: typeof PostsBulkAddTagsEvent;
  PostRevisions: RevisionAuthorRemover;

  constructor({
    models,
    DomainEvents,
    PostsBulkAddTagsEvent,
    PostRevisions,
  }: UsersServiceDependencies) {
    this.models = models;
    this.DomainEvents = DomainEvents;
    this.PostsBulkAddTagsEvent = PostsBulkAddTagsEvent;
    this.PostRevisions = PostRevisions;

    this.assignTagToUserPosts = this.assignTagToUserPosts.bind(this);
  }

  /**
   * Lock every user and invalidate their password.
   *
   * Locked users hit `PasswordResetRequiredError` on their next signin
   * attempt; the session endpoint catches that, generates a reset token,
   * and emails the user *in context of their own signin*. That avoids
   * blasting unsolicited "your password has been reset" emails to people
   * who are not actively signing in, while still funnelling everyone
   * through a fresh password before they regain access.
   */
  async lockAll(frameOptions: FrameOptions): Promise<{ count: number }> {
    const lockUsers = async (txOptions: FrameOptions) => {
      // Every staff user has their password rotated. user.lock()
      // preserves `inactive` status for suspended users so they remain
      // on the suspended-signin path; everyone else transitions to
      // `locked` and hits the reset-on-signin flow.
      const users = await this.models.User.findAll(txOptions);
      for (const user of users.models) {
        await user.lock(txOptions);
      }
      return users.models;
    };

    const users = frameOptions.transacting
      ? await lockUsers(frameOptions)
      : await this.models.Base.transaction((t) => lockUsers({ ...frameOptions, transacting: t }));

    return { count: users.length };
  }

  async assignTagToUserPosts({ id, context, transacting }: AssignTagOptions): Promise<void> {
    // get author slug
    const author = await this.models.User.findOne(
      {
        id,
      },
      {
        id,
        context,
        transacting,
      },
    );
    if (!author) {
      throw new errors.NotFoundError({ message: `User ${id} not found` });
    }

    // get list of posts that need the tag assigned
    const userPosts = await this.models.Base.knex<{ post_id: string }>('posts_authors')
      .transacting(transacting)
      .where('author_id', id)
      .select('post_id');
    let usersPostIds = userPosts.map((p) => p.post_id);

    if (usersPostIds.length === 0) {
      return;
    }

    // create an internal tag to assign to reassigned posts
    // in following format: `#{author_slug}`
    let createdTag = false;
    let tag = await this.models.Tag.findOne(
      {
        slug: `hash-${author.get('slug')}`,
      },
      {
        context,
        transacting,
      },
    );
    if (!tag) {
      tag = await this.models.Tag.add(
        {
          slug: `#${author.get('slug')}`,
        },
        {
          context,
          transacting,
        },
      );
      createdTag = true;
    }
    const tagId = tag.get('id');

    // filter out posts that already have the tag if we didn't need to create one
    if (!createdTag) {
      const taggedPostIds = await this.models.Base.knex<{ post_id: string }>('posts_tags')
        .transacting(transacting)
        .where('tag_id', tagId)
        .select('post_id');
      const taggedPostIdSet = new Set(taggedPostIds.map((p) => p.post_id));
      usersPostIds = usersPostIds.filter((postId) => !taggedPostIdSet.has(postId));
    }

    if (usersPostIds.length === 0) {
      return;
    }

    // assign tag to posts
    //  do bulk insert for performance reasons
    //  - go ahead and assign sort_order 0 to all of them
    await this.models.Base.knex('posts_tags')
      .transacting(transacting)
      .insert(
        usersPostIds.map((postId) => ({
          id: new ObjectId().toHexString(),
          post_id: postId,
          tag_id: tagId,
          sort_order: 0,
        })),
      );

    // manually add an entry in the Actions table that specifies the number of posts edited; see #bulkAddTags for similar logic
    await this.models.Post.addActions('edited', usersPostIds, { transacting, context });

    // dispatch event to ensure collections are updated
    this.DomainEvents.dispatch(this.PostsBulkAddTagsEvent.create(usersPostIds));
  }

  async destroyUser(frameOptions: UserFrameOptions): Promise<void> {
    return this.models.Base.transaction(async (t) => {
      frameOptions.transacting = t;

      // null author field for users' post revisions
      const postRevisions = new this.PostRevisions({
        model: this.models.PostRevision,
      });
      await postRevisions.removeAuthorFromRevisions(frameOptions.id, {
        transacting: t,
      });

      // create a #author-slug tag and assign it to their posts
      await this.assignTagToUserPosts({
        id: frameOptions.id,
        context: frameOptions.context,
        transacting: t,
      });

      // reassign posts to owner user
      await this.models.Post.reassignByAuthor({
        id: frameOptions.id,
        context: frameOptions.context,
        transacting: t,
      });

      // delete user
      try {
        await this.models.ApiKey.destroy({
          ...frameOptions,
          require: true,
          destroyBy: {
            user_id: frameOptions.id,
          },
        });
      } catch (err) {
        if (!(err instanceof this.models.ApiKey.NotFoundError)) {
          throw err;
        }
      }

      await this.models.User.destroy(Object.assign({ status: 'all' }, frameOptions));
    });
  }
}
