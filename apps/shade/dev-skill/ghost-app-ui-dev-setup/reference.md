# Setup reference

Commands and file contents for the steps in [`SKILL.md`](SKILL.md).
`<checkout>` is the Ghost checkout; run everything else in the app folder.

## Start Storybook (step 3)

Detached, so it outlives the chat, with its log in the system temp folder:

```sh
(cd <checkout>/apps/shade && nohup pnpm storybook --no-open > "${TMPDIR:-/tmp}/shade-storybook.log" 2>&1 &)
```

Stop it later with `lsof -ti tcp:6006 | xargs kill`.

## Pack the app SDK (step 6)

Its own version is the literal `private`, which npm rejects, so the tarball
gets a stamped version.

```sh
(cd <checkout> && pnpm nx build @tryghost/app-sdk)   # builds its contracts too
work="$(mktemp -d)"
(cd <checkout>/packages/app-sdk && pnpm pack --pack-destination "$work")
tar -xzf "$work"/*.tgz -C "$work"
node -e '
  const fs = require("fs");
  const [file, version] = process.argv.slice(1);
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.version = version;
  delete pkg.private;
  const unresolved = Object.entries({...pkg.dependencies, ...pkg.peerDependencies})
    .filter(([, range]) => /^(catalog|workspace):/.test(range));
  if (unresolved.length) { console.error("Unresolved:", unresolved); process.exit(1); }
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
' "$work/package/package.json" "0.0.1-alpha.local.$(date +%Y%m%d%H%M%S)"
mkdir -p vendor
# COPYFILE_DISABLE keeps macOS tar from adding ._* files.
COPYFILE_DISABLE=1 tar -czf vendor/tryghost-app-sdk.tgz -C "$work" package
rm -rf "$work"
```

Check npm installs it, in a throwaway project outside the folder. It passes when
`npm ls` shows `@quilted/threads` under `@tryghost/app-sdk` and exits 0.

```sh
here="$PWD" check="$(mktemp -d)"
(cd "$check" && npm init -y > /dev/null && npm install --no-audit --no-fund "$here/vendor/tryghost-app-sdk.tgz" && npm ls @quilted/threads)
rm -rf "$check"
```

## `AGENTS.md` (step 7)

The `## Shade` section is the one `build-ghost-app-ui` adds, with its
`Shade docs:` line pointing at the local Storybook, so that skill finds it in
place and keeps it.

```markdown
## Shade

Before building or changing a screen, use the `build-ghost-app-ui` skill.
Shade docs: http://localhost:6006

## App SDK

`@tryghost/app-sdk` isn't on npm yet. Install it from
`./vendor/tryghost-app-sdk.tgz`.
```

## `.claude/settings.json` (step 8)

`<checkout>` is absolute, after the `//`. A `Read` deny also blocks edits there.

```json
{
  "permissions": {
    "deny": [
      "Read(//<checkout>/**)",
      "mcp__claude-in-chrome__*",
      "mcp__Claude_Browser__*",
      "mcp__computer-use__*"
    ]
  }
}
```
