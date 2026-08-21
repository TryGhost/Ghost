import {render} from 'preact';
import {useState} from 'preact/hooks';
import {
    GhBadge,
    GhButton,
    GhInline,
    GhSeparator,
    GhSparkline,
    GhStack,
    GhStat,
    GhText,
    type GhostBridge
} from '@tryghost/addon-kit/addon';
import {
    SEVERITY_BADGES,
    fetchReport,
    openIssueCount,
    runCrawl,
    scoreDelta,
    timeAgo,
    type SeoReport
} from './lib/seo-client.ts';

/**
 * Demo dashboard card: an SEO health summary backed by real data. A crawl
 * reads the site's posts through the Admin API passthrough and stores the
 * derived findings on the add-on backend, which owns the score history.
 */

interface CardProps {
    ghost: GhostBridge;
    initialReport: SeoReport | null;
}

function Card({ghost, initialReport}: CardProps) {
    const [report, setReport] = useState(initialReport);
    const [busy, setBusy] = useState(false);

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

    if (!report) {
        return (
            <GhStack gap="md">
                <GhText weight="semibold">No SEO report yet</GhText>
                <GhText tone="muted">Crawl your site to check meta descriptions, feature images, titles and slugs.</GhText>
                <GhButton disabled={busy} onPress={crawl}>Run first crawl</GhButton>
            </GhStack>
        );
    }

    const delta = scoreDelta(report);

    return (
        <GhStack gap="md">
            <GhInline gap="lg">
                <GhStat
                    delta={delta?.delta}
                    deltaDirection={delta?.direction}
                    label="SEO score"
                    value={String(report.score)}
                />
                <GhStat label="Open issues" value={String(openIssueCount(report))} />
                <GhStat label="Posts scanned" value={String(report.postsScanned)} />
            </GhInline>
            <GhSparkline color="blue" label="SEO score" points={report.scoreHistory} />
            <GhSeparator />
            <GhStack gap="sm">
                {report.checks.map(item => (
                    <GhInline key={item.id} gap="sm" justify="between">
                        <GhText>{item.label}</GhText>
                        <GhBadge variant={SEVERITY_BADGES[item.severity]}>{item.status}</GhBadge>
                    </GhInline>
                ))}
            </GhStack>
            <GhSeparator />
            <GhText tone="muted">Last crawled {timeAgo(report.lastCrawledAt)} · {report.postsScanned} posts scanned</GhText>
            <GhInline gap="sm">
                <GhButton disabled={busy} onPress={crawl}>Recompute score</GhButton>
                <GhButton variant="secondary" onPress={() => void ghost.navigate('/apps/seo-assistant-demo')}>
                    Open full report
                </GhButton>
            </GhInline>
        </GhStack>
    );
}

export default async (ghost: GhostBridge) => {
    // Loaded before first paint: the host shell shows its skeleton meanwhile.
    const initialReport = await fetchReport(ghost).catch(() => null);
    render(<Card ghost={ghost} initialReport={initialReport} />, document.body);
};
