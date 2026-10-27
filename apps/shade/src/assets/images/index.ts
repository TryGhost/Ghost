import type { FunctionComponent, SVGProps } from 'react';
import FacebookLogoSvg from './facebook-logo.svg?react';
import GhostLogoSvg from './ghost-logo.svg?react';
import GhostOrbSvg from './ghost-orb.svg?react';
import GoogleLogoSvg from './google-logo.svg?react';
import TwitterLogoSvg from './twitter-logo.svg?react';
import XLogoSvg from './x-logo.svg?react';

// Explicit types keep the `?react` asset imports out of the published
// declarations, where consumers can't resolve them.
type Logo = FunctionComponent<SVGProps<SVGSVGElement>>;

export const FacebookLogo: Logo = FacebookLogoSvg;
export const GhostLogo: Logo = GhostLogoSvg;
export const GhostOrb: Logo = GhostOrbSvg;
export const GoogleLogo: Logo = GoogleLogoSvg;
export const TwitterLogo: Logo = TwitterLogoSvg;
export const XLogo: Logo = XLogoSvg;
