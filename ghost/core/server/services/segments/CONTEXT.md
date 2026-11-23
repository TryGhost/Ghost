# Segments

Segments covers named filters over members, which Admin's members list shows as saved member views.

## Language

**Segment**:
A named NQL filter that selects members, listed in the order it was saved.
_Avoid_: Saved member view, when talking about the server

**Saved member view**:
What Admin's members list calls a segment. Segments were first stored as entries of the `shared_views` setting, which the posts list's saved views still use. A migration moved them to the `segments` table, and the service no longer reads or writes the setting: a member view written to it through the settings API is not a segment.

**Segment id**:
An ObjectID the segment is given when it is added, as the rows of Ghost's other tables have. Callers treat it as opaque. A saved member view in the setting had no stored id, so the API made one from the view's filter; the migration gave each moved view a new id.

**Segment repository**:
Where segments are stored, behind the `SegmentRepository` interface. `TableSegmentRepository` stores them as rows of the `segments` table, in the order of the table's sortable collection. It rejects a name another segment has. Two segments can have the same filter under different names.

## Names

A name is taken when another segment has it by either of two rules. The first ignores case and surrounding whitespace, and is the same on every database. The second is the table's unique index, which compares by the database's collation: MySQL's default collation also ignores accents, so "Café" is rejected when "Cafe" exists.

## Concurrent writes

No lock keeps writers apart. The table's unique index rejects a name another request takes at the same time. Segments added at the same moment can get the same position, and are then listed in the order of the table's tie-break.

## Changes

Each command reports one change: `SegmentAdded`, `SegmentRenamed` or `SegmentDeleted`, with the whole segment before and after. The service root records each one in History as an action on the segment (added, edited or deleted), with the segment's name. Changes made while segments were stored in the `shared_views` setting were recorded as edits of that setting, and those entries stay as they are. A rename to the name a segment already has changes nothing and reports nothing.

## Not this

`email_batches.member_segment`, `email_segment` and the `data-gh-segment` attribute are an older, unrelated use of the word: they choose which members see parts of an email.
