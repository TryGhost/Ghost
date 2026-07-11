/**
 * Walk a unified diff patch (as returned by the GitHub PR `files` API) and
 * pull out every added line.
 *
 * Each entry has:
 *   - position: 1-indexed offset within the patch, counted from the line
 *     after the first `@@` hunk header. This matches GitHub's legacy
 *     `position` field on review comments and serves as a stable ID for
 *     the model to refer to a specific line.
 *   - line: the new-file line number, used as the `line` field when
 *     posting line-level review comments via the Reviews API.
 *   - content: the added text, with the leading `+` stripped.
 *
 * Returns an empty array for renames/binary patches/no patch.
 */
export function extractAddedLines(patch) {
    if (!patch || typeof patch !== 'string') return [];

    const added = [];
    let position = 0;
    let newLine = 0;
    let inHunk = false;

    for (const line of patch.split('\n')) {
        if (line.startsWith('@@')) {
            const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (!match) continue;
            newLine = parseInt(match[1], 10) - 1;
            if (inHunk) position++; // count subsequent hunk headers
            inHunk = true;
            continue;
        }

        if (!inHunk) continue;
        position++;

        if (line.startsWith('+') && !line.startsWith('+++')) {
            newLine++;
            added.push({
                position,
                line: newLine,
                content: line.slice(1)
            });
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            // deletion — new-file line number does not advance
        } else {
            // context (leading space) or `\ No newline at end of file` marker
            if (!line.startsWith('\\')) newLine++;
        }
    }

    return added;
}
