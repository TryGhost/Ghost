import type { ComponentPropsWithoutRef, HTMLAttributes, LazyExoticComponent } from 'react';
import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';

type NumberFlowComponent = typeof import('@number-flow/react').default;
type NumberFlowProps = ComponentPropsWithoutRef<NumberFlowComponent>;
// The value, its format and the animation options, which the fallback doesn't take
type NumberFlowOwnProps = Omit<NumberFlowProps, keyof HTMLAttributes<HTMLElement>>;
// The number is the only content
type AnimatedNumberProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'dangerouslySetInnerHTML'
> &
  NumberFlowOwnProps;

// Dynamically import the NumberFlow component
const NumberFlow: LazyExoticComponent<NumberFlowComponent> = lazy(
  () => import('@number-flow/react'),
);

// Formatters are cached by locale tags and options, as NumberFlow does
const formatters = new Map<string, Intl.NumberFormat>();

// Locale tags as strings, so `Intl.Locale` objects don't share a cache key
function localeTags(locales: Intl.LocalesArgument): string[] | undefined {
  return locales === undefined ? undefined : [locales].flat().map(String);
}

// The text NumberFlow shows: the formatted value between prefix and suffix
function numberFlowText({
  value,
  locales,
  format,
  prefix,
  suffix,
}: Pick<AnimatedNumberProps, 'value' | 'locales' | 'format' | 'prefix' | 'suffix'>): string {
  const key = `${locales ? JSON.stringify(locales) : ''}:${format ? JSON.stringify(format) : ''}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locales, format);
    formatters.set(key, formatter);
  }
  return `${prefix ?? ''}${formatter.format(value)}${suffix ?? ''}`;
}

/**
 * Animates changes to a number with NumberFlow, loaded lazily.
 *
 * NumberFlow shows screen readers an image made of separate digits, and some
 * tools read them one by one. So the animated number is hidden from screen
 * readers and a visually hidden copy of the formatted value is read instead.
 * While NumberFlow loads, the formatted value shows as text.
 *
 * `className`, `style` and other DOM props go to the visible number, so
 * existing styling keeps working. The screen-reader copy is a sibling placed
 * first: the visible number stays the last child for parent styles like
 * `space-x-*`, but first-child, only-child and adjacent-sibling selectors see
 * the copy.
 *
 * - `aria-hidden` or the `hidden` attribute hides the number from screen
 *   readers too. A class like `hidden` in `className` hides only the visible
 *   number, so hide it on a parent instead.
 * - `aria-label` is read in place of the number. Other ARIA props land on the
 *   hidden visible number and have no effect.
 */
const AnimatedNumber = ({
  value,
  locales,
  format,
  prefix,
  suffix,
  transformTiming,
  spinTiming,
  opacityTiming,
  animated,
  respectMotionPreference,
  trend,
  plugins,
  digits,
  isolate,
  willChange,
  onAnimationsStart,
  onAnimationsFinish,
  nonce,
  className,
  style,
  hidden,
  lang,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
  ...props
}: AnimatedNumberProps) => {
  const tags = localeTags(locales);
  const text = numberFlowText({ value, locales: tags, format, prefix, suffix });
  const read = !hidden && ariaHidden !== true && ariaHidden !== 'true';

  return (
    <>
      {read && (
        <span className="sr-only" lang={lang}>
          {ariaLabel?.trim() ? ariaLabel : text}
        </span>
      )}
      <Suspense
        fallback={
          // Close to NumberFlow's own box; it adds a little vertical padding.
          // Not selectable, so copied text has the number once, as when loaded
          <span
            {...props}
            aria-hidden="true"
            className={cn(
              'inline-block leading-none whitespace-pre select-none [direction:ltr]',
              className,
            )}
            hidden={hidden || undefined}
            lang={lang}
            style={style}
          >
            {text}
          </span>
        }
      >
        <NumberFlow
          {...props}
          animated={animated}
          aria-hidden="true"
          className={className}
          digits={digits}
          format={format}
          hidden={hidden || undefined}
          isolate={isolate}
          lang={lang}
          locales={tags}
          nonce={nonce}
          opacityTiming={opacityTiming}
          plugins={plugins}
          prefix={prefix}
          respectMotionPreference={respectMotionPreference}
          spinTiming={spinTiming}
          style={style}
          suffix={suffix}
          transformTiming={transformTiming}
          trend={trend}
          value={value}
          willChange={willChange}
          onAnimationsFinish={onAnimationsFinish}
          onAnimationsStart={onAnimationsStart}
        />
      </Suspense>
    </>
  );
};

// Export the component
export { AnimatedNumber };
