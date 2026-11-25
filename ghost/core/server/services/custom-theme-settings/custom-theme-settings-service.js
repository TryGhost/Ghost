const isEmpty = require('lodash/isEmpty');
const BREAD = require('./custom-theme-settings-bread-service');
const nql = require('@tryghost/nql');
const tpl = require('@tryghost/tpl');
const { ValidationError } = require('@tryghost/errors');
const debug = require('@tryghost/debug')('custom-theme-settings-service');

const messages = {
  problemFindingSetting: 'Unknown setting: {key}.',
  unallowedValueForSetting: "Unallowed value for '{key}'. Allowed values: {allowedValues}.",
  invalidValueForSetting: "Invalid value for '{key}'. The value must follow this format: {format}.",
};

const HIDDEN_SETTING_VALUE = null;

module.exports = class CustomThemeSettingsService {
  /**
   * @param {Object} options
   * @param {any} options.model - Bookshelf-like model instance for storing theme setting key/value pairs
   * @param {import('../../../shared/custom-theme-settings-cache/custom-theme-settings-cache')} options.cache - Instance of a custom key/value pair cache
   */
  constructor({ model, cache }) {
    this.activeThemeName = null;

    /** @private */
    this._activatingPromise = null;
    this._activatingName = null;
    this._activatingSettings = null;

    this._repository = new BREAD({ model });
    this._valueCache = cache;
    this._activeThemeSettings = {};
  }

  /**
   * The service only deals with one theme at a time,
   * that theme is changed by calling this method with the output from gscan.
   *
   * To avoid syncing issues with activateTheme being called in quick succession,
   * any previous/still-running activation promise is awaited before re-starting
   * if necessary.
   *
   * @param {string} name - the name of the theme (Ghost has different names to themes with duplicate package.json names)
   * @param {Object} theme - checked theme output from gscan
   */
  async activateTheme(name, theme) {
    const activate = async () => {
      this.activeThemeName = name;

      // add/remove/edit key/value records in the respository to match theme settings
      const settings = await this._syncRepositoryWithTheme(name, theme);

      // populate the shared cache with all key/value pairs for this theme
      this._populateValueCacheForTheme(theme, settings);
      // populate the cache used for exposing full setting details for editing
      this._populateInternalCacheForTheme(theme, settings);
    };

    if (this._activatingPromise) {
      // NOTE: must be calculated before awaiting promise as the promise finishing will clear the properties
      const isSameName = name === this._activatingName;
      const isSameSettings = JSON.stringify(theme.customSettings) === this._activatingSettings;

      // wait for previous activation to finish
      await this._activatingPromise;

      // skip sync if we're re-activating exactly the same theme settings
      if (isSameName && isSameSettings) {
        return;
      }
    }

    try {
      this._activatingName = name;
      this._activatingSettings = JSON.stringify(theme.customSettings);
      this._activatingPromise = activate();

      await this._activatingPromise;
    } finally {
      this._activatingPromise = null;
      this._activatingName = null;
      this._activatingSettings = null;
    }
  }

  /**
   * Convert the key'd internal cache object to an array suitable for use with Ghost's API
   */
  listSettings() {
    const settingObjects = Object.entries(this._activeThemeSettings).map(([key, setting]) => {
      return Object.assign({}, setting, { key });
    });

    return settingObjects;
  }

  /**
   * @param {Array} settings - array of setting objects with at least key and value properties
   */
  async updateSettings(settings) {
    // abort if any settings do not match known settings
    const firstUnknownSetting = settings.find((setting) => !this._activeThemeSettings[setting.key]);

    if (firstUnknownSetting) {
      throw new ValidationError({
        message: tpl(messages.problemFindingSetting, { key: firstUnknownSetting.key }),
      });
    }

    settings.forEach((setting) => {
      const definition = this._activeThemeSettings[setting.key];
      switch (definition.type) {
        case 'select':
          if (!definition.options.includes(setting.value)) {
            throw new ValidationError({
              message: tpl(messages.unallowedValueForSetting, {
                key: setting.key,
                allowedValues: definition.options.join(', '),
              }),
            });
          }
          break;
        case 'boolean':
          if (![true, false].includes(setting.value)) {
            throw new ValidationError({
              message: tpl(messages.unallowedValueForSetting, {
                key: setting.key,
                allowedValues: [true, false].join(', '),
              }),
            });
          }
          break;
        case 'color':
          if (!/^#[0-9a-f]{6}$/i.test(setting.value)) {
            throw new ValidationError({
              message: tpl(messages.invalidValueForSetting, {
                key: setting.key,
                format: '#1234AF',
              }),
            });
          }
          break;
        default:
          break;
      }
    });

    // save the new values
    for (const setting of settings) {
      const theme = this.activeThemeName;
      const { key, value } = setting;

      const settingRecord = await this._repository.read({ theme, key });

      settingRecord.set('value', value);

      if (settingRecord.hasChanged()) {
        await settingRecord.save(null);
      }

      // update the internal cache
      this._activeThemeSettings[setting.key].value = setting.value;
    }

    const settingsObjects = this.listSettings();

    // update the public cache
    this._valueCache.populate(this._computeCachedSettings(settingsObjects));

    // return full setting objects
    return settingsObjects;
  }

  /**
   * Duplicate stored settings from one theme to another, e.g. when a theme
   * is saved as a copy under a new name.
   *
   * No-ops if the destination theme already has stored settings so existing
   * customisations are never overwritten. Values are copied verbatim - they
   * are reconciled against the destination theme's settings definition by
   * the sync that runs when that theme is activated.
   *
   * @param {string} fromThemeName
   * @param {string} toThemeName
   */
  async copySettingsBetweenThemes(fromThemeName, toThemeName) {
    const sourceSettings = await this._repository.browse({ filter: `theme:'${fromThemeName}'` });

    // single transaction so a failure part-way leaves no partial copy
    // behind that would make later attempts skip the copy. The
    // destination check locks inside the same transaction so concurrent
    // copies can't both see an empty destination and insert duplicates
    await this._repository.transaction(async (transacting) => {
      const destinationSettings = await this._repository.browse({
        filter: `theme:'${toThemeName}'`,
        transacting,
        forUpdate: true,
      });

      if (destinationSettings.length > 0) {
        debug(
          `Skipping copy of custom theme settings from '${fromThemeName}' to '${toThemeName}' - destination already has settings`,
        );
        return;
      }

      for (const setting of sourceSettings) {
        debug(`Copying custom theme setting '${fromThemeName}.${setting.key}' to '${toThemeName}'`);
        await this._repository.add(
          {
            theme: toThemeName,
            key: setting.key,
            type: setting.type,
            value: setting.value,
          },
          { transacting },
        );
      }
    });
  }

  // Private -----------------------------------------------------------------

  /**
   * @param {string} name - name of the theme
   * @param {Object} theme - checked theme output from gscan
   * @returns {Promise<Array>} - list of stored theme record objects
   * @private
   */
  async _syncRepositoryWithTheme(name, theme) {
    const themeSettings = theme.customSettings || {};
    const filter = `theme:'${name}'`;

    return this._repository.transaction(async (transacting) => {
      // the lock comes first, a read before it could miss what a concurrent sync wrote
      await this._repository.lockActiveTheme(transacting);

      const knownSettings = await this._repository.browse({ filter, transacting });
      const changes = this._getChanges(name, themeSettings, knownSettings);

      // exit early if there's nothing to sync for this theme
      if (!changes) {
        return knownSettings;
      }

      if (changes.remove.length) {
        await this._repository.destroyMany(changes.remove, { transacting });
      }

      for (const { id, value } of changes.reset) {
        await this._repository.edit({ value }, { id, transacting });
      }

      for (const newSettingValues of changes.add) {
        await this._repository.add(newSettingValues, { transacting });
      }

      return this._repository.browse({ filter, transacting });
    });
  }

  /**
   * Compares the stored records with the theme's settings
   *
   * @param {string} name - name of the theme
   * @param {Object} themeSettings - custom settings defined by the theme
   * @param {Array} knownSettings - stored theme record objects
   * @returns {{remove: string[], reset: Object[], add: Object[]}|null} - records to write, null when they already match
   * @private
   */
  _getChanges(name, themeSettings, knownSettings) {
    const remove = [];
    const reset = [];
    const add = [];

    // sync any knownSettings that have changed in the theme
    for (const knownSetting of knownSettings) {
      const themeSetting = themeSettings[knownSetting.key];

      const hasBeenRemoved = !themeSetting;
      const hasChangedType = themeSetting && themeSetting.type !== knownSetting.type;

      if (hasBeenRemoved || hasChangedType) {
        debug(
          `Removing custom theme setting '${name}.${knownSetting.key}' - ${hasBeenRemoved ? 'not found in theme' : 'type changed'}`,
        );
        remove.push(knownSetting.id);
        continue;
      }

      // replace value with default if it's not a valid select option
      if (themeSetting.options && !themeSetting.options.includes(knownSetting.value)) {
        debug(
          `Resetting custom theme setting value '${name}.${themeSetting.key}' - "${knownSetting.value}" is not a valid option`,
        );
        reset.push({ id: knownSetting.id, value: themeSetting.default });
      }
    }

    // add any new settings found in theme (or re-add settings that were removed due to type change)
    const knownSettingsKeys = knownSettings
      .filter((setting) => !remove.includes(setting.id))
      .map((setting) => setting.key);

    for (const [key, setting] of Object.entries(themeSettings)) {
      if (!knownSettingsKeys.includes(key)) {
        debug(`Adding custom theme setting '${name}.${key}'`);
        add.push({
          theme: name,
          key,
          type: setting.type,
          value: setting.default,
        });
      }
    }

    return remove.length || reset.length || add.length ? { remove, reset, add } : null;
  }

  /**
   * @param {Object} theme - checked theme output from gscan
   * @param {Array} settings - theme settings fetched from repository
   * @private
   */
  _populateValueCacheForTheme(theme, settings) {
    if (isEmpty(theme.customSettings)) {
      this._valueCache.populate([]);
      return;
    }

    this._valueCache.populate(this._computeCachedSettings(settings));
  }

  /**
   * @param {Object} theme - checked theme output from gscan
   * @param {Array} settings - theme settings fetched from repository
   * @private
   */
  _populateInternalCacheForTheme(theme, settings) {
    if (isEmpty(theme.customSettings)) {
      this._activeThemeSettings = new Map();
      return;
    }

    const settingValues = settings.reduce((acc, setting) => {
      acc[setting.key] = setting;
      return acc;
    }, new Object());

    const activeThemeSettings = new Object();

    for (const [key, setting] of Object.entries(theme.customSettings)) {
      // value comes from the stored key/value pairs rather than theme, we don't need the ID - theme name + key is enough
      activeThemeSettings[key] = Object.assign({}, setting, {
        id: settingValues[key].id,
        value: settingValues[key].value,
      });
    }

    this._activeThemeSettings = activeThemeSettings;
  }

  /**
   * Compute the settings to cache, taking into account visibility rules
   *
   * @param {Object[]} settings - list of setting objects
   * @returns {Object[]} - list of setting objects with visibility rules applied
   * @private
   */
  _computeCachedSettings(settings) {
    const settingsMap = settings.reduce((map, { key, value }) => ({ ...map, [key]: value }), {});

    return settings.map((setting) => {
      return {
        ...setting,
        // If a setting is not visible, set the value to HIDDEN_SETTING_VALUE so that it is not exposed in the cache
        // (meaning it also won't be exposed in the theme when rendering)
        value:
          setting.visibility && nql(setting.visibility).queryJSON(settingsMap) === false
            ? HIDDEN_SETTING_VALUE
            : setting.value,
      };
    });
  }
};
