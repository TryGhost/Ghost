const {
  addTable,
  createAddColumnMigration,
  combineNonTransactionalMigrations,
} = require('../../utils');

// Fixed schema snapshot: later model/schema changes must not alter this migration.
const migrations = [
  createAddColumnMigration('posts', 'content_type', {
    type: 'string',
    maxlength: 191,
    nullable: true,
    index: true,
  }),
  addTable('post_content_types', {
    id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      primary: true,
    },
    content_type: {
      type: 'string',
      maxlength: 191,
      nullable: false,
      unique: true,
    },
    app: {
      type: 'string',
      maxlength: 50,
      nullable: false,
    },
    label: {
      type: 'string',
      maxlength: 191,
      nullable: false,
    },
    icon: {
      type: 'string',
      maxlength: 50,
      nullable: true,
    },
    provider_origin: {
      type: 'string',
      maxlength: 2000,
      nullable: false,
    },
    extensions: {
      type: 'text',
      maxlength: 65535,
      nullable: false,
    },
  }),
  addTable('posts_metafields', {
    id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      primary: true,
    },
    content_type: {
      type: 'string',
      maxlength: 191,
      nullable: false,
      references: 'post_content_types.content_type',
    },
    namespace: {
      type: 'string',
      maxlength: 50,
      nullable: false,
    },
    key: {
      type: 'string',
      maxlength: 191,
      nullable: false,
    },
    name: {
      type: 'string',
      maxlength: 191,
      nullable: false,
    },
    type: {
      type: 'string',
      maxlength: 50,
      nullable: false,
    },
    '@@UNIQUE_CONSTRAINTS@@': [['namespace', 'key']],
  }),
  addTable('posts_metafield_values', {
    id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      primary: true,
    },
    post_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'posts.id',
      cascadeDelete: true,
    },
    metafield_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'posts_metafields.id',
      cascadeDelete: true,
    },
    path: {
      type: 'string',
      maxlength: 191,
      nullable: false,
      defaultTo: '',
    },
    value_text: {
      type: 'text',
      maxlength: 65535,
      nullable: true,
    },
    '@@UNIQUE_CONSTRAINTS@@': [
      {
        columns: ['post_id', 'metafield_id', 'path'],
        indexName: 'posts_metafield_values_leaf_unique',
      },
    ],
  }),
];

module.exports = combineNonTransactionalMigrations(...migrations);
