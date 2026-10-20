# Staff invitation limits

Hosts can configure `hostSettings.staffInvites`:

```json
{
  "maxPerDay": 10,
  "cooldownSeconds": 300
}
```

Omitting the entire setting leaves invitations unrestricted. Omitting `maxPerDay`
retains only the recipient cooldown. The host decides which sites receive the
policy; Ghost does not infer subscription or verification status.

The allowance is per site and UTC calendar day. All roles, authenticated staff,
API integrations, and resends share it. Cooldowns use the trimmed, lowercased
recipient address, regardless of who initiates the invitation.

The limiter uses namespaced rows in the existing `brute` table. A site row
serializes concurrent admission; allowance updates and invitation replacement
commit in the same transaction. Recipient keys are hashes, and expiry timestamps
are compatible with the existing brute-store cleanup. Revoking an invitation,
changing its role, or restarting Ghost does not reset its allowance.

Mail is sent after the transaction commits. Failed preparation rolls back the
reservation and preserves the old invitation. A transport failure retains the
reservation: a timeout cannot prove the provider did not accept the email.
These are limits on admitted send attempts, not a delivery count.

Rate limits return HTTP 429 with `STAFF_INVITE_COOLDOWN` or
`STAFF_INVITE_DAILY_LIMIT` and a message explaining when to retry. When the host
configures this policy, Admin resends through POST directly, preserving the
original invitation if blocked. Admin retains its legacy resend flow when the
setting is absent, for compatibility with older backends.
