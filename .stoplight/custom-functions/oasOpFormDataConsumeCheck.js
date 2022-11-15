function isObject(value) {
  return value !== null && typeof value === 'object';
}

const validConsumeValue = /(application\/x-www-form-urlencoded|multipart\/form-data)/;

export const oasOpFormDataConsumeCheck = targetVal => {
  if (!isObject(targetVal)) return;

  const parameters = targetVal.parameters;
  const consumes = targetVal.consumes;

  if (!Array.isArray(parameters) || !Array.isArray(consumes)) {
    return;
  }

  if (parameters.some(p => isObject(p) && p.in === 'formData') && !validConsumeValue.test(consumes?.join(','))) {
    return [
      {
        message: 'Consumes must include urlencoded, multipart, or form-data media type when using formData parameter.',
      },
    ];
  }

  return;
};

export default oasOpFormDataConsumeCheck;
