# Patches

This directory contains patches managed by [patch-package](https://www.npmjs.com/package/patch-package) that modify third-party npm packages to fix bugs or add functionality required by Ghost.

## Current Patches

### `esm+3.2.25.patch`
- **Package**: `esm@3.2.25`
- **Purpose**: Updated ESM patch for Node.js 22 support

This patch swaps out the `esm` module code for the [esm-wallaby](https://www.npmjs.com/package/esm-wallaby) fork version to ensure Admin's Ember.js build compatibility with newer versions of Node.js, particularly versions 22.10.0 to 22.16.x. We patch because our dependencies and sub-dependencies require the `esm` module and it's much harder to patch all of them to pull in a differently named module than it is to just swap out the `esm` module code.

To update, run these commands in the root of the Ghost project:

```bash
rm patches/esm+3.2.25.patch
dest=esm-wallaby && mkdir -p "$dest" && curl -sL "$(npm view esm-wallaby dist.tarball)" | tar -xz -C "$dest" --strip-components=1
cp "esm-wallaby/esm.js" "node_modules/esm/esm.js"
cp "esm-wallaby/esm/loader.js" "node_modules/esm/esm/loader.js"
npx patch-package esm
rm -rf esm-wallaby
```

## How Patches Work

Patches are automatically applied after `yarn install` runs via the `postinstall` script defined in `package.json`:

```json
"postinstall": "patch-package"
```

This ensures that any modified dependencies are consistently patched across all environments (development, CI, production).

## Creating a New Patch

If you need to patch a dependency:

1. **Make your changes** to the files in `node_modules/package-name/`
2. **Create the patch file**:
   ```bash
   npx patch-package package-name
   ```
3. **Commit the patch file** that gets generated in the `patches/` directory
4. **Test thoroughly** to ensure the patch works in all environments

## Updating an Existing Patch

When a dependency is updated and the existing patch no longer applies:

1. **Remove the old patch file** from the `patches/` directory
2. **Install the new version** of the dependency
3. **Make the necessary changes** in `node_modules/package-name/`
4. **Generate a new patch**:
   ```bash
   npx patch-package package-name
   ```
5. **Test the updated patch** thoroughly
