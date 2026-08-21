import {describe, expect, it} from 'vitest';

import {ARTIFACT_HTML_LIMITS, findInArtifactHtml, readArtifactHtml, replaceInArtifactHtml, writeArtifactHtml} from './artifact-tools';
import {createArtifactDraft} from './artifact-state';

describe('Artifact HTML tools', () => {
    it('validates and canonicalizes bridge payloads before hashing them', async () => {
        const draft = await createArtifactDraft({
            id: 'artifact-1',
            artifactVersion: 1,
            title: 'Stale card title',
            description: 'Stale card description',
            html: '<!doctype html><html><head><title>Canonical title</title><meta name="description" content="Canonical description"></head><body></body></html>'
        });

        expect(draft).toMatchObject({title: 'Canonical title', description: 'Canonical description'});
        await expect(createArtifactDraft({id: '', artifactVersion: 1, title: '', description: '', html: '<div>fragment</div>'})).rejects.toThrow('bounded metadata');
    });

    it('reads bounded HTML ranges and finds literal content', async () => {
        const draft = await createArtifactDraft({
            id: 'artifact-1',
            artifactVersion: 1,
            title: 'Revenue chart',
            description: '',
            html: '<!doctype html>\n<html>\n<head><title>Revenue chart</title></head>\n<body>\n<h1>Revenue</h1>\n<p>Alpha revenue</p>\n</body>\n</html>'
        });

        expect(readArtifactHtml(draft, {startLine: 4, endLine: 5})).toMatchObject({
            ok: true,
            data: {startLine: 4, endLine: 5, content: '<body>\n<h1>Revenue</h1>', truncated: false, next: null}
        });
        expect(findInArtifactHtml(draft, {query: 'revenue'})).toMatchObject({
            ok: true,
            data: {totalMatches: 3, matches: [{line: 3}, {line: 5}, {line: 6}]}
        });
    });

    it('replaces exact HTML and derives card metadata from the complete document', async () => {
        const draft = await createArtifactDraft({
            id: 'artifact-1',
            artifactVersion: 1,
            title: 'Old title',
            description: '',
            html: '<!doctype html><html><head><title>Old title</title><meta name="description" content="Old description"></head><body><h1>Old</h1></body></html>'
        });

        const result = await replaceInArtifactHtml(draft, {
            revision: draft.revision,
            oldText: '<title>Old title</title><meta name="description" content="Old description">',
            newText: '<title>New title</title><meta name="description" content="New description">'
        });

        expect(result).toMatchObject({
            ok: true,
            candidate: {title: 'New title', description: 'New description'}
        });
    });

    it('rejects stale, incomplete, and oversized writes without creating a candidate', async () => {
        const draft = await createArtifactDraft({
            id: 'artifact-1',
            artifactVersion: 1,
            title: 'Artifact',
            description: '',
            html: '<!doctype html><html><head><title>Artifact</title></head><body></body></html>'
        });

        await expect(writeArtifactHtml(draft, {revision: 'stale', html: draft.html})).resolves.toMatchObject({ok: false, error: {code: 'stale_revision'}});
        await expect(writeArtifactHtml(draft, {revision: draft.revision, html: '<div>fragment</div>'})).resolves.toMatchObject({ok: false, error: {code: 'incomplete_artifact_html'}});
        await expect(writeArtifactHtml(draft, {revision: draft.revision, html: `<!doctype html><html><head><title>Large</title></head><body>${'A'.repeat(ARTIFACT_HTML_LIMITS.maxBytes)}</body></html>`})).resolves.toMatchObject({ok: false, error: {code: 'artifact_html_too_large'}});
    });

    it('bounds broad replace-all work without allocating one array entry per match', async () => {
        const draft = await createArtifactDraft({
            id: 'artifact-1',
            artifactVersion: 1,
            title: 'Repeated',
            description: '',
            html: `<!doctype html><html><head><title>Repeated</title></head><body>${'A'.repeat(ARTIFACT_HTML_LIMITS.maxReplacements + 1)}</body></html>`
        });

        await expect(replaceInArtifactHtml(draft, {revision: draft.revision, oldText: 'A', newText: 'B', replaceAll: true})).resolves.toMatchObject({
            ok: false,
            error: {code: 'too_many_html_replacements'}
        });
    });

    it('rejects amplified replacement output before constructing it', async () => {
        const draft = await createArtifactDraft({
            id: 'artifact-1',
            artifactVersion: 1,
            title: 'Repeated',
            description: '',
            html: `<!doctype html><html><head><title>Repeated</title></head><body>${'A'.repeat(ARTIFACT_HTML_LIMITS.maxReplacements)}</body></html>`
        });

        await expect(replaceInArtifactHtml(draft, {revision: draft.revision, oldText: 'A', newText: 'B'.repeat(6_000), replaceAll: true})).resolves.toMatchObject({
            ok: false,
            error: {code: 'artifact_html_too_large'}
        });
    });
});
