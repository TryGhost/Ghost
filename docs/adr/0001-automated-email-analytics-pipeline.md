# Use a separate pipeline for automated email analytics

## Status
Proposed

## Context

Newsletter email analytics currently fetches Mailgun events, writes recipient state, and recalculates aggregates from the full `email_recipients` table. That aggregate-from-history approach is expensive on large sites, and adding automation events to the same job path would increase contention and lag in a path that already has performance problems.

## Decision

Automated email analytics will use a separate Mailgun-tagged pipeline, keyed by the `automation-email` tag, with independent job cursors from newsletter analytics. The automation pipeline will share fetch orchestration where useful, but it will use its own event processor for `automated_email_recipients` and incremental aggregation for automation stats.

For v1, the automation send path owns `sent_count`, while the automation analytics jobs process delivered and opened Mailgun events only. Counters are stored on `automation_action_revisions`, and member automation email counters stay separate from newsletter member email counters.

## Consequences

This keeps automation analytics isolated from newsletter analytics lag and gives us a lower-risk place to validate incremental aggregation before considering a newsletter analytics refactor. It also means we will maintain two analytics pipelines for now, but the duplication is intentional: the product write models and aggregate strategies differ.
