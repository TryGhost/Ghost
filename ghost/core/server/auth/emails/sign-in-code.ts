import { isIP } from 'node:net';
import UAParser from 'ua-parser-js';
import { lookupGeolocation } from '../../lib/geolocation';
import signInEmail, { type DeviceDetails } from './signin';

/** A readable location for an IP address, or `Unknown` */
export type Geolocate = (ip: string) => Promise<string>;

/** City, region and country from geojs.io; a failed lookup reads as `Unknown` */
export const geolocateWithGeojs: Geolocate = async (ip) => {
  try {
    const location = await lookupGeolocation(ip);
    const parts = [location?.city, location?.region, location?.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ').trim() : 'Unknown';
  } catch {
    return 'Unknown';
  }
};

const formatTime = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
}).format;

export async function getDeviceDetails(
  userAgent: string | null,
  ip: string | null,
  geolocate: Geolocate,
): Promise<DeviceDetails> {
  const parser = new UAParser();
  parser.setUA(userAgent ?? undefined);
  const result = parser.getResult();
  const device = [result.browser?.name || '', result.os?.name || ''].filter(Boolean).join(', ');
  return {
    device,
    location: ip && isIP(ip) ? await geolocate(ip) : 'Unknown',
    time: formatTime(new Date()),
  };
}

export type SignInCodeMessage = {
  email: string;
  code: string;
  userAgent: string | null;
  ipAddress: string | null;
  /** `require_email_mfa`, which changes the email's wording */
  isEmailMfaRequired: boolean;
};

export type SignInCodeEmailDeps = {
  mailer: { send(message: { to: string; subject: string; html: string }): Promise<unknown> };
  t: (key: string, options?: Record<string, unknown>) => string;
  getSiteTitle(): string;
  getSiteLogo(): string;
  getSiteUrl(): string;
  geolocate?: Geolocate;
};

/** Emails a staff sign-in verification code, for either auth engine */
export function createSignInCodeEmail(deps: SignInCodeEmailDeps) {
  const geolocate = deps.geolocate ?? geolocateWithGeojs;

  return async function sendSignInCode({
    email,
    code,
    userAgent,
    ipAddress,
    isEmailMfaRequired,
  }: SignInCodeMessage): Promise<void> {
    const siteUrl = deps.getSiteUrl();
    const siteDomain = siteUrl.match(/^https?:\/\/([^/:?#]+)(?:[/:?#]|$)/i)?.[1];
    const html = signInEmail({
      t: deps.t,
      siteTitle: deps.getSiteTitle(),
      email,
      siteDomain,
      siteUrl,
      siteLogo: deps.getSiteLogo(),
      token: code,
      deviceDetails: await getDeviceDetails(userAgent, ipAddress, geolocate),
      is2FARequired: isEmailMfaRequired,
    });

    await deps.mailer.send({
      to: email,
      subject: `${code} is your Ghost sign in verification code`,
      html,
    });
  };
}
