import {createChartFallbackWorkflow, createChartPatchFromFile, createLabelColumnPatch} from '../src/editor-settings-model.ts';
import {describe, expect, it, vi} from 'vitest';

describe('chart editor settings', () => {
    const file = (name: string, text: string) => ({
        name,
        type: 'text/csv',
        size: new TextEncoder().encode(text).byteLength,
        bytes: new TextEncoder().encode(text)
    });

    it('turns the chosen CSV into durable table properties and clears a stale fallback', () => {
        expect(createChartPatchFromFile(file('readers.csv', 'Quarter,Readers,Members\nQ1,1200,40\nQ2,1800,58'))).toEqual({
            table: {
                columns: ['Quarter', 'Readers', 'Members'],
                rows: [['Q1', 1200, 40], ['Q2', 1800, 58]]
            },
            labelColumn: 'Quarter',
            valueColumn: 'Readers',
            fallbackImageUrl: null
        });
    });

    it('selects the first numeric value series rather than an intervening text column', () => {
        expect(createChartPatchFromFile(file('readers.csv', 'Month,Region,Readers\nJan,EU,1200\nFeb,US,1800'))).toMatchObject({
            labelColumn: 'Month',
            valueColumn: 'Readers'
        });
    });

    it('uses a later label when the first column is the numeric value series', () => {
        expect(createChartPatchFromFile(file('counts.csv', 'Count,Category\n10,A\n20,B'))).toMatchObject({
            labelColumn: 'Category',
            valueColumn: 'Count'
        });
    });

    it('keeps the conventional first-column label when every column is numeric', () => {
        expect(createChartPatchFromFile(file('sales.csv', 'Year,Sales\n2025,100\n2026,120'))).toMatchObject({
            labelColumn: 'Year',
            valueColumn: 'Sales'
        });
    });

    it('rejects a table without a numeric value series', () => {
        expect(() => createChartPatchFromFile(file('labels.csv', 'Month,Region\nJan,EU\nFeb,US'))).toThrow('numeric value column');
    });

    it('changes a conflicting value series with the label column atomically', () => {
        const table = {
            columns: ['Quarter', 'Readers', 'Members'],
            rows: [['Q1', 1200, 40]]
        };

        expect(createLabelColumnPatch(table, 'Readers', 'Readers')).toEqual({
            labelColumn: 'Readers',
            valueColumn: 'Members',
            fallbackImageUrl: null
        });
    });

    it('commits the canonical chart before waiting for fallback generation', async () => {
        let resolveImage!: (bytes: Uint8Array) => void;
        const renderImage = vi.fn(() => new Promise<Uint8Array>((resolve) => {
            resolveImage = resolve;
        }));
        const proposePatch = vi.fn().mockResolvedValue(undefined);
        const workflow = createChartFallbackWorkflow({
            renderImage,
            uploadImage: vi.fn().mockResolvedValue({url: 'https://site.example/chart.png'}),
            proposePatch
        });

        const nextProps = await workflow.commit({
            table: {columns: ['Month', 'Readers'], rows: [['Jan', 10]]},
            type: 'bar',
            labelColumn: 'Month',
            valueColumn: 'Readers',
            fallbackImageUrl: 'https://site.example/old.png'
        }, {type: 'line'});

        expect(proposePatch).toHaveBeenCalledWith({type: 'line', fallbackImageUrl: null});
        expect(renderImage).not.toHaveBeenCalled();
        workflow.sync(nextProps);
        expect(renderImage).toHaveBeenCalledOnce();
        resolveImage(new Uint8Array([1, 2, 3]));
    });

    it('allows only the latest fallback generation to attach its image', async () => {
        const uploads = new Map<number, (asset: {url: string}) => void>();
        const uploadImage = vi.fn(({bytes}: {bytes: Uint8Array}) => new Promise<{url: string}>((resolve) => {
            uploads.set(bytes[0]!, resolve);
        }));
        const proposePatch = vi.fn().mockResolvedValue(undefined);
        let image = 0;
        const workflow = createChartFallbackWorkflow({
            renderImage: vi.fn(async () => {
                image += 1;
                return new Uint8Array([image]);
            }),
            uploadImage,
            proposePatch
        });
        const props = {
            table: {columns: ['Month', 'Readers'], rows: [['Jan', 10]]},
            type: 'bar',
            labelColumn: 'Month',
            valueColumn: 'Readers',
            fallbackImageUrl: null
        };

        const firstProps = await workflow.commit(props, {type: 'line'});
        workflow.sync(firstProps);
        await vi.waitFor(() => expect(uploads.has(1)).toBe(true));
        const secondProps = await workflow.commit(firstProps, {smooth: true});
        workflow.sync(secondProps);
        await vi.waitFor(() => expect(uploads.has(2)).toBe(true));

        uploads.get(2)!({url: 'https://site.example/new.png'});
        await vi.waitFor(() => expect(proposePatch).toHaveBeenCalledWith({fallbackImageUrl: 'https://site.example/new.png'}));
        uploads.get(1)!({url: 'https://site.example/old.png'});
        await Promise.resolve();

        expect(proposePatch).not.toHaveBeenCalledWith({fallbackImageUrl: 'https://site.example/old.png'});
    });

    it('invalidates pending work when canonical props change outside the settings handler', async () => {
        const uploads = new Map<number, (asset: {url: string}) => void>();
        const proposePatch = vi.fn().mockResolvedValue(undefined);
        const workflow = createChartFallbackWorkflow({
            renderImage: vi.fn(async (_table, config) => new Uint8Array([config.valueColumn === 'Readers' ? 1 : 2])),
            uploadImage: vi.fn(({bytes}: {bytes: Uint8Array}) => new Promise<{url: string}>((resolve) => {
                uploads.set(bytes[0]!, resolve);
            })),
            proposePatch
        });
        const base = {
            table: {columns: ['Month', 'Readers', 'Members'], rows: [['Jan', 10, 4]]},
            type: 'bar',
            labelColumn: 'Month',
            fallbackImageUrl: null
        };

        workflow.sync({...base, valueColumn: 'Readers'});
        await vi.waitFor(() => expect(uploads.has(1)).toBe(true));
        workflow.sync({...base, valueColumn: 'Members'});
        await vi.waitFor(() => expect(uploads.has(2)).toBe(true));

        uploads.get(1)!({url: 'https://site.example/old.png'});
        uploads.get(2)!({url: 'https://site.example/new.png'});
        await vi.waitFor(() => expect(proposePatch).toHaveBeenCalledWith({fallbackImageUrl: 'https://site.example/new.png'}));
        expect(proposePatch).not.toHaveBeenCalledWith({fallbackImageUrl: 'https://site.example/old.png'});
    });
});
