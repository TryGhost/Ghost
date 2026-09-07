import type { WrittenPost } from './post-repository';

interface PostLinkOptions {
  adminUrl: string;
  publishedUrl(post: WrittenPost): string;
}

export function urlForImportedPost(post: WrittenPost, options: PostLinkOptions): string {
  const data = post.toJSON();
  if (data.status === 'draft') {
    const editorType = data.type === 'page' ? 'page' : 'post';
    return new URL(`#/editor/${editorType}/${post.id}`, options.adminUrl).href;
  }

  return options.publishedUrl(post);
}
