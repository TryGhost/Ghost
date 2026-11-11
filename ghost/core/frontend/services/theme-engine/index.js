const active = require('./active');
const previewTheme = require('./preview-theme');

/**
 * Renders a template with the theme of the current request: res.render for the
 * active theme, which is mounted into Express, or a previewed theme's own engine
 *
 * @param {import('express').Response} res
 * @param {string} name
 * @param {object} data
 * @param {Function} cb
 */
function render(res, name, data, cb) {
  const theme = active.get();

  if (theme && theme.isPreview) {
    return theme.render(res, name, data, cb);
  }

  return res.render(name, data, cb);
}

module.exports = {
  getActive: active.get,
  setActive: active.set,
  middleware: require('./middleware'),
  previewMiddleware: previewTheme.middleware,
  render,
};
