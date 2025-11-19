# Database migrations

# Why might I need a migration?

Database migrations exist to transform the state of Ghost’s MySQL database upon boot. 

Sometimes we need to: 

- add a table
- add a column to a table
- add some new user permissions
- or manipulate some data, etc

> **Migrations are dangerous and need to be treated with a great deal of care.** It's the one place we can really fuck things up for a lot of people.
> 

# Migration steps

## Planning

Migrations should be **carefully planned and written** as one of the first steps in feature development to allow more time for the feedback loop during the review process. 

They shouldn’t be rushed because mistakes will result.

The tech spec created at the start of a cycle should detail what new tables and columns are needed, and ensure we follow existing best practices for naming. Writing a migration should be a simple case of copying the spec into code and we should be clear on what the schema is expected to look like when doing this.

If your migration needs to edit data, ensure we’re clear on what the data looks like in terms of size and format by utilizing tools we have, like the Stats-Service.

## Writing

You can create a boilerplate file for a migration using Slimer (this is preinstalled using `gstenv`):

```bash
cd ghost/core
slimer migration <description-of-purpose>
```

The resulting file is placed into a folder of the next minor version. We only include and run new migrations during minor releases.

**Steps for writing a new migration would look something like this:**

1. run `slimer migration add-column-totable` for example
2. new migration file will be generated in `migrations/versions` subfolder
3. update the migration file with changes you want to do in database manually
    1. check out old versions to get a better understanding how to update the file
4. run migration `yarn knex-migrator migrate` (make sure to read **iterating** section )
5. update `shema.js` definition file, to make sure it aligns with latest changes
6. update tests
    1. update integrity tests, that make sure schema is not updated by accident
    2. update other tests

Make sure to check out examples link below for more details.

### Type of migrations

Depending on the type of migration, we’d expect to see two types of content in migration PRs:

- DDL (data definition language) migrations: these change the database schema
    - an update to the `schema.js` definition file
    - a migration to take existing databases to that new state
    - new tables added to the export list
    - an updated schema test hash which is a reminder to never update the schema without a migration
- DML (data manipulation language) migrations: these modify data contained in the tables
    - just the migration to edit the data

## Iterating

You can run migrations during development with Ghost [custom knex migrator](https://github.com/TryGhost/knex-migrator) using `yarn knex-migrator migrate` (which calls migration `up()` methods) followed by `yarn knex-migrator rollback` (which calls migration `down()` methods) to undo the previous migration.

As long as your `down()` method returns your database to the same state as before the `up()` you can use this to iterate on migrations during development.

## Testing

We should test migrations on **both MySQL and SQLite**. 

Sometimes [Knex](https://knexjs.org/) does not do what you expect.

CI on Ghost contains a test to ensure idempotency, but a simple test for idempotency once you've written and run a migration is to remove the corresponding line from the `migrations` table and start Ghost. It should start with a warning.

## Reviewing

There are three primary concerns when reviewing migrations

- **Correctness** - does the migrations do what we want it to do?
- **Performance** - does it do it in a timely manner?
- **Safety** - does it protect against invalid data?

1. **All migrations must be submitted as a PR.** PRs containing migrations should contain as few changes as possible - just enough for the tests to pass (and Ghost to not break when the PR is merged).
2. PRs containing migrations will have a comment added with [a checklist](https://github.com/TryGhost/Ghost/blob/main/.github/workflows/migration-review.yml) for the reviewer to follow.
3. **All migrations must be reviewed by another member of the Product team** to check for issues.
4. All migrations should be reviewed against the Tech Spec for the pitch.
5. If you’re not **100% sure** your migration meets the [Performance](https://www.notion.so/Database-migrations-eb5b78c435d741d2b34a582d57c24253?pvs=21) criteria, you need to speak to the DevOps team.
    1. As an example, **adding a table** is low impact performance wise, so in most cases would not need a review from the Pro team. It should however be reviewed by your Product team colleagues to ensure it meets the needs of the Tech Spec.
    2. Conversely, **adding new columns and manipulating data** on existing tables, especially if affecting many rows, could be impactful on Ghost(Pro) performance. Review the [rules](https://www.notion.so/Database-migrations-eb5b78c435d741d2b34a582d57c24253?pvs=21) and reach out to the Pro team for assistance or review where necessary.

## Examples

The best approach if you’re not sure where to start is to go and find another migration that does something similar, and copy it. Examples of good migration PRs include:

- Adding a table: https://github.com/TryGhost/Ghost/pull/16150/files
- Adding new columns and populating with data: https://github.com/TryGhost/Ghost/pull/15855/files
- Adding a new setting: https://github.com/TryGhost/Ghost/pull/15705/files
- Manipulating data: https://github.com/TryGhost/Ghost/pull/15952/files

Once you’re done, you should open a pull request on the Ghost repo for [review](https://www.notion.so/Database-migrations-eb5b78c435d741d2b34a582d57c24253?pvs=21).

# Rules

### Performance

Certain migrations, such as those that add columns or affect indexes on large tables (posts, members, emails, any sort of action or event table) need to be very carefully considered in terms of performance.

Ghost(Pro) has hard limits in terms of timeouts for containers to boot, and given migrations are blocking upon boot, we shouldn’t exceed those limits.

Limits:

- The total time to run all migrations in a minor release **shouldn't exceed 30s** on production. This is to give us headroom for major-version migrations and compounding minor migrations as part of a major update
- Adding or dropping columns on big tables (`posts`) needs `algorithm=copy` added, otherwise it’ll take 100x longer to complete on Pro. Most utils already have this in place.
- We can make (carefully considered) changes to *most* tables until we reach an upper limit on Pro:
    
    
    |  | Row count |
    | --- | --- |
    | Posts | 150,000 |
    | Emails (email_recipients) | 500,000 (already exceeded) |
- Migrations should be tested against our [scalability targets](https://www.notion.so/Scale-6178272efd994ffe96a5a3a616e772e5?pvs=21)
- The hard limit for site startup including migrations on Pro is 90 seconds, increased to 18 minutes for major-version updates

If you're not sure if we can run a migration on Ghost(Pro), check with the DevOps team.

### Idempotency

It must be safe to run the migration twice. Whilst not ideal, sometimes Ghost doesn’t finish executing a migration due to external factors, and we can’t leave the database in some odd middle state.

### Be minimal

No-one likes to read a long PR, and mistakes slip by if you have to review a long migration PR. They should contain just the migration code ***unless*** that breaks something.

### Be defensive

Protect against missing data. If a migration crashes, Ghost cannot boot.

### Log a message on every code path

If we have to debug a migration, we need to know what it actually did. Without logging, that’s impossible, so ensure all code paths and early-returns contain logging.

### Don’t use the model layer

Migrations are written for a specific version, and when they use the model layer, the assumption is that they are using the models at that version. In reality the models are of the version which is being migrated to, not from. This means that breaking changes in the models, whilst they can be handled in the API - are still breaking changes in migrations.

Also see https://github.com/TryGhost/Team/issues/295

### Using utilities

Wherever possible, use the [utilities](https://github.com/TryGhost/Ghost/tree/main/ghost/core/core/server/data/migrations/utils) we have. If a utility for a common action doesn’t exist, speak to the DevOps team. We should avoid long migrations with duplicate code from another migration unless there’s a good reason.

### Immutable

> Once migrations are in `main`, they're final (except in *very* limited circumstances). Create a new migration instead.
> 

We don't change migrations that land in `main` unless it's to fix a bug or a performance issue. With continuous delivery in mind, altering migrations leaves us with sites that are in multiple different states, and disrupts engineers working on `main` because they have to recreate their database manually in order to apply later migrations. Removing a migration after it’s run leaves the database in a broken state because `knex-migrator` can't handle the extra row in the `migrations` table.

For example: if we want to rename a column after a migration hits `main` but before a release, we should noop the original migration, and add two migrations to correct the database state: one to add the correct column, and one to drop the old one if it exists. (e.g. this PR: https://github.com/TryGhost/Ghost/pull/14264)

### Versioning

Migrations must allow us to maintain our version update policy (i.e. you can always update from the last patch in any major stream).