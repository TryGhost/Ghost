/** Post or page attributes as serialized from the model. */
export type PostData = Record<string, unknown> & { type?: string; url?: string };

/** The part of a post model the helpers read. */
export interface PostModel {
  relations: Record<string, unknown>;
  load(relations: string[]): Promise<unknown>;
  toJSON(): PostData;
}

export interface PostUrlDependencies {
  urlService: { getRequiredRelations(): string[] };
  forPost(
    id: string,
    attrs: PostData,
    frame: { options: Record<string, unknown> },
    type: 'posts' | 'pages',
  ): unknown;
}

/**
 * Resolves the post data and URL the sender captures for a post or page
 * event, through the URL service and the API serializer's URL helper.
 */
export function createPostUrlHelpers({ urlService, forPost }: PostUrlDependencies) {
  // Serializes a post model to the data the URL service needs, loading the
  // relations it reads for filtered collections (event-emitted models don't
  // reliably carry them).
  async function getPostData(post: PostModel): Promise<PostData> {
    const missing = urlService
      .getRequiredRelations()
      .filter((relation) => !post.relations[relation]);
    if (missing.length) {
      await post.load(missing);
    }
    return post.toJSON();
  }

  function getPostUrl(id: string, postData: PostData): string | undefined {
    const jsonModel: PostData = { ...postData };
    // The URL service routes by resource type. Pages and posts share the Post
    // model, so the page's own type must reach forPost — otherwise it defaults
    // to 'posts', matches no post collection, and 404s.
    const type = postData.type === 'page' ? 'pages' : 'posts';
    forPost(id, jsonModel, { options: {} }, type);
    return jsonModel.url;
  }

  return { getPostData, getPostUrl };
}
