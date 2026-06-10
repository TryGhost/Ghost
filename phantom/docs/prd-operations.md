# Ghost v10 Operations PRD (Data, Jobs, Email Pipeline)

## Purpose
Define acceptance criteria for operational behaviors, data portability, and
background jobs aligned with the v10 architecture (`architecture.md`).

## Scope
- Export and import pipelines, migrations, and settings integrity.
- URL service behavior for routing-based URLs.
- Outbox processing, update checks, and token cleanup jobs.
- Email analytics pipeline, suppression, and welcome email handling.
- Managed email domain warming and sender address rules.
- Metrics exposure via the Prometheus-format metrics client.

## Non-goals
- ActivityPub features and UI flows.
- Admin settings UX (covered in `prd-admin-settings.md`).
- Core publishing UX (covered in `prd.md`).

## Operational requirements

### 1) Data export and import
- [ ] Exporter outputs expected table sets with current Ghost version metadata.
  - Sensitive settings and non-portable tables are excluded.
- [ ] Importer supports legacy export formats (v1/v2/v5/legacy).
  - Invalid mobiledoc structures are normalized to empty content.
  - HTML-only content converts to mobiledoc/lexical.
  - Missing content produces a default lexical structure.
- [ ] Legacy amp/comment fields map to current equivalents during import.
- [ ] Every table restructured away from current Ghost has a fixture-based
  importer test proving conversion from a real Ghost export (this pays for
  each divergence; see `domainmodel.md` migration mapping).

### 2) Migrations and schema utilities
These requirements govern v10's own schema lifecycle: versioned, reversible
SQL migrations ("previous minor" means v10 releases). Legacy-Ghost data
import is covered by section 1.
- [ ] Migrations can rollback to the previous minor and re-apply cleanly.
- [ ] Migration execution is idempotent when rerun.
- [ ] Default fixtures populate roles, permissions, and baseline content.
- [ ] Nullable migration utilities toggle nullability safely.
  - Foreign key checks can be disabled when required.
  - Column defaults are preserved across migrations.

### 3) Settings integrity
- [ ] Core settings allowlist is enforced for the `core` group.
- [ ] New non-core settings require group/flag migrations.

### 4) URL service
- [ ] URL generators resolve resource URLs from routing rules.
- [ ] Tags/authors with no public content return 404 URLs.
- [ ] Subdirectory configurations include the base path in URLs.

### 5) Email analytics events and suppression
- [ ] Mailgun events update delivered/opened/failed timestamps.
  - Permanent failures create failure records with codes and timestamps.
  - Temporary failures are tracked without marking recipients failed.
- [ ] Complaint events generate member suppression and spam events.
- [ ] Unsubscribe events remove members from the relevant newsletter only.
- [ ] Unknown or invalid events are ignored safely.
- [ ] Suppression list updates trigger on permanent failures (605/607) and
  complaint events.

### 6) Member welcome workflows and outbox
Welcome emails are drip sequences on the automation workflow engine (see
`prd.md` section 20), not standalone automated emails.
- [ ] MemberCreatedEvent outbox entries trigger member-origin signup
  workflows.
- [ ] Imported or admin-created members do not trigger signup workflows.
- [ ] Workflow email steps send only when the step's template is active.
  - Missing/inactive templates leave workflow runs pending with error
    messages.

### 7) Email sending and batching
- [ ] Batch sending creates recipients and batches with unique members.
- [ ] Content segmentation splits paid/free batches when content differs.
- [ ] Batch size honors provider limits and target delivery windows.
- [ ] Retry logic prevents concurrent job duplication and supports re-send.
- [ ] Link tracking and outbound tagging respect settings toggles.
- [ ] Comment CTA and subscription detail blocks respect newsletter settings and
  comment availability.
- [ ] Replacement tokens for member names resolve with and without fallbacks.

### 8) Managed email domain warming
- [ ] Warmup limits ramp custom-domain sends over time.
- [ ] Same-day sends do not increase warmup limits.
- [ ] Warmup respects fallback domain configuration and caps by total recipients.

### 9) Email address resolution
- [ ] Sender and reply-to addresses follow managed email and self-hosted rules.
- [ ] Support addresses are used when allowed by sending domain.
- [ ] Newsletter sender names default to site title when unset.

### 10) Jobs and maintenance
- [ ] Outbox processing handles pending entries, deletes on success, and retries
  on failure.
- [ ] Non-pending outbox entries are ignored.
- [ ] Update-check job calls the configured update endpoint.
- [ ] Token cleanup removes single-use tokens older than 24 hours.

### 11) Metrics
- [ ] Prometheus-format metrics output is exposed only when enabled.
- [ ] Metrics client instance is reused across module imports when enabled.
