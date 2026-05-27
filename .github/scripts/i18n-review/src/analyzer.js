import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractAddedLines} from './diff.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.join(__dirname, '..', 'prompt.md');
// Matches per-locale translation files (`ghost/i18n/locales/<locale>/<namespace>.json`)
// but deliberately excludes English source files and `context.json`, because
// the reviewer validates translations from English rather than source copy.
const I18N_PATH_PATTERN = /^ghost\/i18n\/locales\/(?!en\/)[^/]+\/[^/]+\.json$/;
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
// Abuse / cost guards. A normal translation PR touches one locale and adds a
// handful of strings; well past that is either a bulk regeneration that a
// human should review, or someone trying to burn API budget. When exceeded we
// skip the model call and post a short notice instead.
const MAX_FILES = 15;
const MAX_ADDED_LINES = 500;

const REVIEW_TOOL = {
    name: 'post_translation_review',
    description: 'Submit the translation review with per-line inline comments and an overall verdict.',
    input_schema: {
        type: 'object',
        properties: {
            verdict: {
                type: 'string',
                enum: ['ok', 'questions'],
                description: '"ok" if you have no concerns. "questions" if you have at least one comment to raise.'
            },
            overall: {
                type: 'string',
                description: 'A short, warm one-paragraph note to the translator. Do not repeat anything raised as an inline comment. Finish with "Thank you!" translated into the target language.'
            },
            comments: {
                type: 'array',
                description: 'Inline comments on specific changed lines. Empty array if verdict is "ok".',
                items: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'The locale file the comment applies to.'
                        },
                        position: {
                            type: 'integer',
                            description: 'The diff position from the list provided in the user message.'
                        },
                        severity: {
                            type: 'string',
                            enum: ['suggestion', 'question', 'error']
                        },
                        message: {
                            type: 'string',
                            description: 'The comment text, in English, polite and deferential.'
                        }
                    },
                    required: ['filename', 'position', 'severity', 'message']
                }
            }
        },
        required: ['verdict', 'overall', 'comments']
    }
};

export async function analyzePR(prNumber, {octokit, anthropic, owner, repo, model = DEFAULT_MODEL}) {
    const {data: pr} = await octokit.pulls.get({owner, repo, pull_number: prNumber});
    console.log(`PR #${prNumber}: ${pr.title}`);

    const files = await octokit.paginate(octokit.pulls.listFiles, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100
    });
    const i18nFiles = files.filter(f => I18N_PATH_PATTERN.test(f.filename));

    if (i18nFiles.length === 0) {
        console.log('No translation files changed. Nothing to review.');
        return null;
    }
    console.log(`Found ${i18nFiles.length} i18n file(s) to review.`);

    // Short-circuit on raw file count before any network call. Patch contents
    // for the diff are already on the listFiles response, so we can also
    // compute the added-line count without any further fetches.
    if (i18nFiles.length > MAX_FILES) {
        console.log(`PR exceeds file cap (files=${i18nFiles.length}/${MAX_FILES}). Skipping model call.`);
        return buildSkippedReview({pr, filesCount: i18nFiles.length, linesCount: 0, reason: 'files'});
    }

    const eligibleFiles = [];
    const lineLookup = new Map();
    const validKeys = new Set();
    for (const file of i18nFiles) {
        if (file.status === 'removed') continue;
        if (!file.patch) {
            console.warn(`No patch available for ${file.filename} (likely too large) — skipping.`);
            continue;
        }
        const addedLines = extractAddedLines(file.patch);
        if (addedLines.length === 0) continue;
        for (const l of addedLines) {
            const key = `${file.filename}:${l.position}`;
            validKeys.add(key);
            lineLookup.set(key, l.line);
        }
        eligibleFiles.push({file, addedLines});
    }

    if (eligibleFiles.length === 0) {
        console.log('No added translation lines found. Nothing to review.');
        return null;
    }

    if (validKeys.size > MAX_ADDED_LINES) {
        console.log(`PR exceeds line cap (lines=${validKeys.size}/${MAX_ADDED_LINES}). Skipping model call.`);
        return buildSkippedReview({pr, filesCount: eligibleFiles.length, linesCount: validKeys.size, reason: 'lines'});
    }

    // Both caps passed — now make the network calls we need for the review.
    const contextJson = await fetchFile(octokit, owner, repo, 'ghost/i18n/locales/context.json', 'main');
    const fileChanges = [];
    for (const {file, addedLines} of eligibleFiles) {
        const currentContent = await fetchFile(octokit, owner, repo, file.filename, pr.head.sha);
        fileChanges.push({filename: file.filename, addedLines, currentContent});
    }

    const systemPrompt = await fs.readFile(PROMPT_PATH, 'utf8');
    const userMessage = buildUserMessage(pr, contextJson, fileChanges);

    if (process.env.DEBUG === 'true') {
        console.error('=== USER MESSAGE ===');
        console.error(userMessage);
        console.error('====================');
    }

    console.log(`Calling ${model} (${fileChanges.length} files, ${validKeys.size} added lines)...`);
    const response = await anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: [REVIEW_TOOL],
        tool_choice: {type: 'tool', name: 'post_translation_review'},
        messages: [{role: 'user', content: userMessage}]
    });

    const toolUse = response.content.find(c => c.type === 'tool_use' && c.name === 'post_translation_review');
    if (!toolUse || !toolUse.input || typeof toolUse.input !== 'object') {
        throw new Error('Claude did not return a valid post_translation_review tool call.');
    }

    const review = toolUse.input;
    const rawComments = Array.isArray(review.comments) ? review.comments : [];
    const validComments = rawComments
        .filter(c => {
            const key = `${c.filename}:${c.position}`;
            if (!validKeys.has(key)) {
                console.warn(`Dropping comment with invalid (filename, position): ${key}`);
                return false;
            }
            return true;
        })
        .map(c => ({...c, line: lineLookup.get(`${c.filename}:${c.position}`)}));

    const verdict = validComments.length > 0 ? 'questions' : 'ok';

    return {
        prNumber: pr.number,
        prTitle: pr.title,
        headSha: pr.head.sha,
        verdict,
        overall: typeof review.overall === 'string' ? review.overall : '',
        comments: validComments,
        stats: {
            filesReviewed: fileChanges.length,
            linesReviewed: validKeys.size,
            commentsRaised: validComments.length
        },
        usage: response.usage || null
    };
}

function buildSkippedReview({pr, filesCount, linesCount, reason}) {
    const overall = reason === 'files'
        ? `This PR touches ${filesCount} translation file${filesCount === 1 ? '' : 's'}, which is beyond the automated reviewer's per-PR limit (max ${MAX_FILES} files / ${MAX_ADDED_LINES} lines). A maintainer should review the translations manually.`
        : `This PR adds ${linesCount} translation line${linesCount === 1 ? '' : 's'}, which is beyond the automated reviewer's per-PR limit (max ${MAX_FILES} files / ${MAX_ADDED_LINES} lines). A maintainer should review the translations manually.`;
    return {
        prNumber: pr.number,
        prTitle: pr.title,
        headSha: pr.head.sha,
        verdict: 'skipped',
        overall,
        comments: [],
        stats: {
            filesReviewed: filesCount,
            linesReviewed: linesCount,
            commentsRaised: 0
        },
        usage: null
    };
}

function buildUserMessage(pr, contextJson, fileChanges) {
    const sections = [];
    sections.push(`PR title: ${pr.title}`);
    if (pr.body && pr.body.trim()) {
        sections.push(`PR description:\n${pr.body.trim()}`);
    }
    if (contextJson) {
        sections.push(`Translator context (\`ghost/i18n/locales/context.json\`):\n\`\`\`json\n${contextJson}\n\`\`\``);
    }
    for (const fc of fileChanges) {
        const parts = [`## File: \`${fc.filename}\``];
        if (fc.currentContent) {
            parts.push(`Current file content (for tone/consistency context):\n\`\`\`json\n${fc.currentContent}\n\`\`\``);
        }
        parts.push('Added or changed lines (review only these):');
        for (const l of fc.addedLines) {
            parts.push(`- position=${l.position}: ${l.content}`);
        }
        sections.push(parts.join('\n\n'));
    }
    sections.push('When you call `post_translation_review`, reference each inline comment by its exact `filename` and `position` from the list above.');
    return sections.join('\n\n');
}

async function fetchFile(octokit, owner, repo, filepath, ref) {
    try {
        const {data} = await octokit.repos.getContent({owner, repo, path: filepath, ref});
        if (Array.isArray(data) || !data.content) return null;
        return Buffer.from(data.content, 'base64').toString('utf8');
    } catch (err) {
        console.warn(`Could not fetch ${filepath}@${ref}: ${err.message}`);
        return null;
    }
}
