# Admin Api Schema

The package serves as a single source of truth when validating requests coming into Ghost's Admin API endpoints. It uses [JSON Schema](https://json-schema.org/) definitions under the hood to describe expected format of validated data.

## Install

`npm install @tryghost/admin-api-schema --save`

or

`yarn add @tryghost/admin-api-schema`


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

This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.


## Run

- `yarn dev`


## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests




# Copyright & License

Copyright (c) 2013-2023 Ghost Foundation - Released under the [MIT license](LICENSE).
