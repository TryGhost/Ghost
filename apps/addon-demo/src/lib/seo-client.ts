import type {GhBadgeVariant, GhostBridge} from '@tryghost/addon-kit/addon';

/**
 * The demo add-on's client for its own backend + the Ghost Admin API.
 *
 * A "crawl" reads the site's real posts through the Admin API passthrough,
 * derives SEO findings from them (missing excerpts, missing feature images,
 * overlong titles/slugs), and sends the findings to the add-on backend,
 * which owns the score, its history, and the crawl log.
 */

const BACKEND = 'http://localhost:4650';

export type SeoSeverity = 'error' | 'warning' | 'pass';

export interface SeoCheckDetail {
    title: string;
    note: string;
}

export interface SeoCheck {
    id: string;
    label: string;
    severity: SeoSeverity;
    status: string;
    details: SeoCheckDetail[];
}

export interface SeoCrawl {
    at: string;
    score: number;
    postsScanned: number;
}

export interface SeoReport {
    score: number;
    scoreHistory: number[];
    checks: SeoCheck[];
    postsScanned: number;
    lastCrawledAt: string;
    crawls: SeoCrawl[];
}

export const SEVERITY_BADGES: Record<SeoSeverity, GhBadgeVariant> = {
    error: 'destructive',
    warning: 'warning',
    pass: 'success'
};

interface AdminPost {
    title?: string;
    slug?: string;
    custom_excerpt?: string | null;
    feature_image?: string | null;
    status?: string;
}

function check(id: string, label: string, failures: SeoCheckDetail[], options?: {errorAt?: number}): SeoCheck {
    const errorAt = options?.errorAt ?? Infinity;
    const severity: SeoSeverity = failures.length === 0 ? 'pass' : (failures.length >= errorAt ? 'error' : 'warning');
    return {
        id,
        label,
        severity,
        status: failures.length === 0 ? 'Pass' : `${failures.length} ${failures.length === 1 ? 'issue' : 'issues'}`,
        details: failures.slice(0, 5)
    };
}

function deriveChecks(posts: AdminPost[]): SeoCheck[] {
    const titled = (post: AdminPost) => post.title || '(untitled)';

    const missingExcerpt = posts
        .filter(post => !post.custom_excerpt)
        .map(post => ({title: titled(post), note: 'No excerpt to use as a meta description'}));

    const missingImage = posts
        .filter(post => !post.feature_image)
        .map(post => ({title: titled(post), note: 'No feature image for social sharing cards'}));

    const longTitles = posts
        .filter(post => (post.title ?? '').length > 60)
        .map(post => ({title: titled(post), note: `Title is ${post.title!.length} characters — search engines truncate after 60`}));

    const longSlugs = posts
        .filter(post => (post.slug ?? '').length > 45)
        .map(post => ({title: titled(post), note: `Slug is ${post.slug!.length} characters long`}));

    return [
        check('meta-descriptions', 'Meta descriptions', missingExcerpt, {errorAt: 5}),
        check('feature-images', 'Feature images', missingImage),
        check('title-length', 'Title length', longTitles),
        check('slug-length', 'Slug length', longSlugs)
    ];
}

async function backend(ghost: GhostBridge, path: string, init?: {method?: string; headers?: Record<string, string>; body?: string}): Promise<{report: SeoReport | null}> {
    const response = await ghost.fetch(`${BACKEND}${path}`, init);
    if (!response.ok) {
        throw new Error(`SEO backend responded ${response.status}`);
    }
    return await response.json() as {report: SeoReport | null};
}

export async function fetchReport(ghost: GhostBridge): Promise<SeoReport | null> {
    const {report} = await backend(ghost, '/api/report');
    return report;
}

export async function runCrawl(ghost: GhostBridge): Promise<SeoReport> {
    const response = await ghost.fetch('/ghost/api/admin/posts/?limit=50&fields=title,slug,custom_excerpt,feature_image,status');
    if (!response.ok) {
        throw new Error(`Admin API responded ${response.status}`);
    }
    const {posts = []} = await response.json() as {posts?: AdminPost[]};

    const {report} = await backend(ghost, '/api/crawl', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({checks: deriveChecks(posts), postsScanned: posts.length})
    });
    if (!report) {
        throw new Error('SEO backend returned no report');
    }
    return report;
}

export async function clearReport(ghost: GhostBridge): Promise<void> {
    await backend(ghost, '/api/clear', {method: 'POST'});
}

export function timeAgo(iso: string): string {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) {
        return 'just now';
    }
    if (seconds < 3600) {
        return `${Math.round(seconds / 60)}m ago`;
    }
    if (seconds < 86400) {
        return `${Math.round(seconds / 3600)}h ago`;
    }
    return `${Math.round(seconds / 86400)}d ago`;
}

export function openIssueCount(report: SeoReport): number {
    return report.checks.reduce((sum, item) => sum + (item.severity === 'pass' ? 0 : item.details.length), 0);
}

export function scoreDelta(report: SeoReport): {delta: string; direction: 'up' | 'down'} | null {
    const history = report.scoreHistory;
    if (history.length < 2) {
        return null;
    }
    const diff = history[history.length - 1] - history[history.length - 2];
    if (diff === 0) {
        return null;
    }
    return {delta: `${diff > 0 ? '+' : ''}${diff}`, direction: diff > 0 ? 'up' : 'down'};
}
