import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzePR} from '../src/analyzer.js';

function createOctokit({files, headSha = 'abc123'}) {
    const getContentCalls = [];
    const octokit = {
        pulls: {
            get: async () => ({
                data: {
                    number: 123,
                    title: 'Translation test',
                    body: '',
                    head: {sha: headSha}
                }
            }),
            listFiles: async () => ({data: files})
        },
        paginate: async fn => {
            const response = await fn();
            return response.data;
        },
        repos: {
            getContent: async ({path, ref}) => {
                getContentCalls.push({path, ref});
                return {
                    data: {
                        content: Buffer.from(JSON.stringify({path, ref}), 'utf8').toString('base64')
                    }
                };
            }
        }
    };
    octokit.getContentCalls = getContentCalls;
    return octokit;
}

test('ignores English source locale files', async () => {
    let anthropicCalled = false;
    const octokit = createOctokit({
        files: [{
            filename: 'ghost/i18n/locales/en/ghost.json',
            status: 'modified',
            patch: '@@ -1,1 +1,2 @@\n {\n+  "New": "New"\n }'
        }]
    });
    const anthropic = {
        messages: {
            create: async () => {
                anthropicCalled = true;
            }
        }
    };

    const review = await analyzePR(123, {
        octokit,
        anthropic,
        owner: 'TryGhost',
        repo: 'Ghost'
    });

    assert.equal(review, null);
    assert.equal(anthropicCalled, false);
});

test('skips the model call when the PR exceeds the per-PR line cap', async () => {
    const lines = [];
    for (let i = 0; i < 600; i++) {
        lines.push(`+  "Key${i}": "Wert${i}"`);
    }
    const patch = `@@ -1,1 +1,${lines.length + 1} @@\n {\n${lines.join('\n')}\n }`;
    let anthropicCalled = false;
    const octokit = createOctokit({
        files: [{
            filename: 'ghost/i18n/locales/de/ghost.json',
            status: 'modified',
            patch
        }]
    });
    const anthropic = {
        messages: {
            create: async () => {
                anthropicCalled = true;
            }
        }
    };

    const review = await analyzePR(123, {
        octokit,
        anthropic,
        owner: 'TryGhost',
        repo: 'Ghost'
    });

    assert.equal(anthropicCalled, false);
    assert.equal(review.verdict, 'skipped');
    assert.equal(review.comments.length, 0);
    assert.ok(review.overall.includes('beyond the automated reviewer'));
    // The model call AND the per-file currentContent fetch should be skipped.
    assert.equal(octokit.getContentCalls.length, 0);
});

test('skips the model call when the PR exceeds the per-PR file cap without fetching per-file contents', async () => {
    const files = [];
    for (let i = 0; i < 20; i++) {
        files.push({
            filename: `ghost/i18n/locales/de/file${i}.json`,
            status: 'modified',
            patch: '@@ -1,1 +1,2 @@\n {\n+  "New": "Neu"\n }'
        });
    }
    let anthropicCalled = false;
    const octokit = createOctokit({files});
    const anthropic = {
        messages: {
            create: async () => {
                anthropicCalled = true;
            }
        }
    };

    const review = await analyzePR(123, {
        octokit,
        anthropic,
        owner: 'TryGhost',
        repo: 'Ghost'
    });

    assert.equal(anthropicCalled, false);
    assert.equal(review.verdict, 'skipped');
    // Neither context.json nor any per-file currentContent should have been fetched.
    assert.equal(octokit.getContentCalls.length, 0);
});

test('downgrades verdict when all model comments are filtered out', async () => {
    const octokit = createOctokit({
        files: [{
            filename: 'ghost/i18n/locales/de/ghost.json',
            status: 'modified',
            patch: '@@ -1,1 +1,2 @@\n {\n+  "New": "Neu"\n }'
        }]
    });
    const anthropic = {
        messages: {
            create: async () => ({
                content: [{
                    type: 'tool_use',
                    name: 'post_translation_review',
                    input: {
                        verdict: 'questions',
                        overall: 'Looks fine after filtering.',
                        comments: [{
                            filename: 'ghost/i18n/locales/de/ghost.json',
                            position: 999,
                            severity: 'question',
                            message: 'Invalid position'
                        }]
                    }
                }],
                usage: null
            })
        }
    };

    const review = await analyzePR(123, {
        octokit,
        anthropic,
        owner: 'TryGhost',
        repo: 'Ghost'
    });

    assert.equal(review.verdict, 'ok');
    assert.deepEqual(review.comments, []);
    assert.equal(review.stats.commentsRaised, 0);
});
