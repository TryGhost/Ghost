# Newsletter Email Sending

Newsletter Email Sending covers the preparation and submission of newsletter emails to the configured email provider.

## Language

**Sending status**:
The state of a newsletter email's send: preparing, submitting, submitted, or failed. It is separate from any later provider-reported outcome.
_Avoid_: Delivery status, provider outcome

**Sending phase**:
The open part of a send that progress and failures are reported against: preparing or submitting.
_Avoid_: Step, stage

**Preparing**:
The sending phase while none of a newsletter email's recipient batches has started submitting, including before any sending work has begun.
_Avoid_: Pending, queued

**Submitting**:
The sending phase once at least one recipient batch has started submitting to the configured email provider and the outcome is still open.
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
