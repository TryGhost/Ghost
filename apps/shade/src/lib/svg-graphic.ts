import { createElement, type FunctionComponent, type SVGProps } from 'react';

export interface SvgGraphicProps extends SVGProps<SVGSVGElement> {
  /**
   * Names the graphic for screen readers. It sets `aria-label`, and doesn't
   * render a tooltip or an SVG `<title>`. Without a `title`, `aria-label` or
   * `aria-labelledby`, the graphic is decorative and hidden from them. A
   * non-blank `aria-label` takes precedence over `title`, and an explicit
   * `aria-hidden` from the caller always wins.
   */
  title?: string | undefined;
}

const nonBlank = (value: string | undefined) => (value?.trim() ? value : undefined);

/**
 * Applies Shade's rule for SVG logos and icons: decorative by default, and an
 * image with a name when the caller gives one. Callers can still override
 * `aria-hidden` and `role`; a prop passed as `undefined` keeps the default.
 *
 * This lives in code rather than SVGR options because Admin and other apps
 * compile Shade's source with their own SVGR config.
 */
export function svgGraphicProps({ title, ...props }: SvgGraphicProps): SVGProps<SVGSVGElement> {
  const label = nonBlank(props['aria-label']) ?? nonBlank(title);

  if (label || nonBlank(props['aria-labelledby'])) {
    return { ...props, role: props.role ?? 'img', 'aria-label': label };
  }

  return { ...props, 'aria-hidden': props['aria-hidden'] ?? true };
}

export function svgGraphic(
  Svg: FunctionComponent<SVGProps<SVGSVGElement>>,
  displayName: string,
): FunctionComponent<SvgGraphicProps> {
  const Graphic = (props: SvgGraphicProps) => createElement(Svg, svgGraphicProps(props));
  Graphic.displayName = displayName;
  return Graphic;
}
