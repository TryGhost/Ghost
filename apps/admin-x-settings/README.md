# Admin X Settings

Ghost Admin Settings in React

## Development

### Pre-requisites

- Run `yarn` in Ghost monorepo root

### Running the development version

Run `yarn dev` to start the development server to test/develop the settings standalone. This will generate a demo site from the `index.html` file which renders the app and makes it available on http://localhost:5173

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.



## Test

- `yarn lint` run just eslint
- `yarn test:acceptance` runs acceptance tests
- `yarn test:unit` runs unit tests
- `yarn test:acceptance path/to/test` runs a specific test
- `yarn test:acceptance:slowmo` runs acceptance tests in slow motion and headed mode, useful for debugging and developing tests
