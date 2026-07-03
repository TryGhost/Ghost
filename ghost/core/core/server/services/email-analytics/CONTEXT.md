# Email Analytics

Email Analytics tracks provider events for Ghost-sent emails and turns them into recipient state and reporting metrics. It covers both newsletter analytics and automation email analytics.

## Language

**Analytics Pipeline**:
A processing lane that fetches provider events for one email surface and applies them to that surface's recipient state and reporting metrics.
_Avoid_: Worker, job path

**Provider Event**:
An event reported by the email provider for a sent email, such as an opened or delivered event.
_Avoid_: Mailgun row, webhook record

**Recipient Event State**:
The stored state on a recipient row showing which provider events have already been applied for that recipient.
_Avoid_: Raw event history, event log

**Automation Action Revision Stats**:
Reporting counters attached to an immutable automation action revision.
_Avoid_: Automation stats, action stats

**Member Automation Email Stats**:
Member-level counters and rates for automation emails, kept separate from newsletter member email stats.
_Avoid_: Member email stats, combined email stats
