# Working with Test Data

Ghost includes a data generator for building repeatable local datasets. Use it
instead of copying data from a real publication.

## Reset the Development Site

From the repository root, run:

```bash
pnpm reset:data
```

This clears generated data from the Docker development database, preserves the
owner account, and creates 1,000 members and 100 posts using a fixed seed.

Other prepared datasets are available:

```bash
pnpm reset:data:empty
pnpm reset:data:xxl
```

`reset:data:empty` keeps the owner but generates no members or posts.
`reset:data:xxl` creates two million members for testing behaviour at scale.

These commands are destructive and require the Docker development environment
to be running. Do not point the generator at a database containing data you
need to keep. Restart `pnpm dev` after resetting data so running processes do
not retain state from the old dataset.

## Generate a Custom Dataset

Run the generator inside the development container when the prepared datasets
do not cover the scenario:

```bash
docker exec ghost-dev bash -c \
  'cd /home/ghost/ghost/core && node index.js generate-data \
  --clear-database --quantities members:10000,posts:500 --seed 123'
```

The generator supports:

- `--clear-database` to clear the tables being generated while preserving the
  owner account;
- `--tables=members:10000,posts:500` to generate only named tables and their
  dependencies, with optional quantities;
- `--with-default` to add the other default tables when using `--tables`;
- `--quantities=members:10000,posts:500` to override quantities without
  changing which default tables are generated;
- `--base-data-pack=/path/to/data.json` to import compatible newsletters,
  posts, tags, products, settings, and custom theme settings before generating
  the remaining tables. Importing a base pack replaces the existing settings;
- `--seed=123` to make generated values repeatable. Timestamps can still move
  so that generated content remains current;
- `--print-dependencies` to show the table dependency order without importing.

Use `--tables` for a narrow dataset and `--quantities` when the relationships
from the full default dataset matter. The generator adds required table
dependencies automatically and rejects unknown table names.

For the implementation and instructions for adding an importer, see the
[data generator README](../../ghost/core/core/server/data/seeders/README.md).
