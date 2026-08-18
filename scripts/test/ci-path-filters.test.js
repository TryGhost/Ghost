import {describe, it} from 'node:test';
import assert from 'node:assert';
import {readFile} from 'node:fs/promises';
import yaml from 'js-yaml';

async function getFilterPatterns(filterName) {
    const workflow = yaml.load(await readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'));
    const filterStep = workflow.jobs.job_setup.steps.find(step => step.id === 'changed');
    const filters = yaml.load(filterStep.with.filters);

    return filters[filterName].flat(Infinity);
}

describe('CI path filters', () => {
    it('excludes Markdown and MDX after all positive core patterns', async () => {
        const patterns = await getFilterPatterns('core');
        const positivePatterns = patterns
            .map((pattern, index) => ({pattern, index}))
            .filter(({pattern}) => !pattern.startsWith('!'));

        for (const exclusion of ['!**/*.md', '!**/*.mdx']) {
            const exclusionIndex = patterns.indexOf(exclusion);
            assert.notStrictEqual(exclusionIndex, -1);
            assert.ok(
                positivePatterns.every(({index}) => index < exclusionIndex),
                `${exclusion} must follow positive patterns so later patterns cannot add docs back`
            );
        }
    });

    it('treats Markdown and MDX as documentation rather than code', async () => {
        const docs = await getFilterPatterns('docs');
        const anyCode = await getFilterPatterns('any-code');
        const e2e = await getFilterPatterns('e2e');

        assert.ok(docs.includes('**/*.md'));
        assert.ok(docs.includes('**/*.mdx'));
        assert.ok(anyCode.includes('!**/*.md'));
        assert.ok(anyCode.includes('!**/*.mdx'));
        assert.ok(e2e.includes('!**/*.md'));
        assert.ok(e2e.includes('!**/*.mdx'));
    });
});
