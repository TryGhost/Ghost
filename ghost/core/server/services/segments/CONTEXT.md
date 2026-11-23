# Segments

Segments covers named filters over members, which Admin's members list shows as saved member views.

## Language

**Segment**:
A named NQL filter that selects members, listed in the order it was saved.
_Avoid_: Saved member view, when talking about the server

**Saved member view**:
How a segment is stored for now: an entry in the `shared_views` setting with the route `members` and a non-empty `filter.filter`. The same setting holds the posts list's saved views, which aren't segments.

**Segment id**:
The first 24 hex characters of the SHA-256 hash of the segment's filter, because a saved member view has no stored id. `settings-repository.ts` defines it, including the rule for views that share a filter. Callers treat it as opaque.

**Segment repository**:
Where segments are stored, behind the `SegmentRepository` interface. `SettingsSegmentRepository` stores them as saved member views; it rejects a name or a new segment's filter that another segment has. The service root is the one place that knows segments are stored in a setting.

**Segments table**:
The table segments are moving to. For now it is a copy: every change through this service is written to it in the same transaction as the saved member views, and nothing reads it. A name is unique in the table as the database's collation compares names, so a change that would give two segments names the database counts as the same, such as "Cafe" and "Café", is rejected. A name longer than the column holds is cut to fit.

## Concurrent writes

Each write through this service locks the `shared_views` row, so writes through the service never overwrite each other. A `PUT /settings/` that sends `shared_views` doesn't go through this service yet: it writes the whole value without the lock, so it can overwrite a segment added a moment earlier.

## Changes

Each command reports one change: `SegmentAdded`, `SegmentRenamed` or `SegmentDeleted`, with the whole segment before and after. The service root records each one in History as an edit of the `shared_views` setting, named after the setting's key, and refreshes the settings cache from the database shortly after the transaction commits, so `GET /settings/` can return the previous value for a moment. A rename to the name a segment already has changes nothing and reports nothing.

## Not this

`email_batches.member_segment`, `email_segment` and the `data-gh-segment` attribute are an older, unrelated use of the word: they choose which members see parts of an email.
