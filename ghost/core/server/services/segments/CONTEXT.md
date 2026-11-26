# Segments

Segments covers named filters over members, which Admin's members list shows as saved member views.

## Language

**Segment**:
A named NQL filter that selects members, listed in the site's order of segments.
_Avoid_: Saved member view, when talking about the server

**Saved member view**:
What Admin's members list calls a segment. Segments were first stored as entries of the `shared_views` setting, which the posts list's saved views still use. A migration moved them to the `segments` table, and the service no longer reads or writes the setting: a member view written to it through the settings API is not a segment.

**Segment id**:
An ObjectID the segment is given when it is added, as the rows of Ghost's other tables have. Callers treat it as opaque. A saved member view in the setting had no stored id, so the API made one from the view's filter; the migration gave each moved view a new id.

**Segment slug**:
A readable name, such as `all-paid` for "All paid", which names the segment in a members filter without quotes. The caller that adds a segment can give its slug, which is used when a filter can name a segment by it and no other segment has it, and rejected otherwise. Without one, the server mints it from the segment's name. A rename keeps it, and nothing changes it: an edit can give back only the segment's own slug. No two segments have the same slug, and a deleted segment's slug can be given to a segment added later.

**Segment in a filter**:
A members filter names a segment by its slug with the `segment` key: `segment:all-paid` selects the segment's members, `segment:[all-paid,engaged]` the members of any of them, and `segment:[all-paid+engaged]` the members of all of them. `segment:-all-paid` and `segment:-[all-paid,engaged]` leave them out, which keeps every member the segment doesn't select, including a member with no value in a field the segment tests. It combines with every other condition, as in `segment:all-paid,status:paid`, and can sit inside a negated group. A slug needs no quotes but can have them, and its case doesn't matter. A segment's id doesn't name it. A text value that is no segment's slug, such as a quoted id, is rejected with a 422 as a segment that doesn't exist, and a value that isn't text is a 400 invalid segment filter: the filter parser reads an unquoted value made only of digits as a number, and `null`, `true` and `false` as themselves. The members model's first filter step reads the segments a filter names, so whoever runs a members query, resolving its filter reads them from the segments table, in the query's transaction when there is one, and replaces each `segment` statement with the segment's own filter. That happens before the caller's checks on the filter, such as the Admin API's restricted-field check, so they see each segment's filter. A segment that doesn't exist is rejected rather than ignored, and a segment's own filter can't name another segment. A post's visibility and an email's recipient filter can't name a segment yet: access is checked in memory against one member, and an email's filter runs when the email is sent, with segments that may have changed since. While the memberSegments flag is off, a filter that names a segment is rejected. A server without segments in filters rejects the `segment` key as an unknown column, so a filter that names one never selects more members there.

## Storage

Segments are rows of the `segments` table, in the order of the table's sortable collection. The service reads and writes the table itself, with Knex. It rejects a name another segment has. Two segments can have the same filter under different names.

A segment's filter has to be valid NQL when the segment is saved with it: the parser that reads every members filter has to be able to read it. Its keys aren't checked against the members' fields. A segment is checked when it is added and when an edit gives a filter other than its own, and an import leaves out a segment whose filter fails and reports it. A stored segment isn't checked when it is read, so one whose filter fails keeps loading and listing, and an edit can give its filter back unchanged: a segment saved before the check can have one, and so can a saved member view the migration moved to the table. Such a filter fails only when a members query uses the segment.

## Order

Every list of segments is in the site's order. A segment is added after the others, and a reorder puts them all in a new order, given as every segment's id in the order wanted. A reorder that leaves a segment out, names one twice or names one that doesn't exist was made from an out-of-date list, and is rejected without changing anything. A reorder changes only the order, so no segment's `updated_at` moves, and anyone who can edit a segment can reorder them.

## Slugs

A segment's slug is minted from its name as a custom field's key is (`server/lib/slug.ts`), with a hyphen between words where a key has an underscore: the name is transliterated to ASCII and lowercased, invisible characters and apostrophes are dropped, and each run of other characters becomes one hyphen, with none at either end. The result is cut to leave room for a number within the column. A minted slug is one the filter parser reads back as itself when a members filter holds it without quotes, as `segment:<slug>`, and the parser decides that: a name that mints something the parser reads as something else, such as `2024` (a number), `null`, `true` or `now-1d` (a date), gets `segment-` in front, and a name that mints nothing, such as a name of emoji, gets `segment`. When another segment has the slug, the new segment gets `-2`, `-3` and so on. A stored slug, a slug a request gives and a slug a filter names are checked for their format only, so a change to the filter parser can't make a stored segment unreadable.

A slug a caller gives is held to the same rules: its format, and the filter parser reading it back. An import gives each segment the slug it had on the site it was exported from, when that is in a slug's format, and adds the segment again without one, for the service to mint, when the service rejects it. A segment the import added earlier can be minted the slug a later segment of the file had, and that later segment then gets a minted slug too. The migration that mints a slug for each segment stored before segments had slugs carries its own copy of the minting, so that a later change to the service's minting doesn't change what the migration does.

## Times

A segment has the time it was added, `created_at`, and the time it was last edited, `updated_at`. An add writes one time to both, so a segment has been edited when `updated_at` is later than `created_at`. Both are stored to the second in UTC, and a command returns them as a read of the segment would. An edit that leaves a segment's name and filter as they are writes nothing, so its times stay as they were. A segment the migration moved from the saved views setting has the time the migration ran, as the setting held no time for a view, and a 6.80 migration gave each segment that had never been renamed its `created_at` as its `updated_at`. An import adds each segment through the same command as any other, so an imported segment is created at the time of the import and hasn't been edited, whatever times the file holds.

## Names

A name is taken when another segment has it by either of two rules. The first ignores case and surrounding whitespace, and is the same on every database. The second is the table's unique index, which compares by the database's collation: MySQL's default collation also ignores accents, so "Café" is rejected when "Cafe" exists.

## Concurrent writes

No lock keeps writers apart. The table's unique indexes reject a name or a slug another request takes at the same time, and the database's error names the index. A name taken that way rejects the segment, and so does a slug the caller gave. A minted slug taken that way is skipped, and the segment is added under the next one, so segments added at the same time whose names mint the same slug are all added. Segments added at the same moment can get the same position, and are then listed in the order of the table's tie-break.

## Changes

Each command reports one change: `SegmentAdded`, `SegmentEdited` or `SegmentDeleted`, with the whole segment before and after. An edit can change the name, the filter or both, and leaves out what it doesn't give, so a change of filter can't undo a rename made since the caller read the segment. The service root records each change in History as an action on the segment (added, edited or deleted), with the segment's name. An edit records one action for each thing it changed: a rename is an edit with the previous name, and a change of filter is an edit with the action name `conditions_changed`. A reorder reports nothing, so History doesn't record it: the order is a visual preference, and dragging segments around would fill History with entries. Changes made while segments were stored in the `shared_views` setting were recorded as edits of that setting, and those entries stay as they are. An edit that leaves the name and the filter as they are changes nothing and reports nothing.

## Not this

`email_batches.member_segment`, `email_segment` and the `data-gh-segment` attribute are an older, unrelated use of the word: they choose which members see parts of an email.
