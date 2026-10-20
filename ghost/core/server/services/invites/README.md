# Trial staff invitation limits

Hosts can configure `hostSettings.staffInvites`:

```json
{
  "maxStaff": 10,
  "maxInvites": 15,
  "minIntervalSeconds": 60
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
invitations are checked against the cap. Imports use the same seat guard. Paid-plan role exemptions are unchanged.

The `staff_invite_usage` table holds one `trial` row per site database. Its count
never expires. All roles, authenticated staff, API keys and resends share the
allowance. Deleting staff, revoking invitations, extending the trial, changing
domains and restarting Ghost do not restore it. Removing the policy on upgrade
stops enforcement without deleting the count. Reapplying it does not grant a
fresh allowance. Existing trials start counting at rollout; past sends are not
reconstructed from the current invitation list.

Admission locks this row before checking the standard `MaxLimit` rules. The
email reservation and invitation replacement commit together. Invalid
preparation rolls both back, preserving the original invitation. Mail is sent
after commit. A transport failure retains its reservation because a timeout
cannot establish that the provider did not accept the message. These are
admitted sending attempts, not confirmed deliveries.

## Request rate and errors

The authenticated POST invitation route allows one request per minute across
the entire trial site, regardless of IP, recipient or API key. It uses a
namespaced row in the existing `brute` table with a transaction to serialize
concurrent admissions, including the first requests. Rejected requests do not
extend the wait. Invalid authenticated requests consume the minute, but do not
consume the email allowance. GET and DELETE requests remain unaffected.

The rate limiter returns HTTP 429, `STAFF_INVITE_RATE_LIMIT`, and `Retry-After`.
The staff and email caps use the existing HTTP 403 `HostLimitError` and explain
how to upgrade. Admin shows the explanation and a billing link. Limited resends
POST directly so rejection preserves the existing invitation; older backends
without the policy retain their legacy resend flow.

## Rollout

Deploy the schema migration, Ghost enforcement and matching Admin before
turning on the Daisy/Zuul policy. Backport or upgrade older supported Ghost
versions before enabling it there. Regenerate existing trial configurations,
and verify that the normal upgrade flow regenerates configuration without the
trial policy. No production policy is enabled merely by pushing these branches.
