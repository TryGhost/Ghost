import {describe, expect, it, vi} from 'vitest';

import {BuilderAttachments} from './attachments';

describe('BuilderAttachments', () => {
    it('keeps bounded text context and stable uploaded image URLs in one shared store', async () => {
        const uploadImage = vi.fn().mockResolvedValue('https://example.com/content/images/chart.png');
        const attachments = new BuilderAttachments({uploadImage});

        const result = await attachments.add([
            new File(['name,value\nAlpha,10\nBeta,20'], 'report.csv', {type: 'text/csv'}),
            new File(['image-bytes'], 'chart.png', {type: 'image/png'})
        ]);

        expect(result.errors).toEqual([]);
        expect(result.added).toHaveLength(2);
        expect(uploadImage).toHaveBeenCalledOnce();
        expect(attachments.list()).toEqual([
            expect.objectContaining({kind: 'text', name: 'report.csv', mediaType: 'text/csv', preview: 'name,value\nAlpha,10\nBeta,20'}),
            expect.objectContaining({kind: 'image', name: 'chart.png', mediaType: 'image/png', url: 'https://example.com/content/images/chart.png'})
        ]);
    });

    it('reads bounded line ranges and searches text without exposing the whole attachment', async () => {
        const attachments = new BuilderAttachments({uploadImage: vi.fn()});
        const content = Array.from({length: 700}, (_, index) => `row ${index + 1},${index % 7 === 0 ? 'match' : 'other'}`).join('\n');
        const {added: [attachment]} = await attachments.add([new File([content], 'large.csv', {type: 'text/csv'})]);
        if (!attachment) {
            throw new Error('Expected the CSV attachment to be added.');
        }

        const tools = attachments.getTools(() => 'revision-7');
        const read = tools.find(tool => tool.name === 'read_attachment');
        const search = tools.find(tool => tool.name === 'search_attachment');
        const signal = new AbortController().signal;

        await expect(read?.execute({id: attachment.id, startLine: 490, endLine: 620}, signal)).resolves.toMatchObject({
            ok: true,
            revision: 'revision-7',
            data: {startLine: 490, endLine: 620, truncated: true, next: {startLine: 621}}
        });
        const matches = await search?.execute({id: attachment.id, query: 'match'}, signal);
        expect(matches).toMatchObject({ok: true, revision: 'revision-7', data: {truncated: true}});
        if (matches?.ok) {
            const data = matches.data as {matches: Array<{line: number; text: string}>};
            expect(data.matches).toHaveLength(50);
            expect(data.matches[0]).toMatchObject({line: 1, text: 'row 1,match'});
        }
    });

    it('rejects unsupported and oversized files without retaining them', async () => {
        const attachments = new BuilderAttachments({uploadImage: vi.fn(), maxFileBytes: 8});

        const result = await attachments.add([
            new File(['123456789'], 'too-large.txt', {type: 'text/plain'}),
            new File(['binary'], 'archive.zip', {type: 'application/zip'})
        ]);

        expect(result.added).toEqual([]);
        expect(result.errors.map(({name, code}) => ({name, code}))).toEqual([
            {name: 'too-large.txt', code: 'attachment_too_large'},
            {name: 'archive.zip', code: 'unsupported_attachment_type'}
        ]);
        expect(result.errors.every(error => Boolean(error.message))).toBe(true);
        expect(attachments.list()).toEqual([]);
    });

    it('bounds attachment bytes retained by earlier turn checkpoints across the session', async () => {
        const attachments = new BuilderAttachments({uploadImage: vi.fn(), maxFileBytes: 8, maxAttachments: 2, maxRetainedBytes: 10});
        const {added: [first]} = await attachments.add([new File(['123456'], 'first.txt', {type: 'text/plain'})]);
        if (!first) {
            throw new Error('Expected the first attachment to be added.');
        }
        attachments.remove(first.id);

        const result = await attachments.add([new File(['12345'], 'second.txt', {type: 'text/plain'})]);

        expect(result.added).toEqual([]);
        expect(result.errors).toEqual([expect.objectContaining({
            name: 'second.txt',
            code: 'attachment_session_limit_reached'
        })]);
    });

    it('returns a canonical error when searching an image', async () => {
        const attachments = new BuilderAttachments({uploadImage: vi.fn().mockResolvedValue('https://example.com/image.webp')});
        const {added: [image]} = await attachments.add([new File(['image'], 'image.webp', {type: 'image/webp'})]);
        if (!image) {
            throw new Error('Expected the image attachment to be added.');
        }
        const search = attachments.getTools(() => 'revision-2').find(tool => tool.name === 'search_attachment');

        await expect(search?.execute({id: image.id, query: 'anything'}, new AbortController().signal)).resolves.toEqual({
            ok: false,
            revision: 'revision-2',
            error: {
                code: 'attachment_not_text',
                message: 'image.webp is an image and cannot be searched as text.',
                retryable: false
            }
        });
    });

    it('returns uploaded image bytes as model-visible tool content', async () => {
        const attachments = new BuilderAttachments({uploadImage: vi.fn().mockResolvedValue('https://example.com/image.png')});
        const {added: [image]} = await attachments.add([new File(['image-bytes'], 'image.png', {type: 'image/png'})]);
        if (!image) {
            throw new Error('Expected the image attachment to be added.');
        }
        const read = attachments.getTools(() => 'revision-2').find(tool => tool.name === 'read_attachment');

        await expect(read?.execute({id: image.id}, new AbortController().signal)).resolves.toMatchObject({
            ok: true,
            revision: 'revision-2',
            data: {id: image.id, url: 'https://example.com/image.png'},
            attachments: [{type: 'image', mediaType: 'image/png', data: 'aW1hZ2UtYnl0ZXM='}]
        });
    });

    it('returns SVG source as text and rejects compressed SVGZ instead of sending unsupported vision content', async () => {
        const attachments = new BuilderAttachments({uploadImage: vi.fn().mockResolvedValue('https://example.com/icon.svg')});
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10" /></svg>';
        const result = await attachments.add([
            new File([svg], 'icon.svg', {type: 'image/svg+xml'}),
            new File(['compressed'], 'icon.svgz', {type: 'image/svg+xml'})
        ]);
        const image = result.added[0];
        if (!image) {
            throw new Error('Expected the SVG attachment to be added.');
        }

        const read = attachments.getTools(() => 'revision-svg').find(tool => tool.name === 'read_attachment');
        const readResult = await read?.execute({id: image.id}, new AbortController().signal);

        expect(result.errors).toEqual([expect.objectContaining({name: 'icon.svgz', code: 'unsupported_attachment_type'})]);
        expect(readResult).toMatchObject({
            ok: true,
            data: {source: svg, sourceTruncated: false, url: 'https://example.com/icon.svg'}
        });
        if (readResult?.ok) {
            expect(readResult.attachments).toBeUndefined();
        }
    });

    it('snapshots and restores attachment contents without re-uploading images', async () => {
        const uploadImage = vi.fn().mockResolvedValue('https://example.com/image.png');
        const attachments = new BuilderAttachments({uploadImage});
        const {added: [text, image]} = await attachments.add([
            new File(['original report'], 'report.txt', {type: 'text/plain'}),
            new File(['image-bytes'], 'image.png', {type: 'image/png'})
        ]);
        if (!text || !image) {
            throw new Error('Expected both attachments to be added.');
        }
        const snapshot = attachments.snapshot();
        const nextSnapshot = attachments.snapshot();

        expect(nextSnapshot.attachments[0]).toBe(snapshot.attachments[0]);
        expect(nextSnapshot.attachments[1]).toBe(snapshot.attachments[1]);

        attachments.remove(text.id);
        attachments.remove(image.id);
        await attachments.add([new File(['later'], 'later.txt', {type: 'text/plain'})]);
        attachments.restore(snapshot);

        expect(attachments.list().map(item => item.name)).toEqual(['report.txt', 'image.png']);
        const read = attachments.getTools(() => 'revision-restored').find(tool => tool.name === 'read_attachment');
        await expect(read?.execute({id: text.id}, new AbortController().signal)).resolves.toMatchObject({
            ok: true,
            data: {content: 'original report'}
        });
        await expect(read?.execute({id: image.id}, new AbortController().signal)).resolves.toMatchObject({
            ok: true,
            attachments: [{data: 'aW1hZ2UtYnl0ZXM='}]
        });
        expect(uploadImage).toHaveBeenCalledOnce();
    });

    it('paginates one very long line by column as well as line', async () => {
        const attachments = new BuilderAttachments({uploadImage: vi.fn()});
        const {added: [attachment]} = await attachments.add([new File(['A'.repeat(40_000)], 'data.json', {type: 'application/json'})]);
        if (!attachment) {
            throw new Error('Expected the JSON attachment to be added.');
        }
        const read = attachments.getTools(() => 'revision-3').find(tool => tool.name === 'read_attachment');

        const first = await read?.execute({id: attachment.id}, new AbortController().signal);

        expect(first).toMatchObject({
            ok: true,
            data: {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 24_000,
                truncated: true,
                next: {startLine: 1, startColumn: 24_001}
            }
        });
        if (first?.ok) {
            expect((first.data as {content: string}).content).toHaveLength(24_000);
        }
    });
});
