/*
 * Columns a routes.yaml filter must not be evaluated against.
 *
 * Ghost used to answer URLs from a map precomputed at boot, and kept that map
 * lean by dropping these columns from every cached record. A collection filter
 * referencing one therefore matched it as absent, which NQL reads as null. The
 * URL service loads full records and would see the real value, so it strips
 * these before evaluating a filter — otherwise routes.yaml files written
 * against the old behaviour would start routing differently.
 *
 * `lazy-find-resource` strips the same columns so a resolved resource has the
 * shape callers have always seen.
 */

// TODO: switch exclude lists to include lists to make this more explicit
module.exports = [
  {
    type: 'posts',
    exclude: [
      'title',
      'mobiledoc',
      'lexical',
      'html',
      'plaintext',
      // @TODO: https://github.com/TryGhost/Ghost/issues/10335
      // 'page',
      'status',
      'codeinjection_head',
      'codeinjection_foot',
      'meta_title',
      'meta_description',
      'custom_excerpt',
      'og_image',
      'og_title',
      'og_description',
      'twitter_image',
      'twitter_title',
      'twitter_description',
      'custom_template',
      'locale',
      'newsletter_id',
      'show_title_and_feature_image',
      'email_recipient_filter',
      'comment_id',
      'tiers',
    ],
  },
  {
    type: 'pages',
    exclude: [
      'title',
      'mobiledoc',
      'lexical',
      'html',
      'plaintext',
      // @TODO: https://github.com/TryGhost/Ghost/issues/10335
      // 'page',
      // 'status',
      'codeinjection_head',
      'codeinjection_foot',
      'meta_title',
      'meta_description',
      'custom_excerpt',
      'og_image',
      'og_title',
      'og_description',
      'twitter_image',
      'twitter_title',
      'twitter_description',
      'custom_template',
      'locale',
      'tags',
      'authors',
      'primary_tag',
      'primary_author',
      'newsletter_id',
      'show_title_and_feature_image',
      'email_recipient_filter',
      'comment_id',
      'tiers',
    ],
  },
  {
    type: 'tags',
    exclude: ['description', 'meta_title', 'meta_description', 'parent_id'],
  },
  {
    type: 'authors',
    exclude: [
      'bio',
      'website',
      'location',
      'facebook',
      'twitter',
      'locale',
      'accessibility',
      'meta_title',
      'meta_description',
      'tour',
      'last_seen',
    ],
  },
];
