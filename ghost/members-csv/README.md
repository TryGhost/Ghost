# Members Csv

## Install

`npm install @tryghost/members-csv --save`

or

`yarn add @tryghost/members-csv`


## Usage
There are 2 parts to this package: CSV to JSON serialization and JSON to CSV serialization. The module exposes 2 methods to fullfil these: `parse` and `unparse` respectively.

To `parse` CSV file and convert it to JSON use `parse` method, e.g.:
```js
const {parse} = require('@tryghost/members-csv');

const mapping = {
    email: 'csv_column_containing_email_data',
    name: 'csv_column_containing_names_data'
}
const membersJSON = await parse(csvFilePath, mapping);
```

`csvFilePath` - is a path to the CSV file that has to be processed
`mapping` - optional parameter, it's a hash describing custom mapping for CSV columns to JSON properties

Example mapping for CSV having email under `correo_electronico` column would look like following:
```
{
    email: 'correo_electronico'
}
```

To `unparse` JSON to CSV compatible with members format use following:
```js
const {unparse} = require('@tryghost/members-csv');

const members = [{
    email: 'email@example.com',
    name: 'Sam Memberino',
    note: 'Early supporter'
}];

const membersCSV = unparse(members);

console.log(membersCSV);
// -> "id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels\r\n,email@example.com,Sam Memberino,Early supporter,,,,,,"
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

Copyright (c) 2013-2021 Ghost Foundation - Released under the [MIT license](LICENSE).
