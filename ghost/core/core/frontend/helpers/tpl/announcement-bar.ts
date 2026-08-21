// The announcement bar block for `{{ghost_head}}`: its styles, the announcement
// as data, and the bootstrap that places it. `getAnnouncementBarHelper` decides
// whether a given reader sees it at all.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import config from '../../../shared/config';
import { escapeInlineJson } from '../../utils/escape-inline-json';

type RenderOptions = {
  /** The announcement's HTML, authored in Admin. */
  announcement: string;
  background?: string;
  /**
   * Set only when the audience has to be resolved in the browser. The
   * announcement is then withheld from the page and fetched with the answer.
   */
  apiUrl?: string;
};

type AnnouncementBarData = {
  key: string;
  announcement?: string;
  background?: string;
  apiUrl?: string;
};

// Constrained to these by the settings validator. Resolving through the list
// rather than escaping keeps the class attribute closed if that ever changes.
const BACKGROUNDS = ['accent', 'dark', 'light'];
const DEFAULT_BACKGROUND = 'dark';

// `all: unset` has to stay between the background variants and the element rules
// that reinstate what we want back. It also strips the focus ring, so
// `:focus-visible` puts one back for the close button and any announcement links.
const STYLES = [
  '.gh-announcement-bar,.gh-announcement-bar *{box-sizing:border-box!important}',
  '.gh-announcement-bar{position:relative;z-index:90;display:flex;align-items:center;justify-content:center;padding:12px 48px;min-height:48px;font-size:15px;line-height:23px;text-align:center}',
  '.gh-announcement-bar.light{background-color:#f0f0f0;color:#15171a}',
  '.gh-announcement-bar.accent{background-color:var(--ghost-accent-color);color:#fff}',
  '.gh-announcement-bar.dark{background-color:#15171a;color:#fff}',
  '.gh-announcement-bar *:not(path){all:unset}',
  '.gh-announcement-bar :focus-visible{outline:2px solid currentColor;outline-offset:2px}',
  '.gh-announcement-bar strong{font-weight:700}',
  '.gh-announcement-bar :is(i,em){font-style:italic}',
  '.gh-announcement-bar a{color:#fff;font-weight:700;text-decoration:underline;cursor:pointer}',
  '.gh-announcement-bar.light a{color:var(--ghost-accent-color)!important}',
  '.gh-announcement-bar button{position:absolute;top:50%;right:8px;display:flex;align-items:center;justify-content:center;margin-top:-16px;width:32px;height:32px;padding:0;background-color:transparent;border:0;color:#fff;cursor:pointer}',
  '.gh-announcement-bar.light button{color:#888}',
  '.gh-announcement-bar svg{width:10px;height:10px;fill:currentColor}',
].join('');

let bootstrap: string | undefined;

/**
 * The built `core/frontend/src/announcement-bar` script. Read once: it is the
 * same bytes for every site and every announcement, which is also what lets a
 * strict `script-src` allowlist it by hash.
 */
function getBootstrap(): string {
  if (bootstrap === undefined) {
    bootstrap = fs
      .readFileSync(
        path.join(config.get('paths').publicFilePath, 'announcement-bar.min.js'),
        'utf8',
      )
      .trim();
  }

  return bootstrap;
}

/**
 * Identity of an announcement, for session-scoped dismissal. Short because it
 * ships in every page's HTML, and a hash rather than the content itself so the
 * content is not duplicated in the payload.
 */
function contentKey(announcement: string): string {
  return crypto.createHash('sha256').update(announcement).digest('hex').slice(0, 12);
}

/**
 * The `<style>`, the announcement data, and the bootstrap to drop into
 * `{{ghost_head}}`.
 *
 * The announcement travels as JSON rather than as markup in the head, so an
 * announcement authored through the Admin API cannot reshape the document:
 * `escapeInlineJson` leaves no character that could close the script element it
 * sits in, and the bootstrap then parses it inside the bar's content element.
 */
export function render({ announcement, background, apiUrl }: RenderOptions): string {
  const data: AnnouncementBarData = { key: contentKey(announcement) };

  if (apiUrl) {
    // The response is shared by every member on a tier, so the announcement is
    // withheld until the members API confirms this reader is in the audience.
    data.apiUrl = apiUrl;
  } else {
    data.announcement = announcement;
    data.background = BACKGROUNDS.includes(background ?? '') ? background : DEFAULT_BACKGROUND;
  }

  return (
    `<style id="gh-announcement-bar-styles">${STYLES}</style>` +
    `<script type="application/json" id="gh-announcement-bar-data">${escapeInlineJson(JSON.stringify(data))}</script>` +
    `<script id="gh-announcement-bar-script">${getBootstrap()}</script>`
  );
}
