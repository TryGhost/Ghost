import type { FunctionComponent } from 'react';
import { svgGraphic, type SvgGraphicProps } from '@/lib/svg-graphic';
import FacebookLogoSvg from './facebook-logo.svg?react';
import GhostLogoSvg from './ghost-logo.svg?react';
import GhostOrbSvg from './ghost-orb.svg?react';
import GoogleLogoSvg from './google-logo.svg?react';
import XLogoSvg from './x-logo.svg?react';

// Explicit types keep the `?react` asset imports out of the published
// declarations, where consumers can't resolve them.
type Logo = FunctionComponent<SvgGraphicProps>;

// Logos are decorative unless the caller names them with `title`,
// `aria-label` or `aria-labelledby`.
export const FacebookLogo: Logo = svgGraphic(FacebookLogoSvg, 'FacebookLogo');
export const GhostLogo: Logo = svgGraphic(GhostLogoSvg, 'GhostLogo');
export const GhostOrb: Logo = svgGraphic(GhostOrbSvg, 'GhostOrb');
export const GoogleLogo: Logo = svgGraphic(GoogleLogoSvg, 'GoogleLogo');
export const XLogo: Logo = svgGraphic(XLogoSvg, 'XLogo');
