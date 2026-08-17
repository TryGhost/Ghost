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
    it('excludes Markdown after all positive core patterns', async () => {
        const patterns = await getFilterPatterns('core');
        const markdownExclusion = patterns.indexOf('!**/*.md');
        const positivePatterns = patterns
            .map((pattern, index) => ({pattern, index}))
            .filter(({pattern}) => !pattern.startsWith('!'));

        assert.notStrictEqual(markdownExclusion, -1);
        assert.ok(
            positivePatterns.every(({index}) => index < markdownExclusion),
            'Markdown exclusions must follow positive patterns so later patterns cannot add docs back'
        );
    });
});
