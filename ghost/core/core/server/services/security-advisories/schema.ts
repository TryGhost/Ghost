import {z} from 'zod';

// GitHub adds fields to GHSA payloads regularly; `.passthrough()` keeps
// validation forward-compatible. Only the fields we depend on are explicit.
// Reference: docs.github.com/en/rest/security-advisories/repository-advisories

export const AdvisorySeverity = z.enum(['low', 'moderate', 'high', 'critical']);
export type AdvisorySeverity = z.infer<typeof AdvisorySeverity>;

export const AdvisoryState = z.enum(['triage', 'draft', 'published', 'closed', 'withdrawn']);
export type AdvisoryState = z.infer<typeof AdvisoryState>;

export const AdvisoryVulnerability = z.object({
    package: z.object({
        ecosystem: z.string(),
        name: z.string()
    }).passthrough(),
    vulnerable_version_range: z.string(),
    patched_versions: z.string().nullable()
}).passthrough();

export const AdvisoryEvent = z.object({
    ghsa_id: z.string(),
    cve_id: z.string().nullable(),
    summary: z.string(),
    severity: AdvisorySeverity,
    html_url: z.string().url(),
    state: AdvisoryState,
    published_at: z.string().nullable(),
    updated_at: z.string(),
    vulnerabilities: z.array(AdvisoryVulnerability)
}).passthrough();

export type AdvisoryEvent = z.infer<typeof AdvisoryEvent>;

export const AdvisoryListResponse = z.array(AdvisoryEvent);
