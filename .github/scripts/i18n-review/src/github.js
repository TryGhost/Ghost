const BOT_MARKER = '<!-- i18n-review-bot -->';

export async function postReview({octokit, owner, repo, prNumber, review}) {
    const body = formatReviewBody(review);
    const comments = review.comments.map(c => ({
        path: c.filename,
        line: c.line,
        side: 'RIGHT',
        body: formatCommentBody(c)
    }));

    await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: review.headSha,
        event: 'COMMENT',
        body,
        comments
    });

    console.log(`Posted advisory review: verdict=${review.verdict}, comments=${review.comments.length}`);
}

function formatReviewBody(review) {
    const {comments, stats, overall, verdict} = review;
    const verdictLine = verdict === 'ok'
        ? '✅ **Looks good** — no concerns flagged'
        : `⚠️ **Has questions** — ${comments.length} inline comment${comments.length === 1 ? '' : 's'}`;

    const lines = [
        '### 🌐 Automated translation review',
        '',
        `**Verdict:** ${verdictLine}`,
        '',
        `Reviewed ${stats.linesReviewed} translation${stats.linesReviewed === 1 ? '' : 's'} across ${stats.filesReviewed} file${stats.filesReviewed === 1 ? '' : 's'}.`
    ];

    if (overall && overall.trim()) {
        lines.push('', overall.trim());
    }

    lines.push(
        '',
        '---',
        '<sub>Advisory review by `i18n-review-bot`. Non-blocking — a maintainer still owns the merge decision, and the bot cannot approve PRs on its own. Translator expertise wins where there is doubt.</sub>',
        BOT_MARKER
    );
    return lines.join('\n');
}

function formatCommentBody(c) {
    const icon = c.severity === 'error' ? '❌'
        : c.severity === 'question' ? '❓'
            : '💡';
    return `${icon} ${c.message}\n\n<sub>Automated suggestion — verify against your judgement as a native speaker.</sub>`;
}
