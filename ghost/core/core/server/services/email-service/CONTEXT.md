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
Every batch of a newsletter email has completed submission: the provider accepted its valid recipients, or validation explicitly excluded every recipient without a provider call. Submission does not mean that recipients have received the email.
_Avoid_: Sent, delivered

**Failed**:
Sending stopped with an error and will not continue without a retry.
_Avoid_: Bounced, rejected

**Failed during**:
The sending phase a failed newsletter email was in when sending stopped.
_Avoid_: Failure step

**Candidate recipient**:
A member selected for a newsletter email's audience before preparation exclusions. Selection does not mean the member has been prepared or submitted.
_Avoid_: Subscriber count, delivered recipient

**Prepared recipient**:
A candidate whose address and personalization data have been recorded for a newsletter email. Preparation does not mean submission or delivery.
_Avoid_: Candidate recipient, delivered recipient

**Preparation exclusion**:
A candidate omitted from preparation because the member can no longer be found or required recipient data is missing. Candidates equal prepared recipients plus preparation exclusions.
_Avoid_: Failed delivery, silently skipped recipient

**Accounted email**:
A newsletter email whose candidate audience, prepared recipients, and exclusions are verified against one another.
_Avoid_: Delivered email, reconciled delivery

**Frozen preparation**:
The verified recipient membership retained for subsequent attempts to submit the same newsletter email.
_Avoid_: Live audience, refreshed audience

**Recovered batch**:
A previously committed batch identified and verified after the outcome of its creation was uncertain.
_Avoid_: Rebuilt batch, resent batch
