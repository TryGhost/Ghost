# Staff seat admission

Status: spike. Depends on
[PR #32200](https://github.com/TryGhost/Ghost/pull/32200) for invitation
resends at the paid staff limit.

The paid `staff` limit counts non-Contributor, non-inactive users plus
non-Contributor pending invitations. Three places can add a seat: sending an
invitation, unsuspending a user, and promoting a Contributor. Today only
invitation checks are moving into a transaction with a lock. The other two
still run in `User.permissible`, before the edit and outside any transaction,
so they can race each other and race invitations for the last seat.

This plan gives seat admission one rule, one check, and one lock, without
treating user edits as invitations.

## Contents

1. [Problem](#1-problem)
2. [Target design](#2-target-design)
3. [Callers](#3-callers)
4. [Lock row](#4-lock-row)
5. [Placement](#5-placement)
6. [Rollout](#6-rollout)
7. [Out of scope](#7-out-of-scope)
8. [Testing](#8-testing)

## 1. Problem

| Change                   | Where the limit is checked today    | Safe?                                                                                                                                                             |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send / resend invitation | `InvitationLimiter` after PR #32200 | Yes, once every limited invitation takes the admission lock first                                                                                                 |
| Unsuspend a staff user   | `User.permissible`                  | No. Check runs in the API permission step; the user is saved later with no shared transaction or lock                                                             |
| Promote a Contributor    | `User.permissible`                  | No. Same gap as unsuspend. Also, when the client sends only a role id, `role.name` is undefined, so an unchanged Contributor role can still trigger a limit check |

Unsuspending and promoting are not invitations. They share the seat count with
invitations, so they need the same admission rule and lock, not
`InvitationLimiter`.

## 2. Target design

### One pure rule for what counts as a seat

The staff count query already defines the rule: a user takes a seat if they
are not a Contributor and not `inactive`. A pending invitation takes a seat if
it is not for a Contributor. Every change is then "before" versus "after":

```ts
type SeatHolder = { role: string; status?: string } | null;

function holdsSeat(holder: SeatHolder): boolean {
  return holder !== null && holder.role !== 'Contributor' && holder.status !== 'inactive';
}

export function addsSeat(before: SeatHolder, after: SeatHolder): boolean {
  return !holdsSeat(before) && holdsSeat(after);
}
```

That replaces three hand-written conditions:

- Invitations: create, resend, or promote from Contributor.
- Unsuspend: `inactive` → `active`.
- Promotion: Contributor → another role.

### One place that runs the check

A small `StaffSeats` class takes `limitService` as a dependency:

```ts
async admit(
  transaction: Knex.Transaction,
  before: SeatHolder,
  after: SeatHolder,
): Promise<void> {
  if (this.limitService.isLimited('staff') && addsSeat(before, after)) {
    await this.limitService.errorIfWouldGoOverLimit('staff', {
      transacting: transaction,
    });
  }
}
```

The caller must already hold the admission lock and must have read "before"
with a locking read in the same transaction. `admit` only decides and counts.

### One owner for the lock

Export `lockStaffAdmission(transaction)`. Every caller takes it as the first
query in the transaction, before any plain read. Under MySQL REPEATABLE READ,
the first plain read freezes the snapshot the count uses, so locking first is
what makes the wait and the count agree.

## 3. Callers

### Invitations

`InvitationLimiter.run` keeps its order:

1. Admission lock (`lockStaffAdmission`), when any invitation limit is on.
2. Invitation lock (`findAndLockInvite`), so acceptance or revocation cannot
   change the same invitation under a resend.
3. Already-registered check.
4. Email allowance (`inviteEmails`), which may also lock and update
   `invite_emails_limit_usage`.
5. `allStaff`.
6. `staffSeats.admit(trx, existingInvite, newInvite)`, replacing
   `checkStaffLimit`.

### User edits

Add `UsersService.editUser`, next to the existing `destroyUser`, and call it
from `users.edit.query`. In one transaction:

1. `lockStaffAdmission(trx)`.
2. Load the user with `forUpdate`, including role and status.
3. Work out role and status after the edit. Resolve the role from the
   database, because the client may send an id or an object.
4. `staffSeats.admit(trx, before, after)`.
5. `models.User.edit(data, { ...options, transacting: trx })`.

`User.permissible` keeps only the question of who may make the change. Delete
both `errorIfWouldGoOverLimit('staff')` blocks there.

## 4. Lock row

While only invitations take the lock, reusing `invite_emails_limit_usage`
behind `lockStaffAdmission` is fine. Once user edits share it, locking the
invitation email counter for unsuspend and promotion is the wrong name.

- **For the invitation-only follow-up:** keep the existing row, with a comment
  that says it also serialises seat admission. No migration.
- **When user edits join:** add a dedicated settings row, for example
  `staff_admission_lock`, with no value. Invitations that also have an email
  allowance then lock two rows, always in the same order: the admission lock
  first, then the counter row.

Prefer the dedicated row in the user-edit PR. Do not wait for a third caller.

## 5. Placement

`StaffSeats` holds no boot-owned state. Per the
[services guide](../../ghost/core/server/services/README.md), it does not need
its own service root.

Put the pure helpers and `StaffSeats` in a shared library under
`ghost/core/server/lib/` (for example `staff-seats/`), grouped by this
capability. The invites and users services each construct `StaffSeats` in
their factory and pass in `limitService`.

Do not put user-edit admission inside `invites`, and do not route unsuspend or
promotion through `InvitationLimiter`.

## 6. Rollout

1. **PR #32200** — invitation resends at capacity, invitation-side locking,
   and staff checks in `InvitationLimiter`. Land this first.
2. **Follow-up A** — add `addsSeat`, `StaffSeats`, and `lockStaffAdmission`.
   Move `InvitationLimiter` onto them with no behaviour change. Keep using
   `invite_emails_limit_usage` for the lock.
3. **Follow-up B** — add `UsersService.editUser`, remove the two staff checks
   from `User.permissible`, introduce the dedicated `staff_admission_lock`
   settings row (migration + default), and switch both callers to it. Add
   concurrency tests on MySQL.

## 7. Out of scope

- **Acceptance.** Turning an invitation into a user with the same role never
  adds a seat. It only needs the invitation lock it already takes.
- **Importer.** On staff-limited sites it forces Contributor, so it adds no
  seats.
- **`allStaff` and `inviteEmails`.** Trial limits stay invitation-only. Their
  counters and checks stay in `InvitationLimiter`.

## 8. Testing

Unit-test `addsSeat` for create, resend, Contributor promotion, unsuspend,
inactive Contributor, and no-ops.

On MySQL, under both REPEATABLE READ and READ COMMITTED:

- Unsuspend a user and send an invitation at the same moment for the last
  seat: expect exactly one success, and every rejection a `HostLimitError`.
- Two Contributor promotions at the same moment for the last seat: same
  expectation.
- Staff-only invitations for the last seat (already required by PR #32200):
  same expectation.

SQLite ignores `FOR UPDATE` and serialises writes, so those concurrency tests
are not meaningful there.
