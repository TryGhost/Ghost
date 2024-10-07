# Admin X Settings

Ghost Admin Settings in React

## Development

### Pre-requisites

- Run `pnpm` in Ghost monorepo root

### Running the development version

Run `pnpm dev` to start the development server to test/develop the settings standalone. This will generate a demo site from the `index.html` file which renders the app and makes it available on http://localhost:5173

### Running inside Admin

Run `pnpm dev` (like you would run Ghost dev normally) from the top-level repo. AdminX will automatically rebuild when you make changes.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm` to install top-level dependencies.



## Test

- `pnpm lint` run just eslint
- `pnpm test:acceptance` runs acceptance tests
- `pnpm test:unit` runs unit tests
- `pnpm test:acceptance path/to/test` runs a specific test
- `pnpm test:acceptance:slowmo` runs acceptance tests in slow motion and headed mode, useful for debugging and developing tests
