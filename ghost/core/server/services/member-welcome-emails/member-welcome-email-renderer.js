const { finalize } = require('../../lib/email-rendering/finalize');
const errors = require('@tryghost/errors');
const { MESSAGES } = require('./constants');
const { wrapReplacementStrings } = require('@tryghost/kg-default-nodes').utils.replacementStrings;
const linkReplacer = require('../../lib/link-replacer');
const emailDesign = require('../../lib/email-rendering/email-design');

const REPLACEMENT_REGEX = /%%\{(\w+?)(?:,? *"(.*?)")?\}%%/g;
const UNMATCHED_TOKEN_REGEX = /%%\{.*?\}%%/g;
const PLACEHOLDER_REGEX = /%%\{(\w+)\}%%/g;
// Marks member placeholders while unknown tokens are removed, so that removal can't reach them.
const MARKER = '\uE000';
const MARKED_PLACEHOLDER_REGEX = /\uE000(\w+)\uE000/g;
// Stand-ins for the tracking parameters until the URL is a string, as the newsletter renderer
// does with `--uuid--`: URL objects percent-encode `%%{...}%%`.
const UUID_MARKER = '--uuid--';
const STEP_ID_MARKER = '--step-id--';

/**
 * @typedef {object} Recipient
 * @prop {{name?: string | null, email?: string, uuid?: string}} member
 * @prop {string | null} [automationRunStepId]
 */

/**
 * @typedef {object} ReplacementDefinition
 * @prop {string} id - The placeholder `%%{<id>}%%` in the rendered template
 * @prop {RegExp} token - Matches every occurrence of the placeholder
 * @prop {(recipient: Recipient) => string} getValue
 * @prop {boolean} trusted - Server-generated values that are inserted into the HTML unescaped
 */

/**
 * @typedef {object} RenderedTemplate
 * @prop {string} html
 * @prop {string} text
 * @prop {string} subject
 * @prop {ReplacementDefinition[]} replacementDefinitions
 */

/** @type {Record<string, (recipient: Recipient) => string | null | undefined>} */
const MEMBER_VALUES = {
  first_name: ({ member }) => {
    const name = member.name?.trim();
    if (!name) {
      return undefined;
    }
    return name.split(/\s+/)[0];
  },
  name: ({ member }) => member.name,
  email: ({ member }) => member.email,
  uuid: ({ member }) => member.uuid,
};

// Server-generated values, inserted unescaped as newsletters do.
const TRUSTED_IDS = new Set(['uuid', 'step_id', 'unsubscribe_url', 'list_unsubscribe']);

// The token names authors can write in content and subjects; anything else is removed.
const CONTENT_TOKEN_IDS = [...Object.keys(MEMBER_VALUES), 'site_title', 'site_url'];

class MemberWelcomeEmailRenderer {
  #wrapperTemplate;
  #dir;
  #urlUtils;
  #linkTracking;
  #renderLexical;

  /**
   * @param {object} deps
   * @param {(key: string, options?: object) => string} deps.t
   * @param {(locale: string) => string} [deps.dir]
   * @param {object} deps.labs
   * @param {object} deps.urlUtils
   * @param {{addAutomationTrackingToUrl: (url: URL, automationActionRevisionId: string, automationRunStepId: string, memberUuid: string) => Promise<URL>}} deps.linkTracking - Called with placeholder markers for the step ID and member UUID
   * @param {(handlebars: object, labs: object, t: Function) => void} deps.registerHelpers
   * @param {(lexical: string, options: {target: 'email', design: object}) => Promise<string>} deps.renderLexical
   * @param {(name: 'baseStyles' | 'contentStyles' | 'cardStyles' | 'styles' | 'emailWrapper' | 'wrapper') => string} deps.readTemplate
   */
  constructor({
    t,
    dir,
    labs,
    urlUtils,
    linkTracking,
    registerHelpers,
    renderLexical,
    readTemplate,
  }) {
    this.#dir = dir;
    this.#urlUtils = urlUtils;
    this.#linkTracking = linkTracking;
    this.#renderLexical = renderLexical;
    this.Handlebars = require('handlebars').create();
    registerHelpers(this.Handlebars, labs, t);
    for (const partial of ['baseStyles', 'contentStyles', 'cardStyles', 'styles', 'emailWrapper']) {
      this.Handlebars.registerPartial(partial, readTemplate(partial));
    }
    this.#wrapperTemplate = this.Handlebars.compile(readTemplate('wrapper'));
  }

  /**
   * Resolves the tokens authors write in content and subjects. Site tokens become their values,
   * member tokens become `%%{<id>}%%` placeholders, and unknown tokens are removed.
   * Supports fallback values: {first_name, "friend"} renders "friend" if name is empty
   * @param {object} options
   * @param {string} options.text - The text to process (content body or subject line)
   * @param {{title: string, url: string}} options.siteSettings
   * @param {(property: string, fallback: string | undefined) => string} options.placeholderFor - Returns the placeholder id for a member token
   * @param {boolean} [options.escapeHtml=false] - Whether to HTML-escape site values
   * @returns {string}
   */
  #resolveTokens({ text, siteSettings, placeholderFor, escapeHtml = false }) {
    const siteValues = { site_title: siteSettings.title, site_url: siteSettings.url };

    const processed = wrapReplacementStrings(text).replace(
      REPLACEMENT_REGEX,
      (match, property, fallback) => {
        if (Object.hasOwn(MEMBER_VALUES, property)) {
          return `${MARKER}${placeholderFor(property, fallback)}${MARKER}`;
        }
        if (Object.hasOwn(siteValues, property)) {
          const resolved = siteValues[property] || fallback || '';
          return escapeHtml ? this.Handlebars.Utils.escapeExpression(resolved) : resolved;
        }
        return match;
      },
    );

    return processed
      .replace(UNMATCHED_TOKEN_REGEX, '')
      .replace(MARKED_PLACEHOLDER_REGEX, '%%{$1}%%');
  }

  /**
   * Renders a member welcome email as a template that every recipient can share. Member values
   * stay as `%%{<id>}%%` placeholders; `personalize` fills them in for one recipient.
   * @param {Object} options
   * @param {string} options.lexical - Lexical JSON string to render
   * @param {string} options.subject - Email subject (may contain template variables)
   * @param {undefined | null | Object} options.designSettings - Email design settings loaded from the database
   * @param {Object} options.siteSettings - Site settings (title, url, accentColor)
   * @param {(memberUuid: string) => string} [options.getUnsubscribeUrl] - When set, the footer shows an "Unsubscribe from these emails" link instead of "Manage your preferences", and the email carries a List-Unsubscribe value
   * @param {boolean} [options.trackClicks] - Tracked links carry the recipient's member UUID and run step ID, so the caller passes true only when every recipient has both
   * @param {string | null} [options.automationActionRevisionId]
   * @returns {Promise<RenderedTemplate>}
   */
  async render({
    lexical,
    subject,
    designSettings,
    siteSettings,
    getUnsubscribeUrl,
    trackClicks = false,
    automationActionRevisionId = null,
  }) {
    designSettings = designSettings || {};

    const design = emailDesign.getEmailDesign({
      accentColor: siteSettings.accentColor,
      backgroundColor: designSettings.background_color,
      buttonColor: designSettings.button_color,
      buttonCorners: designSettings.button_corners,
      buttonStyle: designSettings.button_style,
      dividerColor: designSettings.divider_color,
      headerBackgroundColor: designSettings.header_background_color,
      imageCorners: designSettings.image_corners,
      linkColor: designSettings.link_color,
      linkStyle: designSettings.link_style,
      postTitleColor: null,
      sectionTitleColor: designSettings.section_title_color,
      titleFontWeight: designSettings.title_font_weight,
    });

    let content;
    try {
      const absoluteLexical = this.#urlUtils.transformReadyToAbsolute(lexical);
      content = await this.#renderLexical(absoluteLexical, { target: 'email', design });
    } catch (err) {
      throw new errors.IncorrectUsageError({
        message: MESSAGES.INVALID_LEXICAL_STRUCTURE,
        context: err.message,
      });
    }

    // Remove <code> wrappers around replacement strings (Lexical treats curly braces as inline code)
    const tokenIds = CONTENT_TOKEN_IDS.join('|');
    content = content.replace(
      new RegExp(`<code>(\\{(?:${tokenIds})(?:\\s*,?\\s*"[^"]*")?\\})<\\/code>`, 'g'),
      '$1',
    );

    // A token with a fallback gets its own placeholder, whose value applies the fallback.
    /** @type {Map<string, (recipient: Recipient) => string>} */
    const getters = new Map();
    for (const [id, getValue] of Object.entries(MEMBER_VALUES)) {
      getters.set(id, (recipient) => getValue(recipient) || '');
    }
    getters.set('step_id', (recipient) => recipient.automationRunStepId || '');
    if (getUnsubscribeUrl) {
      getters.set('unsubscribe_url', (recipient) => getUnsubscribeUrl(recipient.member.uuid));
    }
    /** @type {Map<string, string>} */
    const fallbackIds = new Map();
    const placeholderFor = (property, fallback) => {
      if (!fallback) {
        return property;
      }
      const key = JSON.stringify([property, fallback]);
      let id = fallbackIds.get(key);
      if (!id) {
        id = `${property}_${fallbackIds.size + 2}`;
        fallbackIds.set(key, id);
        getters.set(id, (recipient) => MEMBER_VALUES[property](recipient) || fallback);
      }
      return id;
    };

    const contentWithPlaceholders = this.#resolveTokens({
      text: content,
      siteSettings,
      placeholderFor,
      escapeHtml: true,
    });
    const subjectWithPlaceholders = this.#resolveTokens({
      text: subject,
      siteSettings,
      placeholderFor,
    });

    // Resolve relative links, including Ghost Portal routes such as #/portal/signup,
    // while preserving document-local anchors such as #section.
    const contentWithAbsoluteLinks = await linkReplacer.replace(
      contentWithPlaceholders,
      async (url, originalPath) => {
        const isDocumentAnchor = originalPath.startsWith('#') && !originalPath.startsWith('#/');
        if (isDocumentAnchor) {
          return originalPath;
        }
        // A whole-href placeholder stays as written, as in newsletters: its value is only known
        // per recipient, so neither the site URL nor tracking can be added to it here.
        if (/^%%\{\w+\}%%$/.test(originalPath)) {
          return originalPath;
        }
        // Parsing percent-encodes placeholders in the path (`%%{uuid}%%` becomes `%%%7Buuid%7D%%`).
        const urlWithPlaceholders = url.toString().replace(/%%%7B(\w+)%7D%%/gi, '%%{$1}%%');
        const isTrackable = ['http:', 'https:'].includes(url.protocol);
        // The redirect fills in only %%{uuid}%% (from ?m=), so a link with any other member
        // placeholder can't share one redirect across recipients and stays untracked.
        const hasOtherPlaceholders = [...urlWithPlaceholders.matchAll(PLACEHOLDER_REGEX)].some(
          ([, id]) => id !== 'uuid',
        );
        if (trackClicks && automationActionRevisionId && isTrackable && !hasOtherPlaceholders) {
          const trackedUrl = await this.#linkTracking.addAutomationTrackingToUrl(
            url,
            automationActionRevisionId,
            STEP_ID_MARKER,
            UUID_MARKER,
          );
          // Only the m and step values: the redirect path, which includes the site's own
          // path, may contain the marker text too.
          return trackedUrl
            .toString()
            .replace(new RegExp(`([?&])m=${UUID_MARKER}(?=&|$)`), '$1m=%%{uuid}%%')
            .replace(new RegExp(`([?&])step=${STEP_ID_MARKER}(?=&|$)`), '$1step=%%{step_id}%%');
        }
        return urlWithPlaceholders;
      },
      { base: siteSettings.url },
    );

    const managePreferencesUrl = new URL('#/portal/account/newsletters', siteSettings.url).href;
    const year = new Date().getFullYear();
    const headerImage = designSettings.header_image || null;
    const showHeaderIcon =
      designSettings.show_header_icon !== false && Boolean(siteSettings.iconUrl);
    const showHeaderTitle = designSettings.show_header_title !== false;
    const showBadge = designSettings.show_badge !== false;
    const bodyFontCategory = designSettings.body_font_category === 'serif' ? 'serif' : 'sans_serif';

    const html = this.#wrapperTemplate({
      content: contentWithAbsoluteLinks,
      emailTitle: subjectWithPlaceholders,
      subject: subjectWithPlaceholders,
      footerContent: designSettings.footer_content || null,
      hasHeaderContent: Boolean(headerImage || showHeaderIcon || showHeaderTitle),
      headerImage,
      showBadge,
      showHeaderIcon,
      showHeaderName: false,
      showHeaderTitle,
      site: {
        iconUrl: siteSettings.iconUrl || null,
        title: siteSettings.title,
        url: siteSettings.url,
        locale: siteSettings.locale || 'en',
        direction: (this.#dir && this.#dir(siteSettings.locale || 'en')) || 'ltr',
      },
      siteTitle: siteSettings.title,
      siteUrl: siteSettings.url,
      managePreferencesUrl,
      unsubscribeUrl: getUnsubscribeUrl ? '%%{unsubscribe_url}%%' : null,
      year,
      ctaBgColors: ['grey', 'blue', 'green', 'yellow', 'red', 'pink', 'purple', 'white'],
      ...design,
      classes: {
        container: 'container',
        content: bodyFontCategory !== 'serif' ? 'post-content-sans-serif' : 'post-content',
      },
    });

    const { html: inlinedHtml, plaintext: text } = finalize(html);

    const usedIds = new Set(
      [...`${inlinedHtml}${subjectWithPlaceholders}`.matchAll(PLACEHOLDER_REGEX)].map(
        ([, id]) => id,
      ),
    );
    /** @type {ReplacementDefinition[]} */
    const replacementDefinitions = [...getters]
      .filter(([id]) => usedIds.has(id))
      .map(([id, getValue]) => ({
        id,
        token: new RegExp(`%%\\{${id}\\}%%`, 'g'),
        getValue,
        trusted: TRUSTED_IDS.has(id),
      }));
    if (getUnsubscribeUrl) {
      replacementDefinitions.push({
        id: 'list_unsubscribe',
        token: /%%\{list_unsubscribe\}%%/g,
        getValue: (recipient) => getUnsubscribeUrl(recipient.member.uuid),
        trusted: true,
      });
    }

    return {
      html: inlinedHtml,
      text,
      subject: subjectWithPlaceholders,
      replacementDefinitions,
    };
  }

  /**
   * Fills in a rendered template's placeholders for one recipient, as Mailgun does with
   * recipient variables: one pass over each string, so an inserted value is never scanned
   * again. Values that aren't trusted are HTML-escaped in the HTML body only, with Handlebars'
   * escapeExpression, as newsletters escape their `_html` recipient variables.
   * @param {RenderedTemplate} rendered
   * @param {Recipient} recipient
   * @returns {{html: string, text: string, subject: string, listUnsubscribe: string | undefined}}
   */
  personalize({ html, text, subject, replacementDefinitions }, recipient) {
    /** @type {Map<string, {value: string, htmlValue: string}>} */
    const values = new Map();
    for (const definition of replacementDefinitions) {
      const value = definition.getValue(recipient);
      values.set(definition.id, {
        value,
        htmlValue: definition.trusted ? value : this.Handlebars.Utils.escapeExpression(value),
      });
    }
    const fill = (str, key) =>
      str.replace(PLACEHOLDER_REGEX, (match, id) => values.get(id)?.[key] ?? match);
    return {
      html: fill(html, 'htmlValue'),
      text: fill(text, 'value'),
      subject: fill(subject, 'value'),
      listUnsubscribe: values.get('list_unsubscribe')?.value,
    };
  }
}

module.exports = MemberWelcomeEmailRenderer;
