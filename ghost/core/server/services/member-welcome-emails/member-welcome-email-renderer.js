const { finalize } = require('../../lib/email-rendering/finalize');
const errors = require('@tryghost/errors');
const { MESSAGES } = require('./constants');
const { wrapReplacementStrings } = require('@tryghost/kg-default-nodes').utils.replacementStrings;
const linkReplacer = require('../../lib/link-replacer');
const emailDesign = require('../../lib/email-rendering/email-design');
const {
  addFirstNameSlot,
  escapeUnsubscribeHref,
  getFirstName,
  hasFirstNameTextSlots,
  unsubscribePlaceholder,
} = require('./automation-first-name-template');

/** @import { memoize } from '../../../shared/memoize' */

const REPLACEMENT_REGEX = /%%\{(\w+?)(?:,? *"(.*?)")?\}%%/g;
const UNMATCHED_TOKEN_REGEX = /%%\{.*?\}%%/g;
const FINALIZED_EMAIL_CACHE_SIZE = 25;

class MemberWelcomeEmailRenderer {
  #wrapperTemplate;
  #dir;
  #urlUtils;
  #linkTracking;
  #renderLexical;
  #finalizeEmailRender;

  /**
   * @param {object} deps
   * @param {(key: string, options?: object) => string} deps.t
   * @param {(locale: string) => string} [deps.dir]
   * @param {object} deps.labs
   * @param {object} deps.urlUtils
   * @param {{addAutomationTrackingToUrl: (url: URL, automationActionRevisionId: string, automationRunStepId: string, memberUuid: string) => Promise<URL>}} deps.linkTracking
   * @param {(handlebars: object, labs: object, t: Function) => void} deps.registerHelpers
   * @param {(lexical: string, options: {target: 'email', design: object}) => Promise<string>} deps.renderLexical
   * @param {typeof memoize} deps.memoize
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
    memoize,
    readTemplate,
  }) {
    this.#dir = dir;
    this.#urlUtils = urlUtils;
    this.#linkTracking = linkTracking;
    this.#renderLexical = renderLexical;
    // Cache finished emails so repeated sends avoid slow CSS inlining; each member's unsubscribe link is added afterward.
    this.#finalizeEmailRender = memoize(finalize, (html) => html, {
      max: FINALIZED_EMAIL_CACHE_SIZE,
    });
    this.Handlebars = require('handlebars').create();
    registerHelpers(this.Handlebars, labs, t);
    for (const partial of ['baseStyles', 'contentStyles', 'cardStyles', 'styles', 'emailWrapper']) {
      this.Handlebars.registerPartial(partial, readTemplate(partial));
    }
    this.#wrapperTemplate = this.Handlebars.compile(readTemplate('wrapper'));
  }

  /**
   * Builds replacement token definitions for member and site data
   * @param {Object} options
   * @param {Object} options.member - Member data
   * @param {string} [options.member.name] - Member's full name
   * @param {string} [options.member.email] - Member's email address
   * @param {Object} options.siteSettings - Site settings
   * @param {string} options.siteSettings.title - Site title
   * @param {string} options.siteSettings.url - Site URL
   * @returns {{id: string, getValue: () => string|undefined}[]}
   */
  #buildReplacementDefinitions({ member, siteSettings }) {
    return [
      { id: 'first_name', getValue: () => getFirstName(member.name) },
      { id: 'name', getValue: () => member.name },
      { id: 'email', getValue: () => member.email },
      { id: 'uuid', getValue: () => member.uuid },
      { id: 'site_title', getValue: () => siteSettings.title },
      { id: 'site_url', getValue: () => siteSettings.url },
    ];
  }

  /**
   * Applies replacement tokens to a string
   * Supports fallback values: {first_name, "friend"} renders "friend" if name is empty
   * @param {Object} options
   * @param {{id: string, getValue: () => string|undefined}[]} options.definitions - Replacement token definitions
   * @param {string} options.text - The text to process (content body or subject line)
   * @param {boolean} [options.escapeHtml=false] - Whether to HTML-escape replaced values
   * @param {(options: {property: string, fallback?: string, resolved: string}) => string} [options.resolve]
   * @returns {string}
   */
  #applyReplacements({ definitions, text, escapeHtml = false, resolve }) {
    let processed = wrapReplacementStrings(text);

    processed = processed.replace(REPLACEMENT_REGEX, (match, property, fallback) => {
      const def = definitions.find((d) => d.id === property);
      if (def) {
        const value = def.getValue() || fallback || '';
        const resolved = resolve ? resolve({ property, fallback, resolved: value }) : value;
        return escapeHtml ? this.Handlebars.Utils.escapeExpression(resolved) : resolved;
      }
      return match;
    });

    return processed.replace(UNMATCHED_TOKEN_REGEX, '');
  }

  /**
   * Renders a member welcome email
   * @param {Object} options
   * @param {string} options.lexical - Lexical JSON string to render
   * @param {string} options.subject - Email subject (may contain template variables)
   * @param {undefined | null | Object} options.designSettings - Email design settings loaded from the database
   * @param {Object} options.member - Member data (name, email)
   * @param {Object} options.siteSettings - Site settings (title, url, accentColor)
   * @param {string} [options.unsubscribeUrl] - When set, the footer shows an "Unsubscribe from these emails" link instead of "Manage your preferences"
   * @param {boolean} [options.trackClicks]
   * @param {string | null} [options.automationActionRevisionId]
   * @param {string | null} [options.automationRunStepId]
   * @returns {Promise<{html: string, text: string, subject: string}>}
   */
  async render(options) {
    return await this.#render(options);
  }

  async renderFirstNameTemplate(options) {
    return await this.#render(
      {
        ...options,
        member: {},
        unsubscribeUrl: options.unsubscribeUrl ? unsubscribePlaceholder : undefined,
      },
      [],
    );
  }

  async #render(
    {
      lexical,
      subject,
      designSettings,
      member,
      siteSettings,
      unsubscribeUrl,
      trackClicks = false,
      automationActionRevisionId = null,
      automationRunStepId = null,
    },
    firstNameSlots,
  ) {
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

    const definitions = this.#buildReplacementDefinitions({ member, siteSettings });

    // Remove <code> wrappers around replacement strings (Lexical treats curly braces as inline code)
    const tokenIds = definitions.map((d) => d.id).join('|');
    content = content.replace(
      new RegExp(`<code>(\\{(?:${tokenIds})(?:\\s*,?\\s*"[^"]*")?\\})<\\/code>`, 'g'),
      '$1',
    );

    let unsupportedTemplate = false;
    const resolve =
      (inBody) =>
      ({ property, fallback, resolved }) => {
        if (inBody && property === 'first_name') {
          return addFirstNameSlot(firstNameSlots, fallback);
        }
        if (['first_name', 'name', 'email', 'uuid'].includes(property)) {
          unsupportedTemplate = true;
        }
        return resolved;
      };
    const contentWithReplacements = this.#applyReplacements({
      definitions,
      text: content,
      escapeHtml: true,
      ...(firstNameSlots && { resolve: resolve(true) }),
    });
    const subjectWithReplacements = this.#applyReplacements({
      definitions,
      text: subject,
      escapeHtml: false,
      ...(firstNameSlots && { resolve: resolve(false) }),
    });
    if (
      firstNameSlots &&
      (unsupportedTemplate ||
        !firstNameSlots.length ||
        !hasFirstNameTextSlots(contentWithReplacements, firstNameSlots))
    ) {
      return null;
    }

    // Resolve relative links, including Ghost Portal routes such as #/portal/signup,
    // while preserving document-local anchors such as #section.
    const contentWithAbsoluteLinks = await linkReplacer.replace(
      contentWithReplacements,
      async (url, originalPath) => {
        const isDocumentAnchor = originalPath.startsWith('#') && !originalPath.startsWith('#/');
        if (isDocumentAnchor) {
          return originalPath;
        }
        const isTrackable = ['http:', 'https:'].includes(url.protocol);
        if (firstNameSlots && trackClicks && isTrackable) {
          unsupportedTemplate = true;
          return url;
        }
        if (
          trackClicks &&
          automationActionRevisionId &&
          automationRunStepId &&
          member.uuid &&
          isTrackable
        ) {
          return await this.#linkTracking.addAutomationTrackingToUrl(
            url,
            automationActionRevisionId,
            automationRunStepId,
            member.uuid,
          );
        }
        return url;
      },
      { base: siteSettings.url },
    );
    if (unsupportedTemplate) {
      return null;
    }

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
      emailTitle: subjectWithReplacements,
      subject: subjectWithReplacements,
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
      unsubscribeUrl: unsubscribeUrl ? unsubscribePlaceholder : null,
      year,
      ctaBgColors: ['grey', 'blue', 'green', 'yellow', 'red', 'pink', 'purple', 'white'],
      ...design,
      classes: {
        container: 'container',
        content: bodyFontCategory !== 'serif' ? 'post-content-sans-serif' : 'post-content',
      },
    });

    let { html: inlinedHtml, plaintext: text } =
      unsubscribeUrl || firstNameSlots ? this.#finalizeEmailRender(html) : finalize(html);

    if (unsubscribeUrl) {
      const escapedUrl = escapeUnsubscribeHref(unsubscribeUrl);
      inlinedHtml = inlinedHtml.replaceAll(unsubscribePlaceholder, () => escapedUrl);
      text = text.replaceAll(unsubscribePlaceholder, () => unsubscribeUrl);
    }

    if (firstNameSlots) {
      if (
        firstNameSlots.some(
          ({ marker }) => inlinedHtml.split(marker).length !== 2 || text.split(marker).length !== 2,
        )
      ) {
        return null;
      }
      return { html: inlinedHtml, text, subject: subjectWithReplacements, slots: firstNameSlots };
    }
    return {
      html: inlinedHtml,
      text,
      subject: subjectWithReplacements,
    };
  }
}

module.exports = MemberWelcomeEmailRenderer;
