module.exports = class CustomThemeSettingsBREADService {
  /**
   * @param {Object} options
   * @param {Object} options.model - Bookshelf model for custom theme settings
   */
  constructor({ model }) {
    this.Model = model;
  }

  async browse(data, options = {}) {
    return this.Model.findAll(data, options);
  }

  async read(data, options = {}) {
    return this.Model.findOne(data, options);
  }

  async edit(data, options = {}) {
    return this.Model.edit(data, Object.assign({}, options, { method: 'update' }));
  }

  async add(data, options = {}) {
    return this.Model.add(data, options);
  }

  async destroy(data, options = {}) {
    return this.Model.destroy(data, options);
  }

  async transaction(fn) {
    return this.Model.transaction(fn);
  }

  /**
   * Locks the active theme setting row so concurrent syncs run one at a time.
   * A new theme has no rows of its own to lock.
   */
  async lockActiveTheme(transacting) {
    await transacting('settings').where('key', 'active_theme').forUpdate().first('id');
  }
};
