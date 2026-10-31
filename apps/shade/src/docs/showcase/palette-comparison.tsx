import { useEffect, useRef, useState } from 'react';

/*
 * Compares the admin7Design palette with the previous one. The new values are
 * read from the document root, which always carries the light admin7Design
 * palette; the previous ones from a hidden `data-admin7-design="false"` scope.
 * Light mode only: dark mode keeps the previous palette in both states.
 */

type Pair = { label: string; text: string; background: string };

/** Swatches per row: gray's eleven steps plus black. */
const COLUMNS = 12;

function readVars(element: Element, cssVars: string[]) {
  const style = getComputedStyle(element);
  return Object.fromEntries(cssVars.map((v) => [v, style.getPropertyValue(v).trim()]));
}

/** Resolves any CSS colour the browser supports to sRGB through a 1px canvas. */
function toRgb(color: string): [number, number, number] | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context || !color) {
    return null;
  }
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

function luminance([r, g, b]: [number, number, number]) {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string) {
  const a = toRgb(foreground);
  const b = toRgb(background);
  if (!a || !b) {
    return null;
  }
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function usePalettes(cssVars: string[]) {
  const previousRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<{
    current: Record<string, string>;
    previous: Record<string, string>;
  }>({ current: {}, previous: {} });
  const key = cssVars.join();

  useEffect(() => {
    if (!previousRef.current) {
      return;
    }
    setValues({
      current: readVars(document.documentElement, cssVars),
      previous: readVars(previousRef.current, cssVars),
    });
    // cssVars is compared by its joined key.
  }, [key]);

  return { previousRef, ...values };
}

function Swatch({ color, title }: { color: string; title: string }) {
  return (
    <div
      className="h-10 w-full rounded-sm border border-border-default"
      style={{ background: color }}
      title={title}
    />
  );
}

export function PaletteComparison({
  families,
}: {
  families: { name: string; cssVars: string[] }[];
}) {
  const { previousRef, current, previous } = usePalettes(families.flatMap((f) => f.cssVars));

  return (
    <div className="flex flex-col gap-8">
      <div ref={previousRef} data-admin7-design="false" hidden />
      {families.map((family) => (
        <section key={family.name} className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-text-primary">{family.name}</h4>
          <div className="grid grid-cols-[7rem_repeat(12,minmax(0,1fr))] items-center gap-1.5">
            <span className="text-2xs text-text-secondary">admin7Design</span>
            {family.cssVars.map((v) => (
              <Swatch key={v} color={current[v]} title={`${v}: ${current[v]}`} />
            ))}
            {Array.from({ length: COLUMNS - family.cssVars.length }, (_, i) => (
              <span key={`pad-new-${i}`} />
            ))}
            <span className="text-2xs text-text-secondary">Previous</span>
            {family.cssVars.map((v) => (
              <Swatch key={v} color={previous[v]} title={`${v}: ${previous[v]}`} />
            ))}
            {Array.from({ length: COLUMNS - family.cssVars.length }, (_, i) => (
              <span key={`pad-old-${i}`} />
            ))}
            <span />
            {family.cssVars.map((v) => (
              <code key={v} className="text-2xs text-text-tertiary">
                {v.replace(/^--color-[a-z]+-?/, '') || v.replace(/^--color-/, '')}
              </code>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ContrastCell({ text, background }: { text: string; background: string }) {
  const ratio = contrast(text, background);
  const passes = ratio !== null && ratio >= 4.5;
  return (
    <td className="px-3 py-2">
      <span
        className="inline-flex items-center rounded-sm px-2 py-1 text-sm font-medium"
        style={{ color: text, background }}
      >
        Aa
      </span>{' '}
      <span className={passes ? 'text-text-primary' : 'text-state-danger'}>
        {ratio === null ? '—' : `${ratio.toFixed(2)}${passes ? '' : ' (below AA)'}`}
      </span>
    </td>
  );
}

export function ContrastComparison({ pairs }: { pairs: Pair[] }) {
  const { previousRef, current, previous } = usePalettes(
    pairs.flatMap((pair) => [pair.text, pair.background]),
  );

  return (
    <div>
      <div ref={previousRef} data-admin7-design="false" hidden />
      <table className="text-sm">
        <thead>
          <tr className="text-left text-text-secondary">
            <th className="px-3 py-2 font-medium">Pair</th>
            <th className="px-3 py-2 font-medium">admin7Design</th>
            <th className="px-3 py-2 font-medium">Previous</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => (
            <tr key={pair.label} className="border-t border-border-default">
              <td className="px-3 py-2 text-text-primary">
                {pair.label}
                <div className="text-2xs text-text-tertiary">
                  <code>{pair.text}</code> on <code>{pair.background}</code>
                </div>
              </td>
              <ContrastCell background={current[pair.background]} text={current[pair.text]} />
              <ContrastCell background={previous[pair.background]} text={previous[pair.text]} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
