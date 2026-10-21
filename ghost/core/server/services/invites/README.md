# Trial staff invitation limits

Hosts can configure `hostSettings.staffInvites`:

```json
{
  "maxStaff": 10,
  "maxInvites": 15,
  "maxRequests": 3,
  "rateWindowSeconds": 60
}
```

Daisy enables this policy for every trial, including email-verified trials. Zuul
passes it to Ghost. Omitting it leaves the normal paid-plan staff checks in
place, without a trial invitation quota or rate limit. Self-hosted installations
are unaffected unless their host enables it.

## Staff seats and email allowance

The trial staff cap counts the owner, all other users (including Contributors
and suspended users), and pending invitations. Resending an existing invitation
uses the same seat. Existing sites above the cap retain their staff; subsequent
invitations are checked against the cap. Content imports bypass the seat guard to preserve author attribution, but imported users count toward subsequent invitations. Paid-plan role exemptions are unchanged.

The existing `actions` audit log is the durable allowance: each
`resource_type = 'invite', event = 'added'` entry consumes one invitation.
Resending replaces the invitation and records another creation. All roles,
authenticated staff and API keys share the allowance. Deleting staff, revoking
invitations, extending the trial, changing domains and restarting Ghost do not
remove those entries. Upgrading stops enforcement without deleting history;
reapplying the policy does not grant a fresh allowance.

Existing invitation audit entries count immediately on rollout, including
entries for invitations that no longer exist. This conservatively counts all
recorded invitation creations, including any earlier paid period, rather than
using a moving date window. Historical audit failures cannot be reconstructed.
Audit entries record creation attempts, not confirmed delivery.

Admission locks the existing `brute` request-limiter row before checking the
standard `MaxLimit` rules. The query returns at most `maxInvites` matching entries,
without counting the entire log or parsing JSON. It uses the existing schema
without adding or forcing an index. `LIMIT` bounds the results, not the rows
scanned: large histories with few invitation creations can require more work.
The invitation model makes only trial invitation creation audit
writes mandatory and transactional; the shared best-effort audit logger and
other events remain unchanged. The audit reservation and invitation replacement
commit together. Invalid preparation or audit failure rolls both back,
preserving the original invitation. Mail is sent after commit. A transport
failure retains its reservation because a timeout cannot establish that the
provider did not accept the message.

## Request rate and errors

The POST invitation endpoint allows a burst of three requests per minute across
the entire trial site, regardless of IP, recipient or API key. It uses a
namespaced row in the existing `brute` table with a transaction to serialize
concurrent admissions, including the first requests. Rejected requests do not
extend the wait. Validation and permission checks run before rate admission, so requests rejected there do not consume burst capacity. Later model validation errors still consume a request. Failures after admission still consume a request, but only recorded invitation creations consume the email allowance. Expiring or cleaning rate-limit rows cannot reset
the audit history. GET and DELETE requests remain unaffected.

The rate limiter returns HTTP 429, `STAFF_INVITE_RATE_LIMIT`, and `Retry-After`.
The staff and email caps use the existing HTTP 403 `HostLimitError` and explain
how to upgrade. Admin shows the explanation and a billing link. Limited resends
POST directly so rejection preserves the existing invitation; older backends
without the policy retain their legacy resend flow.

## Rollout

Deploy Ghost enforcement and matching Admin before
turning on the Daisy/Zuul policy. Backport or upgrade older supported Ghost
versions before enabling it there. Regenerate existing trial configurations,
and verify that the normal upgrade flow regenerates configuration without the
trial policy. No production policy is enabled merely by pushing these branches.

No database migration is required. Check the query with `EXPLAIN ANALYZE` on
representative large histories before rollout, including histories with few
invitation creations, and measure transaction duration and lock contention.
Audit retention must preserve invitation creation entries while a site's trial
allowance can be enforced; pruning them would restore allowance.
