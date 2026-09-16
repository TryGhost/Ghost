// Copied from ghost/core/core/frontend/services/routing/config.ts @ 407e032dc7 —
// transforms: none beyond the provenance header (byte-identical bodies).
export const QUERY = {
  tag: {
    controller: 'tagsPublic',
    type: 'read',
    resource: 'tags',
    options: {
      slug: '%s',
      visibility: 'public',
    },
  },
  author: {
    controller: 'authorsPublic',
    type: 'read',
    resource: 'authors',
    options: {
      slug: '%s',
    },
  },
  post: {
    controller: 'postsPublic',
    type: 'read',
    resource: 'posts',
    options: {
      slug: '%s',
    },
  },
  page: {
    controller: 'pagesPublic',
    type: 'read',
    resource: 'pages',
    options: {
      slug: '%s',
    },
  },
  previews: {
    controller: 'previews',
    resource: 'previews',
  },
  email: {
    controller: 'emailPost',
    resource: 'email_posts',
    options: {
      slug: '%s',
    },
  },
} as const;

export const TAXONOMIES = {
  tag: {
    filter: "tags:'%s'+tags.visibility:public",
    editRedirect: '#/tags/:slug/',
    resource: 'tags',
  },
  author: {
    filter: "authors:'%s'",
    editRedirect: '#/settings/staff/:slug/',
    resource: 'authors',
  },
} as const;
