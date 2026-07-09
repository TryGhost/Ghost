import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {
    GhBadge,
    GhButton,
    GhInline,
    GhSeparator,
    GhSparkline,
    GhStack,
    GhStat,
    GhTab,
    GhTabs,
    GhText,
    type GhostBridge
} from '@tryghost/addon-kit/addon';
import {
    SEVERITY_BADGES,
    clearReport,
    fetchReport,
    runCrawl,
    scoreDelta,
    timeAgo,
    type SeoReport
} from './lib/seo-client.ts';

/**
 * Demo full-page view mounted at #/apps/seo-assistant-demo/*. Host-owned
 * sub-routing (the wildcard remainder arrives as ghost.data.context.path)
 * over a report backed by real Admin API data and the add-on backend.
 */

const SECTIONS: Record<string, string> = {
    '/': 'Overview',
    '/issues': 'Issues',
    '/crawls': 'Crawl history'
};

interface PageProps {
    ghost: GhostBridge;
    initialReport: SeoReport | null;
}

function Overview({report}: {report: SeoReport}) {
    const delta = scoreDelta(report);
    const errors = report.checks.filter(item => item.severity === 'error').length;
    const warnings = report.checks.filter(item => item.severity === 'warning').length;
    const passed = report.checks.filter(item => item.severity === 'pass').length;

    return (
        <GhStack gap="lg">
            <GhInline gap="lg">
                <GhStat delta={delta?.delta} deltaDirection={delta?.direction} label="SEO score" value={String(report.score)} />
                <GhStat label="Errors" value={String(errors)} />
                <GhStat label="Warnings" value={String(warnings)} />
                <GhStat label="Checks passed" value={String(passed)} />
            </GhInline>
            <GhSparkline color="blue" label="SEO score" points={report.scoreHistory} />
            <GhText tone="muted">Last crawled {timeAgo(report.lastCrawledAt)} · {report.postsScanned} posts scanned</GhText>
        </GhStack>
    );
}

function Issues({report}: {report: SeoReport}) {
    const flagged = report.checks.filter(item => item.severity !== 'pass');

    if (flagged.length === 0) {
        return <GhText tone="muted">No issues found — every check passed on the last crawl.</GhText>;
    }

    return (
        <GhStack gap="lg">
            {flagged.map(item => (
                <GhStack key={item.id} gap="sm">
                    <GhInline gap="sm" justify="between">
                        <GhText weight="semibold">{item.label}</GhText>
                        <GhBadge variant={SEVERITY_BADGES[item.severity]}>{item.status}</GhBadge>
                    </GhInline>
                    {item.details.map(detail => (
                        <GhStack key={detail.title} gap="sm">
                            <GhText weight="medium">{detail.title}</GhText>
                            <GhText tone="muted">{detail.note}</GhText>
                            <GhSeparator />
                        </GhStack>
                    ))}
                </GhStack>
            ))}
        </GhStack>
    );
}

function CrawlHistory({report}: {report: SeoReport}) {
    return (
        <GhStack gap="sm">
            {[...report.crawls].reverse().map(crawl => (
                <GhStack key={crawl.at} gap="sm">
                    <GhInline gap="sm" justify="between">
                        <GhText weight="medium">{timeAgo(crawl.at)}</GhText>
                        <GhText tone="muted">score {crawl.score}/100 · {crawl.postsScanned} posts</GhText>
                    </GhInline>
                    <GhSeparator />
                </GhStack>
            ))}
        </GhStack>
    );
}

function Page({ghost, initialReport}: PageProps) {
    const [report, setReport] = useState(initialReport);
    const [path, setPath] = useState(String(ghost.data.context.path ?? '/'));
    const [busy, setBusy] = useState(false);

    useEffect(() => ghost.onDataChange(data => setPath(String(data.context.path ?? '/'))), [ghost]);

    const crawl = async () => {
        setBusy(true);
        try {
            const next = await runCrawl(ghost);
            setReport(next);
            await ghost.toast.show(`Crawl complete — score ${next.score}/100`, {type: 'success'});
        } catch (error) {
            await ghost.toast.show(`Crawl failed: ${String(error)}`, {type: 'error'});
        } finally {
            setBusy(false);
        }
    };

    const clear = async () => {
        setBusy(true);
        try {
            await clearReport(ghost);
            setReport(null);
            await ghost.toast.show('Report cleared');
        } catch (error) {
            await ghost.toast.show(`Clearing failed: ${String(error)}`, {type: 'error'});
        } finally {
            setBusy(false);
        }
    };

    if (!report) {
        return (
            <GhStack gap="md">
                <GhText weight="semibold">No SEO report yet</GhText>
                <GhText tone="muted">Crawl your site to check meta descriptions, feature images, titles and slugs across your posts.</GhText>
                <GhButton disabled={busy} onPress={crawl}>Run first crawl</GhButton>
            </GhStack>
        );
    }

    const section = SECTIONS[path] ? path : '/';

    return (
        <GhStack gap="lg">
            <GhTabs
                value={section}
                onChange={event => void ghost.navigate(`/apps/seo-assistant-demo${event.detail === '/' ? '' : event.detail}`)}
            >
                {Object.entries(SECTIONS).map(([sectionPath, label]) => (
                    <GhTab key={sectionPath} value={sectionPath}>{label}</GhTab>
                ))}
            </GhTabs>
            {section === '/' && <Overview report={report} />}
            {section === '/issues' && <Issues report={report} />}
            {section === '/crawls' && <CrawlHistory report={report} />}
            <GhSeparator />
            <GhInline gap="sm">
                <GhButton disabled={busy} onPress={crawl}>Re-crawl site</GhButton>
                <GhButton disabled={busy} variant="destructive" onPress={clear}>Clear report</GhButton>
            </GhInline>
        </GhStack>
    );
}

export default async (ghost: GhostBridge) => {
    const initialReport = await fetchReport(ghost).catch(() => null);
    render(<Page ghost={ghost} initialReport={initialReport} />, document.body);
};
