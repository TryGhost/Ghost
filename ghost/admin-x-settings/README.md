# Admin X Settings

Experimental re-write of Ghost Admin Settings in React

## Development

### Pre-requisites

- Run `yarn` in Ghost monorepo root
- Run `yarn` in this directory

### Running the development version

Run `yarn dev` to start the development server to test/develop the settings standalone. This will generate a demo site from the `index.html` file which renders the app and makes it available on http://localhost:5173

### Running inside Admin

To test/develop inside of Admin you can run `yarn preview` then in Ghost set your `adminX` value in `config.local.json` to `http://localhost:4173/admin-x-settings.umd.js` and load Admin as usual. Replace Ghost Admin's `settings` url with `settings-x` to load the new settings.

```json
{
    ...
    "adminX": {
        "url": "http://localhost:4173/admin-x-settings.umd.js"
    }
}
```

`yarn preview` by itself only serves the library files, it's possible ro run `yarn build --watch` in a separate terminal tab to have auto-rebuild whilst developing.


## Usage


## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.



## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests
