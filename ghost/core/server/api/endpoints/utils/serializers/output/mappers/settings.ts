import _ from 'lodash';

module.exports = (attrs: object[] | Record<string, unknown>) => {
  if (Array.isArray(attrs)) {
    return attrs.map((setting) => {
      return _.pick(setting, ['key', 'value', 'is_read_only']);
    });
  }

  return attrs;
};
