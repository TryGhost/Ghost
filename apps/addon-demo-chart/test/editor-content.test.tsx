import renderer from '../src/editor-content.tsx';
import { sampleChartTable } from '../src/chart-data.ts';
import { describe, expect, it } from 'vitest';

describe('chart editor block', () => {
  it('renders a durable ECharts SVG and opts into public hydration', async () => {
    const output = await renderer({
      blockName: 'interactive-chart',
      props: {
        table: sampleChartTable,
        type: 'bar',
        labelColumn: 'Month',
        valueColumn: 'Readers',
      },
    });

    expect(output.html).toContain('<svg');
    expect(output.html).toContain('Readers by Month');
    expect(output.html).toContain('Readers');
    expect(output.html).toMatch(/font-family:\s*inherit/);
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
        fallbackImageUrl: 'https://example.com/chart.png',
      },
    });

    expect(output.portableHtml).toContain('<img');
    expect(output.portableHtml).toContain('https://example.com/chart.png');
    expect(output.portableHtml).toContain('Readers by Month');
    expect(output.portableHtml).toContain('border:1px solid');
    expect(output.portableHtml).toContain('border-radius:18px');
    expect(output.css).not.toContain('font-family');
    expect(output.portableHtml).not.toContain('font-family');
  });

  it('renders an authored title and description as separate content', async () => {
    const output = await renderer({
      blockName: 'interactive-chart',
      props: {
        table: sampleChartTable,
        type: 'bar',
        labelColumn: 'Month',
        valueColumn: 'Readers',
        title: 'Audience growth',
        description: 'Monthly readers gained during the launch.',
        fallbackImageUrl: 'https://example.com/chart.png',
      },
    });

    expect(output.html).toContain('Audience growth');
    expect(output.html).toContain('Monthly readers gained during the launch.');
    expect(output.portableHtml).toContain('alt="Audience growth"');
    expect(output.portableHtml).toContain('Monthly readers gained during the launch.');
  });
});
