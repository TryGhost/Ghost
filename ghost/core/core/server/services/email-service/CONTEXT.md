# Newsletter Email Sending

Newsletter Email Sending covers the preparation and submission of newsletter emails to the configured email provider.

## Language

**Sending status**:
The state of a newsletter email's send: preparing, submitting, submitted, or failed. It is separate from any later provider-reported outcome.
_Avoid_: Delivery status, provider outcome

**Sending phase**:
The part of a send, before it is submitted or fails, that progress and failures are reported against: preparing or submitting.
_Avoid_: Step, stage

**Preparing**:
The sending phase while none of a newsletter email's recipient batches has started submitting, including before any sending work has begun.
_Avoid_: Pending, queued

**Submitting**:
The sending phase once at least one recipient batch has started submitting to the configured email provider and the send has not yet been submitted or failed.
_Avoid_: Sending, delivering

**Sending progress**:
The completed and total recipient counts for the current sending phase.
_Avoid_: Delivery progress, expected count

**Submitted**:
Every batch of a newsletter email has been accepted by the configured email provider. Submission does not mean that recipients have received the email.
_Avoid_: Sent, delivered

**Failed**:
Sending stopped with an error and will not continue without a retry.
_Avoid_: Bounced, rejected

**Failed during**:
The sending phase a failed newsletter email was in when sending stopped.
_Avoid_: Failure step

**Candidate recipient**:
A member consumed by the audience sweep, counted once before a page is split into batches. The lookahead row is not consumed until its own page.

**Preparation exclusion**:
A candidate omitted because required recipient data is missing. Candidates equal persisted recipients plus preparation exclusions.

**Accounted email**:
An email created with `preflight_email_count` present, including zero, using the verified preparation protocol. A legacy email has a null preflight count and retains historical behavior.

**Frozen preparation**:
The verified batch membership established by `prepared_at`. Retries reuse this membership; an incomplete preparation is discarded and rebuilt.

**Recovered batch**:
A batch found after a creation error whose stable ID, metadata, and exact recipient data match the original operation. Recovery avoids inserting the same intended batch again.
