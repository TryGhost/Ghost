# Newsletter Email Sending

Newsletter Email Sending covers the preparation and submission of newsletter emails to the configured email provider.

## Language

**Sending status**:
The current progress of preparing a newsletter email and submitting its batches to the configured email provider. It is separate from any later provider-reported outcome.
_Avoid_: Delivery status, provider outcome

**Preparing**:
The sending status covering both waiting for sending work to begin and creating the newsletter email's recipient batches.
_Avoid_: Pending, queued

**Sending progress**:
The completed and expected recipient counts for the current sending phase. Its expected count may be corrected while preparing and is final once submitting begins.
_Avoid_: Delivery progress

**Submitted**:
Every batch of a newsletter email has been accepted by the configured email provider. Submission does not mean that recipients have received the email.
_Avoid_: Sent, delivered

**Failed during**:
The preparing or submitting phase in which newsletter email sending stopped. It gives meaning to the frozen progress of a failed send.
_Avoid_: Failure step

## Sending status API

`GET /ghost/api/admin/emails/:id/status` exposes sending status independently
from the email resource. The endpoint is always available; Admin decides whether
to poll it while a send is active.

The first implementation calculates progress on read from email batches and
their recipient counts. Its rough ETA uses a rolling window of batch creation
times while preparing and terminal batch update times while submitting. It
returns no estimate until at least two current-attempt batches have completed.
