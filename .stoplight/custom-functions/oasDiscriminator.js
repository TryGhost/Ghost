function isObject(value) {
  return value !== null && typeof value === 'object';
}

export const oasDiscriminator = (schema, _opts, { path }) => {
  /**
   * This function verifies:
   *
   * 1. The discriminator property name is defined at this schema.
   * 2. The discriminator property is in the required property list.
   */

  if (!isObject(schema)) return;

  if (typeof schema.discriminator !== 'string') return;

  const discriminatorName = schema.discriminator;

  const results = [];

  if (!isObject(schema.properties) || !Object.keys(schema.properties).some(k => k === discriminatorName)) {
    results.push({
      message: `The discriminator property must be defined in this schema.`,
      path: [...path, 'properties'],
    });
  }

  if (!Array.isArray(schema.required) || !schema.required.some(n => n === discriminatorName)) {
    results.push({
      message: `The discriminator property must be in the required property list.`,
      path: [...path, 'required'],
    });
  }

  return results;
};

export default oasDiscriminator;
