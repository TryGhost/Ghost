# Admin Api Schema

The package serves as a single source of truth when validating requests coming into Ghost's Admin API endpoints. It uses [JSON Schema](https://json-schema.org/) definitions under the hood to describe expected format of validated data.

This is a private workspace package used by Ghost Core. It is bundled into the
Ghost release artifact and is not published independently.


## Usage
```js
const jsonSchema = require('@tryghost/admin-api-schema');

// check available schemas
jsonSchema.list()
/*
> [
  'images-upload', 'labels-add',
  'labels-edit',   'members-add',
  'members-edit',  'members-upload',
  'pages-add',     'pages-edit',
  'posts-add',     'posts-edit',
  'tags-add',      'tags-edit',
  'webhooks-add',  'webhooks-edit'
]
*/

// get schema definition
jsonSchema.get('tags-edit');
/*
> {
  '$schema': 'http://json-schema.org/draft-07/schema#',
  '$id': 'tags.edit',
  title: 'tags.edit',
  description: 'Schema for tags.edit',
  type: 'object',
  additionalProperties: false,
  properties: {
    tags: { type: 'array', minItems: 1, maxItems: 1, items: [Object] }
  },
  required: [ 'tags' ]
}
*/

// validate data
const data = {
    posts: [{
        title: 'valid'
    }]
};

try {
    await apiSchema.validate({data, schema: 'posts-add'});
} catch (err) {
    console.log('validateion error:', err);
}
```

When used from Ghost core in validation layer:
```js
const jsonSchema = require('@tryghost/admin-api-schema');
const validate = async (apiConfig, frame) => await jsonSchema.validate({
    data: frame.data,
    schema: `${apiConfig.docName}-${apiConfig.method}`
});
```

## Develop

From the Ghost repository root:

```bash
pnpm --filter @tryghost/admin-api-schema test
pnpm --filter @tryghost/admin-api-schema lint
```




# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
