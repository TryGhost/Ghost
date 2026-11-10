# Why a new field type starts behind a flag

## Admin, Ghost and Portal ship at different times

Admin on Ghost(Pro) goes live as soon as a commit is merged. Ghost(Pro) servers roll out on
weekdays, so a server can be a day or more behind the Admin talking to it. Portal goes out to a
CDN as soon as it changes, and every site on its version line loads it, self-hosted sites
included. Self-hosted sites get Admin and Ghost together in the weekly release, whenever they
upgrade. This package is published to npm with that release, and integrations upgrade it when
they choose.

So no moment comes when every piece knows about a new type at once. If Admin offered a type as
soon as its code was merged, a publisher could set up a field of it and be refused on saving,
by a server that hadn't caught up.

## Only creating a field is held back

A type's flag decides one thing: whether a field of the type can be created. While it is off,
Ghost refuses to create one, whoever asks, and Admin doesn't offer the type anywhere a field is
created: Settings, the members import and checkout settings. Admin's forms for creating a field
only take a list of types that has been through that check, so a new place that creates fields
can't offer a type the site can't create either.

Nothing else needs a flag. While no field of a type can exist, the code that stores, exports,
filters, edits and shows its values never runs for a customer, so it can be merged a piece at
a time without guards. If the flag is switched off after fields have been created, those
fields keep working, and only new ones can't be made.

## Admin follows the server's flag

Admin reads flags from the Ghost it talks to, so the two agree on whether a type is offered.
That holds only if the flag is switched on once every server has the type's code. The remote
flags service accepts a flag a server doesn't know, which is what lets a flag be set ahead of a
deploy, so switching one on early would make Admin offer the type to a server that can't store
it. That is why releasing a type waits for the rollout.

## A type without a flag is released

`FIELD_TYPE_FLAGS` lists only the types still in development, so releasing a type is removing
its entry. That also means a type added without an entry is released straight away, so giving it
a flag is the first step in adding one.

## A released type doesn't change

Once publishers can create fields of a type, what it is composed of is fixed. Ghost reads
stored values by the type's layout, and integrations built with an older version of this
package talk to newer sites. A type can still change while its flag is off on every customer's
site. Once the flag is switched on for them, new structure is a new type, as the package
README's Compatibility section says.

## What a flag doesn't hold back

- **Migrations.** A column a type needs reaches every site in the release that has it, whatever
  the flag says. Settle the columns before merging, as a change afterwards is another
  migration.
- **This package.** The type is listed from the package's next release on npm, before sites
  offer it. An integration offers inputs for the fields a site has, so it meets the type only
  once a site has a field of it.
- **Portal.** Its input for the type, and the input's translations, go live on the CDN when
  merged. They stay unused until a field of the type exists.
