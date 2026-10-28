/**
 * POC ONLY. What the fake starts with in a browser that has never seen it, such as a phone
 * opening the site through a tunnel: a snapshot of the store taken on 2026-10-28, with Noah
 * Bennet's answers keyed by his uuid in the local dev database. A browser that already has
 * a store keeps its own.
 */
export const SEED = {
  version: 1,
  fields: [
    {
      namespace: 'custom',
      key: 'topics',
      name: 'Topics',
      type: 'list',
      status: 'active',
      access: { member: 'write' },
      created_at: '2026-10-28T11:49:29.098Z',
      updated_at: null,
      options: ['Climate', 'Science', 'Politics', 'Culture'],
      multiple: true,
    },
    {
      namespace: 'custom',
      key: 'favorite_color',
      name: 'Favorite Color',
      type: 'list',
      status: 'active',
      access: { member: 'write' },
      created_at: '2026-10-28T11:53:14.291Z',
      updated_at: '2026-10-28T11:53:20.444Z',
      options: ['Red', 'Green', 'Blue'],
      multiple: false,
    },
  ],
  order: ['my_custom_field', 'topics', 'favorite_color', 'shipping_address'],
  answers: {
    'cb158b5e-8267-4db3-8ef2-dc0750c9cd44': {
      topics: ['Climate', 'Politics', 'Culture'],
      favorite_color: ['Red'],
    },
  },
};
