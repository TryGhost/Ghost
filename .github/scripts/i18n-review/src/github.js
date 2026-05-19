const BOT_MARKER = '<!-- i18n-review-bot -->';

export async function postDraftReview({octokit, owner, repo, prNumber, review}) {
    await replaceExistingDraft({octokit, owner, repo, prNumber});

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
        body,
        comments
        // No `event` => draft (PENDING) review. Human submits or dismisses.
    });

    console.log(`Posted draft review: verdict=${review.verdict}, comments=${review.comments.length}`);
}

async function replaceExistingDraft({octokit, owner, repo, prNumber}) {
    const reviews = await octokit.paginate(octokit.pulls.listReviews, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100
    });
    const ownDraft = reviews.find(r => r.state === 'PENDING' && r.body && r.body.includes(BOT_MARKER));
    if (!ownDraft) return;
    console.log(`Replacing existing bot draft review (id=${ownDraft.id}).`);
    await octokit.pulls.deletePendingReview({
        owner,
        repo,
        pull_number: prNumber,
        review_id: ownDraft.id
    });
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
        '<sub>Draft review by `i18n-review-bot`. A maintainer should submit, dismiss, or edit before merge — the bot does not approve PRs on its own. Translator expertise wins where there is doubt.</sub>',
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
