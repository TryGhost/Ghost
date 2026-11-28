import commentBansAdd from './comment_bans-add.json' with { type: 'json' };
import commentBans from './comment_bans.json' with { type: 'json' };
import imagesUpload from './images-upload.json' with { type: 'json' };
import images from './images.json' with { type: 'json' };
import mediaUpload from './media-upload.json' with { type: 'json' };
import media from './media.json' with { type: 'json' };
import membersAdd from './members-add.json' with { type: 'json' };
import membersEdit from './members-edit.json' with { type: 'json' };
import membersUpload from './members-upload.json' with { type: 'json' };
import members from './members.json' with { type: 'json' };
import pagesAdd from './pages-add.json' with { type: 'json' };
import pagesEdit from './pages-edit.json' with { type: 'json' };
import pages from './pages.json' with { type: 'json' };
import postsAdd from './posts-add.json' with { type: 'json' };
import postsEdit from './posts-edit.json' with { type: 'json' };
import posts from './posts.json' with { type: 'json' };
import productsAdd from './products-add.json' with { type: 'json' };
import productsEdit from './products-edit.json' with { type: 'json' };
import products from './products.json' with { type: 'json' };
import tagsAdd from './tags-add.json' with { type: 'json' };
import tagsEdit from './tags-edit.json' with { type: 'json' };
import tags from './tags.json' with { type: 'json' };
import tiersAdd from './tiers-add.json' with { type: 'json' };
import tiersEdit from './tiers-edit.json' with { type: 'json' };
import tiers from './tiers.json' with { type: 'json' };
import webhooksAdd from './webhooks-add.json' with { type: 'json' };
import webhooksEdit from './webhooks-edit.json' with { type: 'json' };
import webhooks from './webhooks.json' with { type: 'json' };

export const schemas = {
  'comment_bans-add': commentBansAdd,
  comment_bans: commentBans,
  'images-upload': imagesUpload,
  images,
  'media-upload': mediaUpload,
  media,
  'members-add': membersAdd,
  'members-edit': membersEdit,
  'members-upload': membersUpload,
  members,
  'pages-add': pagesAdd,
  'pages-edit': pagesEdit,
  pages,
  'posts-add': postsAdd,
  'posts-edit': postsEdit,
  posts,
  'products-add': productsAdd,
  'products-edit': productsEdit,
  products,
  'tags-add': tagsAdd,
  'tags-edit': tagsEdit,
  tags,
  'tiers-add': tiersAdd,
  'tiers-edit': tiersEdit,
  tiers,
  'webhooks-add': webhooksAdd,
  'webhooks-edit': webhooksEdit,
  webhooks,
} as const;

export type SchemaName = keyof typeof schemas;

export const actionSchemaNames = [
  'comment_bans-add',
  'images-upload',
  'media-upload',
  'members-add',
  'members-edit',
  'members-upload',
  'pages-add',
  'pages-edit',
  'posts-add',
  'posts-edit',
  'products-add',
  'products-edit',
  'tiers-add',
  'tiers-edit',
  'tags-add',
  'tags-edit',
  'webhooks-add',
  'webhooks-edit',
] as const satisfies readonly SchemaName[];
