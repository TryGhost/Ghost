#!/usr/bin/env node
'use strict';

const {execSync} = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const REPO_URL = 'https://github.com/TryGhost/Ghost';

// Emoji priority order (highest first) — matches Ghost's release convention
const EMOJI_ORDER = ['💡', '🐛', '🎨', '💄', '✨', '🔒'];

// Matches an emoji at the start of a string (covers most multi-byte emoji)
const LEADING_EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;

function getCommitLog(fromTag, toTag) {
    const range = `${fromTag}..${toTag}`;
    const format = `* [%h](${REPO_URL}/commit/%h) %s - %an`;
    const cmd = `git log --no-merges --pretty=tformat:'${format}' ${range}`;

    let log;
    try {
        log = execSync(cmd, {cwd: ROOT, encoding: 'utf8'}).trim();
    } catch {
        return [];
    }

    if (!log) {
        return [];
    }

    // Strip PR number references like (#1234)
    return log.split('\n').map(line => line.replaceAll(/\(#\d+\)/g, '').trim());
}

function extractCommitMessage(line) {
    // Line format: * [hash](url) <message> - <author>
    const match = line.match(/\* \[[^\]]+\]\([^)]+\) (.+) - .+$/);
    return match ? match[1].trim() : '';
}

function filterAndSortByEmoji(lines) {
    const emojiLines = lines.filter((line) => {
        const msg = extractCommitMessage(line);
        return LEADING_EMOJI_RE.test(msg);
    });

    emojiLines.sort((a, b) => {
        const msgA = extractCommitMessage(a);
        const msgB = extractCommitMessage(b);
        const emojiA = (msgA.match(LEADING_EMOJI_RE) || [''])[0];
        const emojiB = (msgB.match(LEADING_EMOJI_RE) || [''])[0];
        const indexA = EMOJI_ORDER.indexOf(emojiA);
        const indexB = EMOJI_ORDER.indexOf(emojiB);
        // Unknown emojis sort last; lower index = higher priority
        const orderA = indexA === -1 ? Infinity : indexA;
        const orderB = indexB === -1 ? Infinity : indexB;
        return orderA - orderB;
    });

    return emojiLines;
}

function generateReleaseNotes(fromTag, toTag) {
    const lines = getCommitLog(fromTag, toTag);
    const filtered = filterAndSortByEmoji(lines);

    let body;
    if (filtered.length === 0) {
        body = 'This release contains fixes for minor bugs and issues reported by Ghost users.';
    } else {
        // Deduplicate (preserving order)
        body = [...new Set(filtered)].join('\n');
    }

    body += `\n\n---\n\nView the changelog for full details: ${REPO_URL}/compare/${fromTag}...${toTag}`;

    return body;
}

// CLI: node release-notes.js <from-tag> <to-tag>
if (require.main === module) {
    const [fromTag, toTag] = process.argv.slice(2);

    if (!fromTag || !toTag) {
        console.error('Usage: node release-notes.js <from-tag> <to-tag>');
        process.exit(1);
    }

    process.stdout.write(generateReleaseNotes(fromTag, toTag));
}

module.exports = {generateReleaseNotes};
