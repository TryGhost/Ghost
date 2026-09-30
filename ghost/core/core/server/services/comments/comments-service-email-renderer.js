const { promises: fs } = require('fs');
const path = require('path');

const LINK_ATTRIBUTES = ['class', 'href', 'target', 'style'];

class CommentsServiceEmailRenderer {
  constructor({ t }) {
    this.t = t;

    this.Handlebars = require('handlebars').create();
    this.Handlebars.registerHelper('t', function (key, options) {
      const hash = options?.hash;
      const params = hash || options || {};

      return t(key, {
        ...params,
        interpolation: { escapeValue: false },
      });
    });
    // Only place HTML is assembled for `t` placeholders; all inputs are escaped
    this.Handlebars.registerHelper('link', (href, text, options) => {
      const { SafeString } = this.Handlebars;
      const escapeHtml = (value) => this.Handlebars.escapeExpression(String(value ?? ''));
      const { prefix = '', ...attrs } = options?.hash || {};
      const attributes = { ...attrs, href: `${prefix}${href ?? ''}` };
      const html = LINK_ATTRIBUTES.filter((name) => attributes[name] !== undefined)
        .map((name) => ` ${name}="${escapeHtml(attributes[name])}"`)
        .join('');

      return new SafeString(`<a${html}>${escapeHtml(text)}</a>`);
    });
  }

  async renderEmailTemplate(templateName, data) {
    const htmlTemplateSource = await fs.readFile(
      path.join(__dirname, './email-templates/', `${templateName}.hbs`),
      'utf8',
    );
    const htmlTemplate = this.Handlebars.compile(Buffer.from(htmlTemplateSource).toString());
    const { renderText } = require(`./email-templates/${templateName}.txt`);

    const html = htmlTemplate(data);
    const text = renderText(data, this.t);

    return { html, text };
  }
}

module.exports = CommentsServiceEmailRenderer;
