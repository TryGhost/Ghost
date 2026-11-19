import { createElement, type FunctionComponent, type SVGProps } from 'react';

export interface SvgGraphicProps extends SVGProps<SVGSVGElement> {
  /**
   * Names the graphic for screen readers. Without a `title`, `aria-label` or
   * `aria-labelledby`, the graphic is decorative and hidden from them.
   */
  title?: string;
}

/**
 * Applies Shade's rule for SVG logos and icons: decorative by default, and an
 * image with a name when the caller gives one. Callers can still override
 * `aria-hidden` and `role`.
 *
 * This lives in code rather than SVGR options because Admin and other apps
 * compile Shade's source with their own SVGR config.
 */
export function svgGraphicProps<P extends SvgGraphicProps>({
  title,
  ...props
}: P): SVGProps<SVGSVGElement> {
  const label = props['aria-label'] ?? title;

  if (label || props['aria-labelledby']) {
    return { role: 'img', ...props, 'aria-label': label };
  }

  return { 'aria-hidden': true, ...props };
}

export function svgGraphic(
  Svg: FunctionComponent<SVGProps<SVGSVGElement>>,
  displayName: string,
): FunctionComponent<SvgGraphicProps> {
  const Graphic = (props: SvgGraphicProps) => createElement(Svg, svgGraphicProps(props));
  Graphic.displayName = displayName;
  return Graphic;
}
