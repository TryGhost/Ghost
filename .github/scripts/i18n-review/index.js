#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import {Octokit} from '@octokit/rest';
import {analyzePR} from './src/analyzer.js';
import {postReview} from './src/github.js';

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required env var: ${name}`);
        process.exit(1);
    }
    return value;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const prArg = args.find(a => !a.startsWith('-'));
    const prNumber = parseInt(prArg, 10);
    if (!Number.isFinite(prNumber) || prNumber <= 0) {
        console.error('Usage: node index.js <pr-number> [--dry-run]');
        process.exit(1);
    }

    const githubToken = requireEnv('GITHUB_TOKEN');
    const anthropicKey = requireEnv('ANTHROPIC_API_KEY');
    const owner = requireEnv('GITHUB_OWNER');
    const repo = requireEnv('GITHUB_REPO');
    const model = process.env.ANTHROPIC_MODEL || undefined;

    const octokit = new Octokit({auth: githubToken});
    const anthropic = new Anthropic({apiKey: anthropicKey});

    const review = await analyzePR(prNumber, {octokit, anthropic, owner, repo, model});
    if (!review) {
        console.log('Nothing to review — exiting cleanly.');
        return;
    }

    console.log(`Review summary: verdict=${review.verdict}, comments=${review.stats.commentsRaised}, lines=${review.stats.linesReviewed}, files=${review.stats.filesReviewed}`);
    if (review.usage) {
        console.log(`Token usage: input=${review.usage.input_tokens}, output=${review.usage.output_tokens}`);
    }

    if (dryRun) {
        console.log('--dry-run: skipping review posting. Payload:');
        console.log(JSON.stringify(review, null, 2));
        return;
    }

    await postReview({octokit, owner, repo, prNumber, review});
}

main().catch(err => {
    console.error('i18n-review failed:', err.stack || err.message);
    process.exit(1);
});
