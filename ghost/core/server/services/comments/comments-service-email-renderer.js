class CommentsServiceEmailRenderer {
  constructor({ t, readTemplate }) {
    this.t = t;
    this.readTemplate = readTemplate;

    this.Handlebars = require('handlebars').create();
    this.Handlebars.registerHelper('t', function (key, options) {
      const hash = options?.hash;
      const params = hash || options || {};

      return t(key, {
        ...params,
        interpolation: { escapeValue: false },
      });
    });
    this.Handlebars.registerHelper('concat', (...args) => {
      args.pop(); // Remove the options object
      return new this.Handlebars.SafeString(args.join(''));
    });
  }

  async renderEmailTemplate(templateName, data) {
    const htmlTemplateSource = await this.readTemplate(templateName);
    const htmlTemplate = this.Handlebars.compile(htmlTemplateSource);
    const { renderText } = require(`./email-templates/${templateName}.txt`);

    const html = htmlTemplate(data);
    const text = renderText(data, this.t);

    return { html, text };
  }
}

module.exports = CommentsServiceEmailRenderer;
