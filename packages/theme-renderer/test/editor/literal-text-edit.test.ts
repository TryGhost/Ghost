import { describe, expect, it } from 'vitest';
import * as editor from '../../src/editor/index.ts';

describe('source-proven literal inline editing', () => {
  it('uses a separate generated marker lane without admitting authored aliases', () => {
    const theme = {
      'index.hbs':
        '<h1>Literal</h1>\n<h1 data-edit="index.hbs:1:1">{{title}}</h1>\n<p data-edit="custom">Other literal</p>',
    };
    expect(editor.getThemeLiteralTextTargets(theme, 'data-builder-source-fixture')).toEqual({
      'index.hbs:1:1': 'h1',
      'index.hbs:3:1': 'p',
    });
  });

  it('refuses authored marker aliases across files without excluding unrelated literal targets', () => {
    const theme = {
      'index.hbs': '<h1>Literal heading</h1>\n<p>Other literal</p>',
      'post.hbs':
        '<h1 data-edit="index.hbs:1:1">{{title}}</h1>\n<p data-edit="custom">Authored</p>',
    };
    expect(editor.getThemeLiteralTextTargets(theme)).toEqual({ 'index.hbs:2:1': 'p' });
  });

  it.each(['{{marker}}', 'index.hbs&#58;1:1'])(
    'refuses eligibility when an authored marker alias cannot be resolved: %s',
    (value) => {
      expect(
        editor.getThemeLiteralTextTargets({
          'index.hbs': `<h1>Literal heading</h1>\n<h1 data-edit="${value}">{{title}}</h1>`,
        }),
      ).toEqual({});
    },
  );

  it('offers literal children, excluding expressions, mixed output, nested markup and raw text', () => {
    const theme = {
      'index.hbs': [
        '<h1>Literal &amp; title</h1>',
        '<h2>{{title}}</h2>',
        '<p>Hello {{@site.title}}</p>',
        '<p>Hello <strong>world</strong></p>',
        '<script>Literal script</script>',
        '<h3>{{t "Subscribe"}}</h3>',
        '<div>{{#if x}}Hello{{/if}}</div>',
        '<a href="{{url}}">Read more</a>',
      ].join('\n'),
    };
    expect(editor.getThemeLiteralTextTargets(theme)).toEqual({
      'index.hbs:1:1': 'h1',
      'index.hbs:4:10': 'strong',
      'index.hbs:8:1': 'a',
    });
  });

  it.each(['{{title}}', 'Hello {{name}}', 'Hello <span>world</span>', '{{#if x}}Hello{{/if}}'])(
    'refuses %s without changing source',
    (content) => {
      expect(editor.applyThemeLiteralTextEdit).toBeTypeOf('function');
      const theme = { 'index.hbs': `<h1>${content}</h1>` };
      expect(() =>
        editor.applyThemeLiteralTextEdit(
          theme,
          { file: 'index.hbs', line: 1, column: 1 },
          'Changed',
          { tagName: 'h1' },
        ),
      ).toThrow(/literal/i);
      expect(theme['index.hbs']).toBe(`<h1>${content}</h1>`);
    },
  );

  it('preserves the plain-text escaping contract and map ownership', () => {
    const theme = new Map([['partials/footer.hbs', '<a href="{{url}}">  Powered by Ghost  </a>']]);
    const next = editor.applyThemeLiteralTextEdit(
      theme,
      { file: 'partials/footer.hbs', line: 1, column: 1 },
      'Tom & <Jerry>',
      { tagName: 'A' },
    );
    expect(next.get('partials/footer.hbs')).toBe('<a href="{{url}}">  Tom &amp; &lt;Jerry>  </a>');
    expect(theme.get('partials/footer.hbs')).toContain('Powered by Ghost');
  });

  it('refuses stale positions rather than relocating a canvas inline edit', () => {
    expect(editor.applyThemeLiteralTextEdit).toBeTypeOf('function');
    const theme = { 'index.hbs': '<p>First</p>\n<h1>Second</h1>' };
    expect(() =>
      editor.applyThemeLiteralTextEdit(
        theme,
        { file: 'index.hbs', line: 1, column: 2 },
        'Changed',
        { tagName: 'h1' },
      ),
    ).toThrow();
    expect(() =>
      editor.applyThemeLiteralTextEdit(
        theme,
        { file: 'index.hbs', line: 1, column: 1 },
        'Changed',
        { tagName: 'h1' },
      ),
    ).toThrow();
  });
});
