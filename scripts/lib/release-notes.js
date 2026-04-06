#!/usr/bin/env node
'use strict';

const {execSync} = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const REPO_URL = 'https://github.com/TryGhost/Ghost';

// Emoji priority order (lowest index = lowest priority, sorted descending)
const EMOJI_ORDER = ['💡', '🐛', '🎨', '💄', '✨', '🔒'];

// User-facing emojis — only these are included in release notes
const USER_FACING_EMOJIS = new Set(EMOJI_ORDER);

function getCommitLog(fromTag, toTag) {
    const range = `${fromTag}..${toTag}`;
    const format = '* %s - %an';
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

    return log.split('\n').map(line => line.trim());
}

function extractLeadingEmoji(line) {
    // Line format: * <message> - <author>
    const match = line.match(/^\* (.)/u);
    return match ? match[1] : '';
}

function filterAndSortByEmoji(lines) {
    const emojiLines = lines.filter((line) => {
        const emoji = extractLeadingEmoji(line);
        return USER_FACING_EMOJIS.has(emoji);
    });

    emojiLines.sort((a, b) => {
        const emojiA = extractLeadingEmoji(a);
        const emojiB = extractLeadingEmoji(b);
        const indexA = EMOJI_ORDER.indexOf(emojiA);
        const indexB = EMOJI_ORDER.indexOf(emojiB);
        return indexB - indexA;
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
