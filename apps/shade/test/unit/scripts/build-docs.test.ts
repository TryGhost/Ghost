/// <reference types="node" />
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildDocs,
  DocsBuildError,
  writeDocs,
  writeStorybookDocs,
} from '../../../scripts/build-docs';

const STORIES = `import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { Widget } from '@/components/widget';

const meta = {
  title: 'Components / Widget',
  component: Widget,
} satisfies Meta<typeof Widget>;

export default meta;
type Story = StoryObj<typeof Widget>;

/** Wraps a widget with an icon. */
function IconWidget() {
  return (
    <Widget>
      <Plus />
    </Widget>
  );
}

export const Default: Story = {
  render: () => <IconWidget />,
};

export const Large: Story = {
  name: 'Large size',
  render: () => (
    <Stack>
      <IconWidget />
    </Stack>
  ),
};

export const Documented: Story = {
  parameters: { docs: { source: { code: '<Widget size="lg" />' } } },
  render: () => <Widget />,
};

export const ArgsOnly: Story = {
  args: { size: 'lg' },
};
`;

describe('build-docs', () => {
  let root: string;

  const write = async (path: string, content: string): Promise<void> => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  };

  const doc = (body: string, title = 'Overview / Guide'): string =>
    `import { Meta } from '@storybook/addon-docs/blocks';\n\n<Meta title="${title}" />\n\n<div className="sb-doc">\n\n${body}\n\n</div>\n`;

  const build = async (body: string): Promise<{ markdown: string; warnings: string[] }> => {
    await write('src/docs/guide.mdx', doc(body));
    const { docs, warnings } = buildDocs(root);
    const markdown = docs.find((d) => d.source === 'src/docs/guide.mdx')!.markdown;
    return { markdown, warnings: warnings.map((w) => `${w.kind}: ${w.message}`) };
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'shade-docs-'));
    await write('src/components/widget.tsx', 'export function Widget() { return null; }\n');
    await write('src/components.ts', "export * from './components/widget';\n");
    await write('src/components/widget.stories.tsx', STORIES);
    await write('README.md', '# Shade\n');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('strips imports and Meta, unwraps wrappers and adds the generated header', async () => {
    const { markdown } = await build(
      '# Guide\n\n<p className="excerpt">The first paragraph.</p>\n\nBody text.',
    );

    expect(markdown).toBe(
      '<!-- Generated from src/docs/guide.mdx by scripts/build-docs.ts. Do not edit. -->\n\n# Guide\n\nThe first paragraph.\n\nBody text.\n',
    );
  });

  it('passes fenced code through untouched', async () => {
    const fenced = [
      '```tsx',
      "import {Button} from '@tryghost/shade/components';",
      '<Meta title="Not a meta" />',
      '<Canvas of={Nope.Story} />',
      '<div className="x">{value}</div>',
      '',
      '',
      '[link](?path=/docs/overview-guide--docs)',
      '```',
    ].join('\n');
    const { markdown } = await build(`# Guide\n\n${fenced}`);

    expect(markdown).toContain(`\n${fenced}\n`);
  });

  it('converts a Canvas into the story code with its imports and helpers', async () => {
    await write(
      'src/components/widget.mdx',
      [
        "import { Meta, Canvas } from '@storybook/addon-docs/blocks';",
        "import * as WidgetStories from './widget.stories';",
        '',
        '<Meta of={WidgetStories} name="Contract" />',
        '',
        '# Widget contract',
        '',
        '<Canvas of={WidgetStories.Default} />',
        '',
        '<Canvas of={WidgetStories.Documented} />',
      ].join('\n'),
    );
    await write('src/docs/guide.mdx', doc('# Guide'));

    const { docs } = buildDocs(root);
    const contract = docs.find((d) => d.source === 'src/components/widget.mdx')!;

    expect(contract.output).toBe('components/widget.md');
    expect(contract.storybookTitle).toBe('Components / Widget');
    expect(contract.markdown).toContain(
      [
        '_Story: Components / Widget → Default_',
        '',
        '```tsx',
        "import { Plus } from 'lucide-react';",
        "import { Widget } from '@tryghost/shade/components';",
        '',
        '/** Wraps a widget with an icon. */',
        'function IconWidget() {',
        '  return (',
        '    <Widget>',
        '      <Plus />',
        '    </Widget>',
        '  );',
        '}',
        '',
        'export const Default = () => <IconWidget />;',
        '```',
        '',
        '_Story: Components / Widget → Documented_',
        '',
        '```tsx',
        '<Widget size="lg" />',
        '```',
      ].join('\n'),
    );
  });

  it('refers back to helpers an earlier snippet already showed', async () => {
    const { markdown } = await build(
      [
        "import * as WidgetStories from '../components/widget.stories';",
        '',
        '# Guide',
        '',
        '<Canvas of={WidgetStories.Default} />',
        '',
        '<Canvas of={WidgetStories.Large} />',
      ].join('\n'),
    );

    expect(markdown).toContain('_Story: Components / Widget → Large ("Large size")_');
    expect(markdown).toContain(
      '// IconWidget: see the Default story above.\nexport const Large = () => (\n  <Stack>\n    <IconWidget />\n  </Stack>\n);',
    );
    expect(markdown.match(/function IconWidget/g)).toHaveLength(1);
  });

  it('rewrites links between docs, sends README links to GitHub and flattens the rest', async () => {
    await write('src/docs/other.mdx', doc('# Other', 'Overview / Other Page'));
    const { markdown, warnings } = await build(
      [
        '# Guide',
        '',
        '- [Other](?path=/docs/overview-other-page--docs#rules)',
        '- [Relative](./other.mdx)',
        '- [Gallery](?path=/docs/components-widget--docs)',
        '- [Broken](?path=/docs/nothing-here--docs)',
        '- [Monorepo](../../../../docs/guide.md)',
        '- [README](https://github.com/TryGhost/Ghost/blob/main/apps/shade/README.md#usage)',
        '- [Local README](../../README.md#test)',
        '- [External](https://example.com/page)',
        '- `[code](?path=/docs/overview-other-page--docs)`',
      ].join('\n'),
    );

    expect(markdown).toContain(
      [
        '- [Other](./other.md#rules)',
        '- [Relative](./other.md)',
        '- Gallery',
        '- Broken',
        '- Monorepo',
        '- [README](https://github.com/TryGhost/Ghost/blob/main/apps/shade/README.md#usage)',
        '- [Local README](https://github.com/TryGhost/Ghost/blob/main/apps/shade/README.md#test)',
        '- [External](https://example.com/page)',
        '- `[code](?path=/docs/overview-other-page--docs)`',
      ].join('\n'),
    );
    expect(warnings).toEqual([
      expect.stringMatching(/^storybook-only: "\?path=\/docs\/components-widget--docs"/),
      expect.stringMatching(/^unresolved: "\?path=\/docs\/nothing-here--docs"/),
      expect.stringMatching(/^unresolved: "\.\.\/\.\.\/\.\.\/\.\.\/docs\/guide\.md"/),
    ]);
  });

  it.each([
    ['<Controls />', /src\/docs\/guide\.mdx:9: unsupported JSX "<Controls>"/],
    ['Press <kbd>F</kbd> to filter.', /src\/docs\/guide\.mdx:9: unsupported JSX\/HTML "<kbd…"/],
    ['The count is {count}.', /src\/docs\/guide\.mdx:9: MDX expression/],
    ['export const value = 1;', /src\/docs\/guide\.mdx:9: MDX `export`/],
  ])('fails loudly on %s outside a code fence', async (line, message) => {
    await expect(build(`# Guide\n\n${line}`)).rejects.toThrow(message);
    await expect(build(`# Guide\n\n${line}`)).rejects.toBeInstanceOf(DocsBuildError);
  });

  it('fails when a story has no code to extract', async () => {
    await expect(
      build(
        "import * as WidgetStories from '../components/widget.stories';\n\n<Canvas of={WidgetStories.ArgsOnly} />",
      ),
    ).rejects.toThrow(
      /ArgsOnly: the story has neither a render function nor parameters\.docs\.source\.code/,
    );
    await expect(
      build(
        "import * as WidgetStories from '../components/widget.stories';\n\n<Canvas of={WidgetStories.Missing} />",
      ),
    ).rejects.toThrow(/no exported story named "Missing"/);
  });

  it('writes every doc and an index of titles and descriptions', async () => {
    await write(
      'src/docs/guide.mdx',
      doc('# Guide\n\n<p className="excerpt">Start [here](?path=/docs/overview-guide--docs).</p>'),
    );
    const outDir = join(root, 'docs');
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'stale.md'), 'old');

    await writeDocs(root, outDir);

    expect(await readFile(join(outDir, 'guide.md'), 'utf8')).toContain('Start [here](./guide.md).');
    await expect(readFile(join(outDir, 'stale.md'), 'utf8')).rejects.toThrow();
    expect(await readFile(join(outDir, 'index.md'), 'utf8')).toContain(
      '## Overview\n\n- [Guide](guide.md): Start here.\n',
    );
  });

  it('writes the docs and an llms.txt with root-relative links for Storybook', async () => {
    await write('src/docs/guide.mdx', doc('# Guide\n\n<p className="excerpt">Start here.</p>'));
    await write(
      'src/components/widget.mdx',
      doc('# Widget\n\nOne widget.', 'Components / Widget Guide'),
    );
    const siteDir = join(root, 'site');

    await writeStorybookDocs(root, siteDir);

    expect(await readFile(join(siteDir, 'docs/index.md'), 'utf8')).toContain('# Shade docs');
    const llms = await readFile(join(siteDir, 'llms.txt'), 'utf8');
    expect(llms).toMatch(/^# Shade\n\n> .+\n/);
    expect(llms).toContain(
      '## Overview\n\n- [Guide](/docs/guide.md): Start here.\n\n' +
        '## Components\n\n- [Widget](/docs/components/widget.md): One widget.\n',
    );
  });
});
