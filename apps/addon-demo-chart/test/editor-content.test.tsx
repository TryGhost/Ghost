import renderer from '../src/editor-content.tsx';
import {sampleChartTable} from '../src/chart-data.ts';
import {describe, expect, it} from 'vitest';

describe('chart editor block', () => {
    it('renders a durable ECharts SVG and opts into public hydration', async () => {
        const output = await renderer({
            blockName: 'interactive-chart',
            props: {
                table: sampleChartTable,
                type: 'bar',
                labelColumn: 'Month',
                valueColumn: 'Readers'
            }
        });

        expect(output.html).toContain('<svg');
        expect(output.html).toContain('Readers by Month');
        expect(output.html).toContain('Readers');
        expect(output.portableHtml).toBe('');
        expect(renderer.hydrate).toBeTypeOf('function');
    });

    it('uses a resolved fallback image as ordinary portable HTML', async () => {
        const output = await renderer({
            blockName: 'interactive-chart',
            props: {
                table: sampleChartTable,
                type: 'line',
                labelColumn: 'Month',
                valueColumn: 'Readers',
                fallbackImageUrl: 'https://example.com/chart.png'
            }
        });

        expect(output.portableHtml).toContain('<img');
        expect(output.portableHtml).toContain('https://example.com/chart.png');
        expect(output.portableHtml).toContain('Readers by Month');
    });
});
